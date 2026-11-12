/**
 * Shows the user which nodes the agent is talking about.
 *
 * The problem this solves: an agent reports "the padding on Button/Primary is
 * inconsistent" and the user has to find it by hand. Drawing a marker on the
 * canvas closes the gap between what the agent is reasoning about and what the
 * user is looking at.
 *
 * Two modes, because they trade against each other:
 *
 * - `overlay` draws a temporary rectangle. Non-destructive, and leaves the user's
 *   own selection untouched — which matters, because clobbering someone's
 *   selection while they work is genuinely disruptive.
 * - `select` sets the real selection. Better when the user wants to act on the
 *   node immediately, worse when the agent is narrating.
 *
 * Overlays are real nodes on the canvas, so they must be cleaned up in every
 * path that can leave one behind: expiry, replacement, page change, plugin close,
 * and a sweep at startup for any orphaned by a crash.
 */

/**
 * Name prefix marking a node as this plugin's own.
 *
 * Used both to find orphans at startup and to exclude overlays from selection
 * reports, so the agent never sees the plugin's own scaffolding as document
 * content and starts reasoning about it.
 */
const ARTIFACT_PREFIX = "[kiro-bridge-highlight]";

/** Whether a node name marks it as a highlight overlay. */
export function isHighlightArtifact(name: string): boolean {
  return name.startsWith(ARTIFACT_PREFIX);
}

export type HighlightMode = "overlay" | "select" | "off";

export interface HighlightOptions {
  readonly mode: HighlightMode;
  readonly durationMs: number;
  readonly scrollIntoView: boolean;
}

/** What actually happened, so the UI and the agent can be told precisely. */
export interface HighlightOutcome {
  readonly highlighted: readonly string[];
  /** Ids that resolved to nothing, or to a node that is not on the canvas. */
  readonly missing: readonly string[];
  /** Ids on a page other than the current one, which cannot be drawn on. */
  readonly offPage: readonly string[];
}

export class NodeHighlighter {
  private overlays: SceneNode[] = [];
  private expiry: ReturnType<typeof setTimeout> | null = null;
  private current: readonly string[] = [];

  /** Node ids currently indicated. */
  get highlighted(): readonly string[] {
    return this.current;
  }

  /**
   * Indicates `nodeIds` on the canvas.
   *
   * Resolves every id first and reports the ones it could not use, rather than
   * failing on the first bad id. An agent working from a stale node list should
   * still get the nodes that do exist highlighted.
   */
  async highlight(
    nodeIds: readonly string[],
    options: HighlightOptions,
  ): Promise<HighlightOutcome> {
    this.clear();

    if (options.mode === "off" || nodeIds.length === 0) {
      return { highlighted: [], missing: [], offPage: [] };
    }

    const found: SceneNode[] = [];
    const missing: string[] = [];
    const offPage: string[] = [];

    for (const id of nodeIds) {
      const node = await resolveSceneNode(id);
      if (node === null) {
        missing.push(id);
        continue;
      }
      if (!isOnCurrentPage(node)) {
        offPage.push(id);
        continue;
      }
      found.push(node);
    }

    if (found.length === 0) {
      return { highlighted: [], missing, offPage };
    }

    if (options.scrollIntoView) {
      try {
        figma.viewport.scrollAndZoomIntoView(found);
      } catch {
        // Throws for nodes with no bounding box. Not worth failing over.
      }
    }

    if (options.mode === "select") {
      figma.currentPage.selection = found;
    } else {
      this.drawOverlays(found);
      this.scheduleExpiry(options.durationMs);
    }

    this.current = found.map((node) => node.id);
    return { highlighted: this.current, missing, offPage };
  }

  /** Removes every overlay and cancels any pending expiry. */
  clear(): void {
    if (this.expiry !== null) {
      clearTimeout(this.expiry);
      this.expiry = null;
    }

    for (const overlay of this.overlays) {
      try {
        overlay.remove();
      } catch {
        // Already gone: the user deleted it, or the page was closed.
      }
    }

    this.overlays = [];
    this.current = [];
  }

  /**
   * Removes overlays left behind by a previous session.
   *
   * A plugin killed mid-highlight — Figma reloaded, the window closed
   * abruptly — never runs its cleanup, and the overlay is a real node that got
   * saved into the file. Without this sweep those accumulate silently and the
   * user finds junk layers in their document with no idea where they came from.
   */
  sweepOrphans(): number {
    let removed = 0;

    for (const node of figma.currentPage.children) {
      if (!isHighlightArtifact(node.name)) continue;
      try {
        node.remove();
        removed += 1;
      } catch {
        // Locked or already detached.
      }
    }

    return removed;
  }

  private drawOverlays(nodes: readonly SceneNode[]): void {
    for (const node of nodes) {
      const box = node.absoluteBoundingBox;
      if (box === null) continue;

      let overlay: RectangleNode;
      try {
        overlay = figma.createRectangle();
      } catch {
        // Read-only editor. Highlighting is a nicety; refusing to crash the
        // command that asked for it matters more.
        return;
      }

      overlay.name = `${ARTIFACT_PREFIX} ${node.name}`;
      // Bounding boxes are absolute and axis-aligned. A rotated node therefore
      // gets a box around its extent rather than a rotated outline — accepted,
      // because matching the rotation would mean reproducing the node's full
      // transform for a marker that lives for under two seconds.
      overlay.x = box.x;
      overlay.y = box.y;
      overlay.resize(Math.max(box.width, 1), Math.max(box.height, 1));

      overlay.fills = [];
      overlay.strokes = [
        { type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.98 }, opacity: 1 },
      ];
      overlay.strokeWeight = 2;
      overlay.strokeAlign = "OUTSIDE";
      overlay.dashPattern = [6, 4];
      overlay.cornerRadius = 2;
      // Locked so a click on the canvas selects the layer underneath rather than
      // the marker sitting on top of it.
      overlay.locked = true;

      figma.currentPage.appendChild(overlay);
      this.overlays.push(overlay);
    }
  }

  private scheduleExpiry(durationMs: number): void {
    if (durationMs <= 0) return;
    this.expiry = setTimeout(() => {
      this.expiry = null;
      this.clear();
    }, durationMs);
  }
}

/**
 * Resolves a node id to a `SceneNode`, or null.
 *
 * `getNodeByIdAsync` rather than the synchronous getter because
 * `documentAccess: "dynamic-page"` removes the latter. The type narrowing is
 * needed as well: the id could name a page or the document root, neither of
 * which can be highlighted.
 */
export async function resolveSceneNode(id: string): Promise<SceneNode | null> {
  let node: BaseNode | null;
  try {
    node = await figma.getNodeByIdAsync(id);
  } catch {
    return null;
  }

  if (node === null) return null;
  // Narrowing out the two node types that are not on the canvas leaves exactly
  // `SceneNode`, so no assertion is needed here.
  if (node.type === "DOCUMENT" || node.type === "PAGE") return null;
  if (node.removed) return null;

  return node;
}

/** Whether `node` sits on the page currently open. */
function isOnCurrentPage(node: SceneNode): boolean {
  let current: BaseNode | null = node;
  while (current !== null) {
    if (current.id === figma.currentPage.id) return true;
    current = current.parent;
  }
  return false;
}
