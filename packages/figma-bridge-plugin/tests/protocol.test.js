/**
 * Protocol and primitive verification.
 *
 * The guard functions here decide whether the plugin talks to a process at all,
 * so their edge cases are worth pinning: a false positive on `isHarnessHealth`
 * means dialling a WebSocket at an unrelated server.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { importFromSource } from "./helpers/bundle.mjs";

const protocol = await importFromSource("src/shared/protocol.ts");
const kit = await importFromSource("../plugin-kit/src/index.ts");

describe("port range", () => {
  it("covers 9223 to 9232 inclusive", () => {
    assert.equal(protocol.HARNESS_PORTS.length, 10);
    assert.equal(protocol.HARNESS_PORTS[0], 9223);
    assert.equal(protocol.HARNESS_PORTS.at(-1), 9232);
  });
});

describe("isHarnessHealth", () => {
  it("accepts the harness payload", () => {
    assert.equal(
      protocol.isHarnessHealth({ status: "ok", version: "1.0.0", clients: 0 }),
      true,
    );
  });

  it("accepts zero clients, which is falsy but valid", () => {
    // A `clients` truthiness check instead of an undefined check would reject a
    // running harness that simply has nothing connected yet.
    assert.equal(
      protocol.isHarnessHealth({ status: "ok", version: "1.0.0", clients: 0 }),
      true,
    );
  });

  it("rejects anything else on the port", () => {
    const rejected = [
      null,
      undefined,
      "ok",
      42,
      {},
      { status: "ok" },
      { status: "ok", version: "1.0.0" },
      { status: "error", version: "1.0.0", clients: 1 },
      { status: "ok", version: 1, clients: 1 },
      // Chrome's debugging endpoint, which also lives on 9223 in some setups.
      { Browser: "Chrome/120", webSocketDebuggerUrl: "ws://..." },
    ];

    for (const body of rejected) {
      assert.equal(
        protocol.isHarnessHealth(body),
        false,
        `should reject ${JSON.stringify(body)}`,
      );
    }
  });
});

describe("isHarnessCommand", () => {
  it("requires both a string id and a string method", () => {
    assert.equal(protocol.isHarnessCommand({ id: "a", method: "X" }), true);
    assert.equal(protocol.isHarnessCommand({ id: "a" }), false);
    assert.equal(protocol.isHarnessCommand({ method: "X" }), false);
    assert.equal(protocol.isHarnessCommand({ id: 1, method: "X" }), false);
    assert.equal(protocol.isHarnessCommand(null), false);
    // Events carry `type`, never `id`+`method`, so they must not be dispatched.
    assert.equal(protocol.isHarnessCommand({ type: "SERVER_HELLO" }), false);
  });
});

describe("isTerminalClose", () => {
  it("recognises the harness's deliberate displacements", () => {
    for (const reason of [
      "Replaced by new connection",
      "Replaced by same file reconnection",
      "Manual disconnect",
      "File identification timeout",
    ]) {
      assert.equal(protocol.isTerminalClose(1000, reason), true, reason);
    }
  });

  it("treats an abnormal drop as retryable", () => {
    assert.equal(protocol.isTerminalClose(1006, ""), false);
    assert.equal(protocol.isTerminalClose(1001, "going away"), false);
    // Same reason text but a non-normal code is not a deliberate displacement.
    assert.equal(
      protocol.isTerminalClose(1011, "Replaced by new connection"),
      false,
    );
  });
});

describe("Backoff", () => {
  it("grows geometrically and respects the ceiling", () => {
    const backoff = new kit.Backoff({
      initialMs: 100,
      factor: 2,
      maxMs: 800,
      jitter: 0,
    });

    assert.deepEqual(
      [
        backoff.nextDelay(),
        backoff.nextDelay(),
        backoff.nextDelay(),
        backoff.nextDelay(),
        backoff.nextDelay(),
      ],
      [100, 200, 400, 800, 800],
    );
  });

  it("resets after a success", () => {
    const backoff = new kit.Backoff({ initialMs: 100, jitter: 0 });
    backoff.nextDelay();
    backoff.nextDelay();
    assert.equal(backoff.attemptCount, 2);

    backoff.reset();
    assert.equal(backoff.attemptCount, 0);
    assert.equal(backoff.nextDelay(), 100);
  });

  it("keeps jittered delays inside the bounds", () => {
    const backoff = new kit.Backoff({
      initialMs: 100,
      maxMs: 1000,
      jitter: 1,
      random: () => 1,
    });

    for (let i = 0; i < 10; i += 1) {
      const delay = backoff.nextDelay();
      assert.ok(delay >= 100 && delay <= 1000, `${delay} out of bounds`);
    }
  });
});

describe("RequestRegistry", () => {
  it("resolves a registered request", async () => {
    const registry = new kit.RequestRegistry();
    const id = registry.nextId();
    const promise = registry.register(id, "test");

    assert.equal(registry.resolve(id, { ok: true }), true);
    assert.deepEqual(await promise, { ok: true });
    assert.equal(registry.size, 0);
  });

  it("rejects with the supplied reason", async () => {
    const registry = new kit.RequestRegistry();
    const id = registry.nextId();
    const promise = registry.register(id, "test");

    registry.reject(id, "it broke");
    await assert.rejects(() => promise, /it broke/);
  });

  it("times out with a message naming the request", async () => {
    const registry = new kit.RequestRegistry({ defaultTimeoutMs: 20 });
    const id = registry.nextId();

    await assert.rejects(
      () => registry.register(id, "slow thing"),
      /slow thing timed out after 20ms/,
    );
    assert.equal(registry.size, 0, "a timed-out entry must not leak");
  });

  it("reports an unknown id rather than throwing", () => {
    const registry = new kit.RequestRegistry();
    assert.equal(registry.resolve("nope", 1), false);
    assert.equal(registry.reject("nope", "x"), false);
  });

  it("fails everything pending when the channel dies", async () => {
    const registry = new kit.RequestRegistry();
    const a = registry.register(registry.nextId(), "a");
    const b = registry.register(registry.nextId(), "b");

    registry.rejectAll("socket closed");

    // Reporting the real cause matters: letting these time out individually
    // would blame Figma for a transport failure.
    await assert.rejects(() => a, /a: socket closed/);
    await assert.rejects(() => b, /b: socket closed/);
    assert.equal(registry.size, 0);
  });

  it("generates unique ids", () => {
    const registry = new kit.RequestRegistry();
    const ids = new Set(Array.from({ length: 500 }, () => registry.nextId()));
    assert.equal(ids.size, 500);
  });
});

describe("Diagnostics", () => {
  it("keeps the newest entries within capacity", () => {
    const diagnostics = new kit.Diagnostics({ capacity: 3 });
    for (let i = 1; i <= 5; i += 1) {
      diagnostics.info("test", `entry ${i}`);
    }

    const all = diagnostics.all();
    assert.equal(all.length, 3);
    assert.equal(all[0].message, "entry 3");
    assert.equal(all.at(-1).message, "entry 5");
  });

  it("filters by level", () => {
    const diagnostics = new kit.Diagnostics();
    diagnostics.debug("s", "d");
    diagnostics.info("s", "i");
    diagnostics.warn("s", "w");
    diagnostics.error("s", "e");

    assert.equal(diagnostics.atLeast("warn").length, 2);
    assert.equal(diagnostics.countAt("error"), 1);
  });

  it("reduces an Error detail to something cloneable", () => {
    const diagnostics = new kit.Diagnostics();
    diagnostics.error("s", "failed", new Error("boom"));

    const entry = diagnostics.all()[0];
    assert.deepEqual(entry.detail, { name: "Error", message: "boom" });
    // Must survive the postMessage hop it exists to cross.
    assert.doesNotThrow(() => structuredClone(entry));
  });

  it("keeps a cyclic detail usable", () => {
    const diagnostics = new kit.Diagnostics();
    const cyclic = {};
    cyclic.self = cyclic;

    diagnostics.warn("s", "cyclic", cyclic);
    assert.doesNotThrow(() => JSON.stringify(diagnostics.all()));
  });

  it("survives a throwing subscriber", () => {
    const diagnostics = new kit.Diagnostics();
    diagnostics.subscribe(() => {
      throw new Error("bad view");
    });

    // A broken view must not take down the transport that logged the entry.
    assert.doesNotThrow(() => diagnostics.info("s", "still works"));
    assert.equal(diagnostics.all().length, 1);
  });

  it("unsubscribes", () => {
    const diagnostics = new kit.Diagnostics();
    let calls = 0;
    const off = diagnostics.subscribe(() => {
      calls += 1;
    });

    diagnostics.info("s", "one");
    off();
    diagnostics.info("s", "two");

    assert.equal(calls, 1);
  });
});

describe("Poller", () => {
  it("uses the idle cadence until satisfied, then the steady one", async () => {
    let satisfied = false;
    const runs = [];

    const poller = new kit.Poller({
      idleIntervalMs: 20,
      steadyIntervalMs: 200,
      isSatisfied: () => satisfied,
      run: async () => {
        runs.push(Date.now());
        if (runs.length >= 3) satisfied = true;
      },
    });

    poller.start(true);
    await new Promise((resolve) => setTimeout(resolve, 150));
    poller.stop();

    // Three fast passes at 20ms, then it backs off to 200ms and stops running
    // within the window.
    assert.ok(runs.length >= 3, `expected at least 3 runs, got ${runs.length}`);
    assert.ok(
      runs.length <= 5,
      `expected backoff to slow it, got ${runs.length}`,
    );
  });

  it("keeps looping after a failing pass", async () => {
    let runs = 0;
    const errors = [];

    const poller = new kit.Poller({
      idleIntervalMs: 10,
      steadyIntervalMs: 10,
      isSatisfied: () => false,
      run: async () => {
        runs += 1;
        throw new Error("pass failed");
      },
      onError: (error) => errors.push(error),
    });

    poller.start(true);
    await new Promise((resolve) => setTimeout(resolve, 80));
    poller.stop();

    assert.ok(runs > 1, "a throwing pass must not kill the loop");
    assert.ok(errors.length > 0, "the failure should be reported");
  });

  it("runNow bypasses the wait", async () => {
    let runs = 0;
    const poller = new kit.Poller({
      idleIntervalMs: 10_000,
      steadyIntervalMs: 10_000,
      isSatisfied: () => false,
      run: async () => {
        runs += 1;
      },
    });

    poller.start(false);
    assert.equal(runs, 0, "start(false) should wait");

    await poller.runNow();
    assert.equal(runs, 1, "runNow is what the refresh button needs");

    poller.stop();
  });

  it("stops cleanly", async () => {
    let runs = 0;
    const poller = new kit.Poller({
      idleIntervalMs: 10,
      steadyIntervalMs: 10,
      isSatisfied: () => false,
      run: async () => {
        runs += 1;
      },
    });

    poller.start(true);
    await new Promise((resolve) => setTimeout(resolve, 40));
    poller.stop();

    const after = runs;
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(runs, after, "no passes after stop");
  });
});
