/**
 * Change monitoring, and the dynamic-page rule that broke it.
 *
 * The plugin originally registered `figma.on("documentchange")` at module top
 * level. Under `documentAccess: "dynamic-page"` that throws unless
 * `figma.loadAllPagesAsync()` has already completed, so the plugin failed at load
 * with:
 *
 *   Cannot register documentchange handler in incremental mode without calling
 *   figma.loadAllPagesAsync first.
 *
 * The fake Figma API used here enforces that rule, so the regression is caught in
 * Node rather than only in Figma.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { importTogether } from "./helpers/bundle.mjs";
import { installFakeFigma, makeNode, makePage } from "./helpers/fake-figma.mjs";

/*
 * Bundled together on purpose. `page-loading.ts` memoises the full-document load
 * in module state, and both the monitor and the command registry consume it.
 * Importing them separately would give each its own copy, so the reset below
 * would not actually isolate anything.
 */
const { ChangeMonitor, createCommandRegistry, resetPageLoadingForTests } =
  await importTogether([
    "src/sandbox/change-monitor.ts",
    "src/sandbox/commands.ts",
    "src/sandbox/page-loading.ts",
  ]);

function collector() {
  const payloads = [];
  const reports = [];
  return {
    payloads,
    reports,
    emit: (payload) => payloads.push(payload),
    report: (level, scope, message, detail) =>
      reports.push({ level, scope, message, detail }),
  };
}

describe("the dynamic-page constraint", () => {
  let env;

  beforeEach(() => {
    resetPageLoadingForTests();
    env = installFakeFigma();
  });

  afterEach(() => {
    env.restore();
  });

  it("registering documentchange without loading all pages throws", () => {
    // Guards the fake itself: if this stops throwing, every test below is
    // vacuously passing and the regression could return unnoticed.
    assert.throws(
      () => env.figma.on("documentchange", () => {}),
      /without calling figma\.loadAllPagesAsync first/,
    );
  });

  it("current-page mode never triggers a full-document load", async () => {
    const sink = collector();
    const monitor = new ChangeMonitor({
      isOverlayId: () => false,
      emit: sink.emit,
      report: sink.report,
    });

    await monitor.enable("current-page");

    assert.equal(
      env.loadAllPagesCalls,
      0,
      "the default path must not load the whole document",
    );
    assert.equal(env.allPagesLoaded, false);
    assert.equal(monitor.activeMode, "current-page");

    // nodechange on the page, stylechange globally.
    assert.equal(env.pages[0].listenerCount("nodechange"), 1);
    assert.equal(env.listenerCount("stylechange"), 1);
    assert.equal(env.listenerCount("documentchange"), 0);
  });

  it("full-document mode loads first, then subscribes", async () => {
    const sink = collector();
    const monitor = new ChangeMonitor({
      isOverlayId: () => false,
      emit: sink.emit,
      report: sink.report,
    });

    await monitor.enable("full-document");

    assert.equal(env.loadAllPagesCalls, 1);
    assert.equal(env.allPagesLoaded, true);
    assert.equal(monitor.activeMode, "full-document");
    assert.equal(env.listenerCount("documentchange"), 1);
    // The page-scoped subscription is redundant in this mode.
    assert.equal(env.pages[0].listenerCount("nodechange"), 0);
  });

  it("falls back to current-page when the full load fails", async () => {
    env.restore();
    resetPageLoadingForTests();
    env = installFakeFigma({ failLoadAllPages: true });

    const sink = collector();
    const monitor = new ChangeMonitor({
      isOverlayId: () => false,
      emit: sink.emit,
      report: sink.report,
    });

    await monitor.enable("full-document");

    // A file too large to load should still get monitoring, not none.
    assert.equal(monitor.activeMode, "current-page");
    assert.equal(env.pages[0].listenerCount("nodechange"), 1);
    assert.ok(
      sink.reports.some(
        (r) => r.level === "warn" && r.message.includes("falling back"),
      ),
      "the downgrade must be reported, not silent",
    );
  });
});

describe("current-page monitoring", () => {
  let env;
  let sink;
  let monitor;

  beforeEach(async () => {
    resetPageLoadingForTests();
    env = installFakeFigma();
    sink = collector();
    monitor = new ChangeMonitor({
      isOverlayId: (id) => id === "overlay:1",
      emit: sink.emit,
      report: sink.report,
    });
    await monitor.enable("current-page");
  });

  afterEach(() => {
    monitor.disable();
    env.restore();
  });

  it("reports node changes on the current page", () => {
    env.pages[0].emit("nodechange", {
      nodeChanges: [
        { type: "PROPERTY_CHANGE", id: "1:1", origin: "LOCAL" },
        { type: "CREATE", id: "1:2", origin: "LOCAL" },
      ],
    });

    assert.equal(sink.payloads.length, 1);
    const payload = sink.payloads[0];
    assert.equal(payload.hasNodeChanges, true);
    assert.equal(payload.hasStyleChanges, false);
    assert.deepEqual(payload.changedNodeIds, ["1:1", "1:2"]);
    assert.equal(payload.changeCount, 2);
  });

  it("reports style changes", () => {
    env.emit("stylechange", {
      styleChanges: [{ type: "STYLE_PROPERTY_CHANGE", id: "S:1" }],
    });

    assert.equal(sink.payloads.length, 1);
    assert.equal(sink.payloads[0].hasStyleChanges, true);
    assert.equal(sink.payloads[0].hasNodeChanges, false);
  });

  it("excludes the plugin's own highlight overlays", () => {
    env.pages[0].emit("nodechange", {
      nodeChanges: [{ type: "CREATE", id: "overlay:1", origin: "LOCAL" }],
    });

    // Highlights fire in response to harness commands, so reporting them would
    // be a feedback loop: command -> highlight -> "document changed" -> command.
    assert.equal(
      sink.payloads.length,
      0,
      "an overlay-only change must produce no event",
    );
  });

  it("still reports real changes alongside an overlay change", () => {
    env.pages[0].emit("nodechange", {
      nodeChanges: [
        { type: "CREATE", id: "overlay:1", origin: "LOCAL" },
        { type: "PROPERTY_CHANGE", id: "1:5", origin: "LOCAL" },
      ],
    });

    assert.equal(sink.payloads.length, 1);
    assert.deepEqual(sink.payloads[0].changedNodeIds, ["1:5"]);
  });

  it("follows the user to a new page", () => {
    const second = makePage("Page 2");
    env.pages.push(second);
    second.parent = env.figma.root;

    env.setCurrentPage(second);
    monitor.retarget();

    // The old subscription must be released and a new one attached, or
    // monitoring goes quiet without reporting a problem.
    assert.equal(env.pages[0].listenerCount("nodechange"), 0);
    assert.equal(second.listenerCount("nodechange"), 1);

    second.emit("nodechange", {
      nodeChanges: [{ type: "CREATE", id: "2:1", origin: "LOCAL" }],
    });
    assert.deepEqual(sink.payloads.at(-1).changedNodeIds, ["2:1"]);
  });

  it("retarget is a no-op when the page has not changed", () => {
    monitor.retarget();
    assert.equal(
      env.pages[0].listenerCount("nodechange"),
      1,
      "must not stack duplicate subscriptions",
    );
  });

  it("disable removes every subscription", () => {
    monitor.disable();

    assert.equal(env.pages[0].listenerCount("nodechange"), 0);
    assert.equal(env.listenerCount("stylechange"), 0);
    assert.equal(monitor.activeMode, null);
  });

  it("enable twice does not double-subscribe", async () => {
    await monitor.enable("current-page");

    assert.equal(env.pages[0].listenerCount("nodechange"), 1);
    assert.equal(env.listenerCount("stylechange"), 1);
  });
});

describe("full-document monitoring", () => {
  let env;
  let sink;
  let monitor;

  beforeEach(async () => {
    resetPageLoadingForTests();
    env = installFakeFigma();
    sink = collector();
    monitor = new ChangeMonitor({
      isOverlayId: (id) => id === "overlay:1",
      emit: sink.emit,
      report: sink.report,
    });
    await monitor.enable("full-document");
  });

  afterEach(() => {
    monitor.disable();
    env.restore();
  });

  it("separates node and style changes from one event", () => {
    env.emit("documentchange", {
      documentChanges: [
        { type: "CREATE", id: "1:1", origin: "LOCAL" },
        { type: "STYLE_CREATE", id: "S:1", origin: "LOCAL" },
      ],
    });

    const payload = sink.payloads[0];
    assert.equal(payload.hasNodeChanges, true);
    assert.equal(payload.hasStyleChanges, true);
    assert.deepEqual(payload.changedNodeIds, ["1:1"]);
  });

  it("excludes overlays here too", () => {
    env.emit("documentchange", {
      documentChanges: [{ type: "CREATE", id: "overlay:1", origin: "LOCAL" }],
    });

    assert.equal(sink.payloads.length, 0);
  });

  it("switching back to current-page releases documentchange", async () => {
    await monitor.enable("current-page");

    assert.equal(env.listenerCount("documentchange"), 0);
    assert.equal(env.pages[0].listenerCount("nodechange"), 1);
    assert.equal(monitor.activeMode, "current-page");
  });
});

describe("plugin startup", () => {
  let env;

  beforeEach(() => {
    resetPageLoadingForTests();
    env = installFakeFigma();
    globalThis.__html__ = "<html></html>";
  });

  afterEach(() => {
    env.restore();
    delete globalThis.__html__;
  });

  it("boots without tripping the dynamic-page rule", async () => {
    /*
     * The actual regression test. The shipped plugin registered
     * `figma.on("documentchange")` at module top level, which threw during
     * evaluation under documentAccess: dynamic-page and took the whole plugin
     * down before it could show its window.
     *
     * The fake enforces that rule, so importing the real entry point here fails
     * if the registration ever moves back to the top level.
     */
    const failures = [];
    const onRejection = (error) => failures.push(error);
    process.on("unhandledRejection", onRejection);

    try {
      const { importTogether: fresh } = await import("./helpers/bundle.mjs");
      await fresh(["src/sandbox/main.ts"]);

      // start() is async; give it a few turns to finish its awaits.
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.deepEqual(
        failures.map((error) => error.message),
        [],
        "startup must not throw or reject",
      );

      // Proves it actually got through startup rather than failing silently:
      // monitoring is live, and it did not pay for a full-document load.
      assert.equal(env.pages[0].listenerCount("nodechange"), 1);
      assert.equal(env.listenerCount("stylechange"), 1);
      assert.equal(env.listenerCount("documentchange"), 0);
      assert.equal(
        env.loadAllPagesCalls,
        0,
        "startup must not load the whole document",
      );

      // And it told the UI it was ready.
      const kinds = env.figma.ui.messages.map((message) => message.kind);
      assert.ok(kinds.includes("READY"), `no READY message, got ${kinds}`);
      assert.ok(kinds.includes("SELECTION"));
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });
});

describe("commands that need a full load", () => {
  let env;

  beforeEach(() => {
    resetPageLoadingForTests();
    env = installFakeFigma();
  });

  afterEach(() => {
    env.restore();
  });

  it("GET_LOCAL_COMPONENTS loads all pages before searching", async () => {
    makeNode({
      parent: env.pages[0],
      name: "Button",
      type: "COMPONENT",
    });

    const commands = createCommandRegistry({
      highlighter: { highlight: async () => ({}), clear: () => {} },
      isCodeExecutionEnabled: () => true,
      noteReferencedNodes: () => {},
    });

    // figma.root.findAllWithCriteria throws without the load, so this asserts
    // the handler pays that cost rather than crashing.
    const result = await commands.get("GET_LOCAL_COMPONENTS")({});

    assert.equal(env.allPagesLoaded, true);
    assert.equal(result.components.length, 1);
    assert.equal(result.components[0].name, "Button");
  });

  it("loads at most once across repeated calls", async () => {
    const commands = createCommandRegistry({
      highlighter: { highlight: async () => ({}), clear: () => {} },
      isCodeExecutionEnabled: () => true,
      noteReferencedNodes: () => {},
    });

    const handler = commands.get("GET_LOCAL_COMPONENTS");
    await handler({});
    await handler({});
    await handler({});

    // Memoised: the load is expensive enough that repeating it would be felt.
    assert.equal(env.loadAllPagesCalls, 1);
  });
});
