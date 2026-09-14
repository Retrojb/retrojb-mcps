/**
 * Sandbox verification against a fake Figma API.
 *
 * The highlighter mutates the user's document, so its cleanup guarantees are the
 * part most worth proving: a leaked overlay is a stray locked rectangle in
 * someone's file with nothing running to explain it.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { importFromSource } from "./helpers/bundle.mjs";
import { installFakeFigma, makeNode, makePage } from "./helpers/fake-figma.mjs";

const { NodeHighlighter, isHighlightArtifact } = await importFromSource(
  "src/sandbox/highlight.ts",
);
const { toSerializable } = await importFromSource("src/sandbox/serialize.ts");
const { serializeSelectionForHarness, describeSelection } =
  await importFromSource("src/sandbox/selection.ts");

const OPTIONS = {
  mode: "overlay",
  durationMs: 50,
  scrollIntoView: true,
};

describe("NodeHighlighter — overlay mode", () => {
  let env;
  let states;
  let highlighter;

  beforeEach(() => {
    env = installFakeFigma();
    states = [];
    highlighter = new NodeHighlighter(OPTIONS, (nodeIds, reason) => {
      states.push({ nodeIds: [...nodeIds], reason });
    });
  });

  afterEach(() => {
    env.restore();
  });

  it("traces the node's absolute bounding box, padded and page-parented", async () => {
    const target = makeNode({
      parent: env.pages[0],
      name: "Card",
      x: 120,
      y: 240,
      width: 300,
      height: 180,
    });

    const outcome = await highlighter.highlight([target.id], "test");

    assert.deepEqual(outcome.highlighted, [target.id]);
    assert.deepEqual(outcome.missing, []);
    assert.deepEqual(outcome.offPage, []);

    assert.equal(env.created.length, 1);
    const overlay = env.created[0];

    // Parented to the page so x/y are absolute and match the bounding box.
    assert.equal(overlay.parent, env.pages[0]);
    assert.equal(overlay.x, 118, "inset by the 2px padding");
    assert.equal(overlay.y, 238);
    assert.equal(overlay.width, 304, "padded on both sides");
    assert.equal(overlay.height, 184);

    // Stroke only: a filled overlay would hide the node it is pointing at.
    assert.deepEqual(overlay.fills, []);
    assert.equal(overlay.strokes.length, 1);
    assert.equal(overlay.strokeAlign, "OUTSIDE");

    // Locked so it cannot be dragged or marquee-selected.
    assert.equal(overlay.locked, true);

    assert.ok(
      isHighlightArtifact(overlay.name),
      "must carry the sentinel so it can be swept later",
    );
  });

  it("leaves the user's selection untouched", async () => {
    const userPick = makeNode({ parent: env.pages[0], name: "User choice" });
    const target = makeNode({ parent: env.pages[0], name: "Agent target" });

    env.pages[0].selection = [userPick];
    await highlighter.highlight([target.id], "test");

    assert.deepEqual(
      env.pages[0].selection,
      [userPick],
      "overlay mode must not clobber the selection the UI is displaying",
    );
  });

  it("removes the overlay when the duration elapses", async () => {
    const target = makeNode({ parent: env.pages[0] });
    await highlighter.highlight([target.id], "test");

    assert.equal(env.pages[0].children.includes(env.created[0]), true);

    await new Promise((resolve) => setTimeout(resolve, 120));

    assert.equal(
      env.created[0].removed,
      true,
      "the overlay should be gone after the timeout",
    );
    assert.equal(env.pages[0].children.includes(env.created[0]), false);
    assert.deepEqual(states.at(-1), { nodeIds: [], reason: null });
  });

  it("replaces a previous highlight rather than stacking overlays", async () => {
    const first = makeNode({ parent: env.pages[0], name: "First" });
    const second = makeNode({ parent: env.pages[0], name: "Second" });

    await highlighter.highlight([first.id], "first");
    await highlighter.highlight([second.id], "second");

    const live = env.pages[0].children.filter((node) =>
      isHighlightArtifact(node.name),
    );
    assert.equal(live.length, 1, "only the current highlight should remain");
    assert.deepEqual(highlighter.activeIds, [second.id]);
  });

  it("clear() removes everything and reports empty state", async () => {
    const target = makeNode({ parent: env.pages[0] });
    await highlighter.highlight([target.id], "test");

    highlighter.clear();

    assert.equal(env.created[0].removed, true);
    assert.deepEqual(highlighter.activeIds, []);
    assert.deepEqual(states.at(-1), { nodeIds: [], reason: null });
  });

  it("sweeps overlays orphaned by a previous session", async () => {
    // A leftover from a crashed session: sentinel-named, still on the page.
    const orphan = makeNode({
      parent: env.pages[0],
      name: "__retro-mcp-highlight__stale",
    });
    const userNode = makeNode({ parent: env.pages[0], name: "Real content" });

    const removed = await highlighter.sweepOrphans();

    assert.equal(removed, 1);
    assert.equal(orphan.removed, true);
    assert.equal(
      userNode.removed,
      false,
      "must not touch anything without the sentinel",
    );
  });

  it("reports missing ids without failing the rest", async () => {
    const present = makeNode({ parent: env.pages[0], name: "Here" });

    const outcome = await highlighter.highlight(
      [present.id, "999:999"],
      "partial",
    );

    assert.deepEqual(outcome.highlighted, [present.id]);
    assert.deepEqual(outcome.missing, ["999:999"]);
    assert.equal(env.created.length, 1);
  });

  it("reports nodes on another page instead of switching the user's page", async () => {
    const other = makePage("Page 2");
    env.restore();
    env = installFakeFigma({ pages: [makePage("Page 1"), other] });
    highlighter = new NodeHighlighter(OPTIONS, () => {});

    const elsewhere = makeNode({ parent: other, name: "Off-page node" });
    env.register(elsewhere);

    const outcome = await highlighter.highlight([elsewhere.id], "test");

    assert.deepEqual(outcome.highlighted, []);
    assert.equal(outcome.offPage.length, 1);
    assert.equal(outcome.offPage[0].page, "Page 2");
    assert.equal(
      env.figma.currentPage.name,
      "Page 1",
      "must not move the user to another page",
    );
    assert.equal(env.created.length, 0);
  });

  it("skips nodes with no geometry", async () => {
    const empty = makeNode({
      parent: env.pages[0],
      name: "Empty group",
      absoluteBoundingBox: null,
    });

    const outcome = await highlighter.highlight([empty.id], "test");

    assert.equal(env.created.length, 0, "nothing to trace");
    assert.deepEqual(outcome.highlighted, [empty.id]);
  });

  it("scrolls the target into view when enabled", async () => {
    const target = makeNode({ parent: env.pages[0] });
    await highlighter.highlight([target.id], "test");

    assert.deepEqual(env.scrolled.at(-1), [target.id]);
  });

  it("does not scroll when disabled", async () => {
    highlighter.setOptions({ ...OPTIONS, scrollIntoView: false });
    const target = makeNode({ parent: env.pages[0] });

    await highlighter.highlight([target.id], "test");

    assert.equal(env.scrolled.length, 0);
  });
});

describe("NodeHighlighter — select and off modes", () => {
  let env;

  beforeEach(() => {
    env = installFakeFigma();
  });

  afterEach(() => {
    env.restore();
  });

  it("select mode sets the selection and creates no nodes", async () => {
    const highlighter = new NodeHighlighter(
      { ...OPTIONS, mode: "select" },
      () => {},
    );
    const target = makeNode({ parent: env.pages[0], name: "Target" });

    await highlighter.highlight([target.id], "test");

    assert.deepEqual(env.pages[0].selection, [target]);
    assert.equal(
      env.created.length,
      0,
      "select mode must not mutate the document",
    );
  });

  it("off mode does nothing at all", async () => {
    const highlighter = new NodeHighlighter(
      { ...OPTIONS, mode: "off" },
      () => {},
    );
    const target = makeNode({ parent: env.pages[0] });

    const outcome = await highlighter.highlight([target.id], "test");

    assert.deepEqual(outcome.highlighted, []);
    assert.equal(env.created.length, 0);
    assert.equal(env.scrolled.length, 0);
    assert.deepEqual(env.pages[0].selection, []);
  });

  it("switching to off clears an existing overlay", async () => {
    const highlighter = new NodeHighlighter({ ...OPTIONS }, () => {});
    const target = makeNode({ parent: env.pages[0] });

    await highlighter.highlight([target.id], "test");
    assert.equal(env.created.length, 1);

    highlighter.setOptions({ ...OPTIONS, mode: "off" });
    assert.equal(env.created[0].removed, true);
  });
});

describe("selection reporting", () => {
  let env;

  beforeEach(() => {
    env = installFakeFigma();
  });

  afterEach(() => {
    env.restore();
  });

  it("excludes the plugin's own overlays", () => {
    const real = makeNode({ parent: env.pages[0], name: "Button" });
    const overlay = makeNode({
      parent: env.pages[0],
      name: "__retro-mcp-highlight__x",
    });

    const info = serializeSelectionForHarness([real, overlay]);

    assert.equal(info.count, 1);
    assert.equal(info.nodes[0].name, "Button");
    assert.equal(info.page, "Page 1");
  });

  it("describes nodes with the detail the UI renders", async () => {
    const parent = makeNode({
      parent: env.pages[0],
      name: "Group",
      type: "GROUP",
      children: [],
    });
    const child = makeNode({
      parent,
      name: "Label",
      type: "TEXT",
      x: 12,
      y: 34,
      width: 80,
      height: 20,
      locked: true,
    });

    const [detail] = await describeSelection([child]);

    assert.equal(detail.name, "Label");
    assert.equal(detail.type, "TEXT");
    assert.equal(detail.width, 80);
    assert.equal(detail.x, 12);
    assert.equal(detail.locked, true);
    // Page down to immediate parent, which is what orients the user.
    assert.deepEqual(detail.path, ["Page 1", "Group"]);
  });

  it("survives a node whose main component cannot be resolved", async () => {
    const instance = makeNode({
      parent: env.pages[0],
      name: "Broken instance",
      type: "INSTANCE",
    });
    instance.getMainComponentAsync = async () => {
      throw new Error("library unavailable");
    };

    const [detail] = await describeSelection([instance]);

    assert.equal(
      detail.mainComponent,
      null,
      "a library failure must not sink the whole report",
    );
    assert.equal(detail.name, "Broken instance");
  });
});

describe("result serialisation", () => {
  it("summarises Figma nodes instead of cloning them", () => {
    const env = installFakeFigma();
    try {
      const node = makeNode({
        parent: env.pages[0],
        name: "Frame",
        type: "FRAME",
      });
      const out = toSerializable(node);

      assert.equal(out.__type, "FigmaNode");
      assert.equal(out.name, "Frame");
      assert.equal(out.type, "FRAME");
      // The point of summarising: no parent chain, so no cycle and no bulk.
      assert.equal(out.parent, undefined);
    } finally {
      env.restore();
    }
  });

  it("breaks cycles rather than overflowing", () => {
    const a = { name: "a" };
    a.self = a;

    const out = toSerializable(a);
    assert.equal(out.self, "[Circular]");
  });

  it("reduces errors, functions, and non-finite numbers", () => {
    const out = toSerializable({
      err: new Error("nope"),
      fn: function named() {},
      nan: Number.NaN,
      inf: Number.POSITIVE_INFINITY,
      big: 10n,
    });

    assert.equal(out.err.__type, "Error");
    assert.equal(out.err.message, "nope");
    assert.equal(out.fn, undefined, "functions are dropped from objects");
    assert.equal(out.nan, "NaN");
    assert.equal(out.inf, "Infinity");
    assert.equal(out.big, "10");
  });

  it("survives a throwing getter", () => {
    const hostile = {
      get boom() {
        throw new Error("inaccessible");
      },
      safe: 1,
    };

    const out = toSerializable(hostile);
    assert.match(out.boom, /Unreadable/);
    assert.equal(out.safe, 1);
  });

  it("truncates long arrays", () => {
    const out = toSerializable(Array.from({ length: 500 }, (_, i) => i));
    assert.equal(out.length, 201);
    assert.match(out.at(-1), /truncated/);
  });

  it("produces output that actually survives JSON", () => {
    const env = installFakeFigma();
    try {
      const node = makeNode({ parent: env.pages[0] });
      // The real constraint: whatever comes out has to cross postMessage and
      // then a WebSocket. If it cannot be stringified, it cannot ship.
      assert.doesNotThrow(() => JSON.stringify(toSerializable(node)));
      assert.doesNotThrow(() => {
        const cyclic = {};
        cyclic.me = cyclic;
        JSON.stringify(toSerializable(cyclic));
      });
    } finally {
      env.restore();
    }
  });
});
