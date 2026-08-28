/**
 * Transport verification against a real harness socket.
 *
 * Node 24 ships global `WebSocket` and `fetch`, which are the only host APIs the
 * pool uses. That means the shipping transport code can be driven against a real
 * server here, rather than against a mock of the thing being tested.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { importFromSource } from "./helpers/bundle.mjs";
import { startMockHarness } from "../tools/mock-mcp-server.mjs";

const { HarnessPool } = await importFromSource("src/ui/harness-pool.ts");
const { Diagnostics } = await importFromSource("../plugin-kit/src/index.ts");

/** A port well outside the harness range, to prove range filtering works. */
const OUT_OF_RANGE_PORT = 9400;

function fileInfoFixture(overrides = {}) {
  return {
    fileName: "Test File",
    fileKey: "abc123",
    currentPage: "Page 1",
    currentPageId: "0:1",
    selectionCount: 0,
    pluginVersion: "0.1.0",
    editorType: "figma",
    ...overrides,
  };
}

/** Builds a pool wired to a recording executor. */
function makePool(overrides = {}) {
  const diagnostics = new Diagnostics({ capacity: 500 });
  const calls = [];

  const pool = new HarnessPool({
    diagnostics,
    execute: async (command) => {
      calls.push(command);
      if (command.method === "BOOM") throw new Error("handler exploded");
      return { echoed: command.method, params: command.params ?? {} };
    },
    fileInfo: async () => fileInfoFixture(),
    onChange: () => {},
    onUpdateAvailable: () => {},
    ...overrides,
  });

  return { pool, diagnostics, calls };
}

async function waitUntil(predicate, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Condition not met before timeout");
}

describe("discovery and connection", () => {
  let harness;

  before(async () => {
    harness = await startMockHarness({ port: 9223, quiet: true });
  });

  after(async () => {
    await harness.stop();
  });

  it("finds a harness, connects, and identifies the file", async () => {
    const { pool, diagnostics } = makePool();
    pool.start();

    try {
      const fileInfo = await harness.waitForType("FILE_INFO");

      assert.equal(fileInfo.data.fileKey, "abc123");
      assert.equal(fileInfo.data.fileName, "Test File");
      // The harness needs the version to decide whether to prompt for an update.
      assert.equal(fileInfo.data.pluginVersion, "0.1.0");

      await waitUntil(() => pool.connectedCount === 1);
      assert.equal(pool.status, "connected");
      assert.deepEqual(pool.connectedPorts(), [9223]);

      // SERVER_HELLO should have populated the connection record, which is what
      // the status panel renders.
      await waitUntil(() => pool.connections()[0]?.pid !== null);
      const connection = pool.connections()[0];
      assert.equal(connection.port, 9223);
      assert.equal(connection.status, "connected");
      assert.equal(connection.serverVersion, "mock-1.0.0");
      assert.equal(typeof connection.pid, "number");

      assert.ok(
        diagnostics.all().some((e) => e.message.includes("Connected")),
        "expected a connection diagnostic",
      );
    } finally {
      pool.pause();
    }
  });

  it("serves commands and returns results on the same socket", async () => {
    const { pool, calls } = makePool();
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 1);

      const result = await harness.command("GET_SELECTION", { scope: "page" });
      assert.deepEqual(result, {
        echoed: "GET_SELECTION",
        params: { scope: "page" },
      });

      assert.equal(calls.at(-1).method, "GET_SELECTION");
      await waitUntil(() => pool.connections()[0]?.commandCount >= 1);
    } finally {
      pool.pause();
    }
  });

  it("reports a handler failure as a protocol error rather than dropping it", async () => {
    const { pool, diagnostics } = makePool();
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 1);

      await assert.rejects(
        () => harness.command("BOOM"),
        /handler exploded/,
        "the harness should receive the error message",
      );

      assert.ok(
        diagnostics
          .atLeast("error")
          .some((e) => e.message.includes("handler exploded")),
        "the failure should be surfaced in the plugin's own log",
      );
    } finally {
      pool.pause();
    }
  });

  it("broadcasts events to the harness", async () => {
    const { pool } = makePool();
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 1);

      pool.broadcast({
        type: "SELECTION_CHANGE",
        data: {
          nodes: [{ id: "1:2", name: "Button", type: "COMPONENT" }],
          count: 1,
          page: "Page 1",
          timestamp: Date.now(),
        },
      });

      const frame = await harness.waitFor(
        (f) => f.type === "SELECTION_CHANGE" && f.data.count === 1,
      );
      assert.equal(frame.data.nodes[0].name, "Button");
    } finally {
      pool.pause();
    }
  });

  it("pause disconnects and stops discovery; refresh reconnects", async () => {
    const { pool } = makePool();
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 1);

      pool.pause();
      assert.equal(pool.isPaused, true);
      assert.equal(pool.status, "paused");
      await waitUntil(() => harness.connectionCount === 0);

      // Refresh is the button the user presses; it must clear the paused state
      // as well as redial.
      await pool.refresh();
      await waitUntil(() => pool.connectedCount === 1);
      assert.equal(pool.isPaused, false);
      assert.equal(pool.status, "connected");
    } finally {
      pool.pause();
    }
  });

  it("reconnects automatically after the harness drops the socket", async () => {
    const { pool } = makePool();
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 1);

      // Abrupt kill, not a graceful close: this is the harness-died case.
      harness.dropAll();
      await waitUntil(() => pool.connectedCount === 0);

      // Recovery comes from the same-port retry or the discovery loop; either is
      // acceptable, so this asserts the outcome rather than the mechanism.
      await waitUntil(() => pool.connectedCount === 1, 12_000);
      assert.equal(pool.status, "connected");
    } finally {
      pool.pause();
    }
  });

  it("does not redial when the harness closes with a terminal reason", async () => {
    const { pool } = makePool();
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 1);

      harness.closeAll(1000, "Replaced by new connection");
      await waitUntil(() => pool.connectedCount === 0);

      // A deliberate displacement must not trigger the retry path. Discovery
      // will still find the port later, so this only asserts that no immediate
      // redial happens.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      assert.equal(
        pool.connectedCount,
        0,
        "a terminal close should suppress the immediate retry",
      );
    } finally {
      pool.pause();
    }
  });
});

describe("discovery safety", () => {
  it("ignores a port serving a body that is not a harness", async () => {
    const impostor = await startMockHarness({
      port: 9224,
      quiet: true,
      brokenHealth: true,
    });

    const { pool, diagnostics } = makePool();
    pool.start();

    try {
      // Long enough for several discovery passes at the 3s idle cadence.
      await new Promise((resolve) => setTimeout(resolve, 4000));

      assert.equal(
        impostor.connectionCount,
        0,
        "should not open a socket to a non-harness process",
      );
      assert.ok(
        diagnostics.all().some((e) => e.message.includes("not a harness")),
        "should record why the port was skipped",
      );
    } finally {
      pool.pause();
      await impostor.stop();
    }
  });

  it("does not scan outside the documented port range", async () => {
    const outside = await startMockHarness({
      port: OUT_OF_RANGE_PORT,
      quiet: true,
    });

    const { pool } = makePool();
    pool.start();

    try {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      assert.equal(outside.connectionCount, 0);
    } finally {
      pool.pause();
      await outside.stop();
    }
  });
});

describe("multiple harness instances", () => {
  it("connects to every instance so each can reach Figma", async () => {
    const first = await startMockHarness({ port: 9225, quiet: true });
    const second = await startMockHarness({ port: 9226, quiet: true });

    const { pool } = makePool();
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 2, 10_000);
      assert.deepEqual(pool.connectedPorts(), [9225, 9226]);

      // Both must be able to drive commands independently.
      const [a, b] = await Promise.all([
        first.command("GET_FILE_INFO"),
        second.command("GET_SELECTION"),
      ]);
      assert.equal(a.echoed, "GET_FILE_INFO");
      assert.equal(b.echoed, "GET_SELECTION");

      // And both must see broadcast events.
      pool.broadcast({
        type: "PAGE_CHANGE",
        data: { pageId: "1:0", pageName: "Page 2", timestamp: Date.now() },
      });

      await Promise.all([
        first.waitForType("PAGE_CHANGE"),
        second.waitForType("PAGE_CHANGE"),
      ]);
    } finally {
      pool.pause();
      await first.stop();
      await second.stop();
    }
  });
});

describe("file identification", () => {
  it("warns when the file key is unavailable", async () => {
    const harness = await startMockHarness({ port: 9227, quiet: true });

    const { pool, diagnostics } = makePool({
      fileInfo: async () => fileInfoFixture({ fileKey: null }),
    });
    pool.start();

    try {
      await harness.waitForType("FILE_INFO");
      await waitUntil(() =>
        diagnostics
          .atLeast("warn")
          .some((e) => e.message.includes("File key unavailable")),
      );
    } finally {
      pool.pause();
      await harness.stop();
    }
  });

  it("still connects when file info cannot be read", async () => {
    const harness = await startMockHarness({ port: 9228, quiet: true });

    const { pool, diagnostics } = makePool({
      fileInfo: async () => null,
    });
    pool.start();

    try {
      await waitUntil(() => pool.connectedCount === 1);
      await waitUntil(() =>
        diagnostics
          .atLeast("warn")
          .some((e) => e.message.includes("Could not read file info")),
      );
    } finally {
      pool.pause();
      await harness.stop();
    }
  });
});
