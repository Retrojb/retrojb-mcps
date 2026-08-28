import type { SelectionNodeDetail } from "../shared/bridge-messages.js";
import type { SelectionInfo, SelectionNode } from "../shared/protocol.js";
import { isHighlightArtifact } from "./highlight.js";

/**
 * The selection as the harness expects it: identity and size only.
 *
 * Overlay artifacts are filtered out. In `select` highlight mode the plugin
 * writes to `figma.currentPage.selection` itself, and reporting that back as if
 * the user had chosen it would be a lie the harness then acts on.
 */
export function serializeSelectionForHarness(
  selection: readonly SceneNode[],
): SelectionInfo {
  const nodes: SelectionNode[] = selection
    .filter((node) => !isHighlightArtifact(node.name))
    .map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      ...(hasSize(node) ? { width: node.width, height: node.height } : {}),
    }));

  return {
    nodes,
    count: nodes.length,
    page: figma.currentPage.name,
    timestamp: Date.now(),
  };
}

/**
 * The selection as the plugin UI shows it.
 *
 * Deliberately richer than the harness payload: the UI is showing a person what
 * they have selected, so position, lock state, nesting path, and component
 * linkage all help them confirm the agent is talking about the right thing.
 *
 * Every property is read defensively. Figma's node types are a union where most
 * properties exist on only some members, and a mixed selection will otherwise
 * throw partway through serialisation.
 */
export async function describeSelection(
  selection: readonly SceneNode[],
): Promise<SelectionNodeDetail[]> {
  const visible = selection.filter((node) => !isHighlightArtifact(node.name));

  return Promise.all(visible.map((node) => describeNode(node)));
}

async function describeNode(node: SceneNode): Promise<SelectionNodeDetail> {
  const box = node.absoluteBoundingBox;

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    width: hasSize(node) ? round(node.width) : (box?.width ?? null),
    height: hasSize(node) ? round(node.height) : (box?.height ?? null),
    x: box === null ? null : round(box.x),
    y: box === null ? null : round(box.y),
    visible: node.visible,
    locked: node.locked,
    path: ancestorPath(node),
    mainComponent: await mainComponentKey(node),
    childCount: "children" in node ? node.children.length : null,
  };
}

/** Ancestor names from the page down to the immediate parent. */
function ancestorPath(node: SceneNode): string[] {
  const path: string[] = [];
  let current: BaseNode | null = node.parent;

  while (current !== null && current.type !== "DOCUMENT") {
    path.unshift(current.name);
    current = current.parent;
  }

  return path;
}

/**
 * The main component's key for an instance, or null.
 *
 * `getMainComponentAsync` reaches across to the library for a remote instance,
 * which can fail offline or without library access. A failure here must not sink
 * the whole selection report, so it degrades to null.
 */
async function mainComponentKey(node: SceneNode): Promise<string | null> {
  if (node.type !== "INSTANCE") return null;

  try {
    const main = await node.getMainComponentAsync();
    if (main === null) return null;
    return main.name;
  } catch {
    return null;
  }
}

/** Whether a node exposes concrete `width`/`height`. */
function hasSize(
  node: SceneNode,
): node is SceneNode & { width: number; height: number } {
  return "width" in node && "height" in node;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
