/**
 * Turns the canvas selection into a report the agent can reason about.
 *
 * Async because of `documentAccess: "dynamic-page"`. Under that mode the
 * synchronous `instance.mainComponent` getter throws, and the async
 * `getMainComponentAsync()` is the only way to resolve it. That single
 * requirement makes the whole function async, which is why callers await it even
 * for a report that otherwise looks like plain property reads.
 */

import { isHighlightArtifact } from "./highlight.js";
import type { SelectionInfo, SelectionNode } from "../shared/protocol.js";

/**
 * Nodes reported per selection.
 *
 * Selecting every layer on a busy page is one keystroke, and a report of ten
 * thousand nodes is neither useful to a language model nor cheap to build. The
 * count is always reported honestly so the agent can tell it was truncated.
 */
const MAX_REPORTED = 100;

/** Describes the current selection, excluding the plugin's own overlays. */
export async function describeSelection(
  selection: readonly SceneNode[],
): Promise<SelectionInfo> {
  const real = selection.filter((node) => !isHighlightArtifact(node.name));
  const reported = real.slice(0, MAX_REPORTED);

  const nodes: SelectionNode[] = [];
  for (const node of reported) {
    nodes.push(await describeNode(node));
  }

  return {
    nodes,
    // The true count, not `nodes.length`. An agent told "3 nodes" when 4000 are
    // selected would act on a false picture of the document.
    count: real.length,
    page: figma.currentPage.name,
    pageId: figma.currentPage.id,
    timestamp: Date.now(),
  };
}

async function describeNode(node: SceneNode): Promise<SelectionNode> {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    width: numberOrNull(node, "width"),
    height: numberOrNull(node, "height"),
    x: numberOrNull(node, "x"),
    y: numberOrNull(node, "y"),
    visible: node.visible,
    locked: node.locked,
    path: ancestorNames(node),
    mainComponentKey: await mainComponentKey(node),
    childCount: "children" in node ? node.children.length : null,
  };
}

/**
 * Reads a numeric geometry property, tolerating nodes that do not have it.
 *
 * Not every `SceneNode` carries `width`/`x` — a `SliceNode` and some vector
 * states do not — and Figma throws rather than returning undefined for a few of
 * them.
 */
function numberOrNull(
  node: SceneNode,
  key: "width" | "height" | "x" | "y",
): number | null {
  try {
    const value = (node as unknown as Record<string, unknown>)[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Ancestor names from the page down to the immediate parent.
 *
 * The agent gets a layer name like "Label", which on its own is ambiguous in a
 * file with forty of them. The path is what makes it locatable, and it is far
 * cheaper to build here than to have the agent walk the tree with follow-up
 * calls.
 */
function ancestorNames(node: SceneNode): string[] {
  const names: string[] = [];
  let current: BaseNode | null = node.parent;

  while (current !== null && current.type !== "DOCUMENT") {
    names.unshift(current.name);
    current = current.parent;
  }

  return names;
}

async function mainComponentKey(node: SceneNode): Promise<string | null> {
  if (node.type !== "INSTANCE") return null;

  try {
    const main = await node.getMainComponentAsync();
    return main?.key ?? null;
  } catch {
    // A missing or unloadable library component. Worth reporting as absent
    // rather than failing the selection report the user is watching.
    return null;
  }
}
