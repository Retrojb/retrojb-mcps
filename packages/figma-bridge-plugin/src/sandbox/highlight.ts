import type { HighlightMode } from "../shared/bridge-messages.js";

/**
 * Marks every node this plugin creates on the canvas.
 *
 * Used to sweep orphans: if Figma or the plugin dies mid-highlight, the overlay
 * survives in the user's document. Anything carrying this prefix is ours and
 * safe to delete on the next startup.
 */
const SENTINEL = "__retro-mcp-highlight__";

/** Stroke colour for the overlay, in Figma's 0-1 RGB space. */
const HIGHLIGHT_STROKE: RGB = { r: 0.04, g: 0.51, b: 1 };

const STROKE_WEIGHT = 2;
/** Breathing room so the outline reads as around the node, not on it. */
const PADDING = 2;

export interface HighlightOptions {
  readonly mode: HighlightMode;
  readonly durationMs: number;
  readonly scrollIntoView: boolean;
}

export interface HighlightOutcome {
  /** Nodes that were found and indicated. */
  readonly highlighted: readonly string[];
  /** Ids that no longer resolve to a node. */
  readonly missing: readonly string[];
  /**
   * Nodes that resolved but live on a page the user is not looking at.
   *
   * Reported rather than acted on: switching the user's page underneath them
   * because an agent touched something elsewhere is more disruptive than
   * telling them about it.
   */
  readonly offPage: readonly { id: string; name: string; page: string }[];
}

/**
 * Draws attention to nodes on the Figma canvas.
 *
 * Figma exposes no overlay or annotation layer to plugins, so there are only two
 * honest options, and this class implements both:
 *
 * - `overlay` — temporary stroked rectangles tracing each node's bounding box.
 *   Leaves the user's selection alone, which matters because the plugin is
 *   simultaneously *displaying* that selection. Costs a document mutation and an
 *   undo history entry.
 * - `select` — sets `figma.currentPage.selection`, borrowing Figma's own
 *   selection chrome. No document mutation, but it destroys whatever the user
 *   had selected.
 *
 * `overlay` is the default for that reason. Overlays are locked so they cannot
 * be dragged, and are removed on timeout, on the next highlight, on plugin
 * close, and swept at startup.
 */
export class NodeHighlighter {
  private options: HighlightOptions;
  private overlays: SceneNode[] = [];
  private timer: number | null = null;
  private currentIds: readonly string[] = [];
  private currentReason: string | null = null;
  private readonly onStateChange: (
    nodeIds: readonly string[],
    reason: string | null,
  ) => void;

  constructor(
    options: HighlightOptions,
    onStateChange: (nodeIds: readonly string[], reason: string | null) => void,
  ) {
    this.options = options;
    this.onStateChange = onStateChange;
  }

  setOptions(options: HighlightOptions): void {
    this.options = options;
    if (options.mode === "off") this.clear();
  }

  /** Ids currently indicated, for UI feedback. */
  get activeIds(): readonly string[] {
    return this.currentIds;
  }

  /**
   * Ids of the overlay nodes themselves.
   *
   * Callers use this to keep the plugin's own scaffolding out of what they
   * report — an overlay must not show up as a document change or a selection.
   */
  get overlayIds(): readonly string[] {
    return this.overlays.map((node) => node.id);
  }

  /**
   * Deletes any overlay left behind by a previous session.
   *
   * Runs before the first highlight. Without it a crash during a highlight
   * leaves a stray rectangle in the user's file with no way to know what it was.
   */
  async sweepOrphans(): Promise<number> {
    let removed = 0;

    // Only the current page: loading every page to sweep would be slow on large
    // files, and an orphan on a page the user is not on is harmless until they
    // visit it, at which point the next highlight sweeps it.
    for (const node of figma.currentPage.children) {
      if (node.name.startsWith(SENTINEL) && !this.overlays.includes(node)) {
        try {
          node.remove();
          removed += 1;
        } catch {
          // Already gone, or the page is read-only. Nothing useful to do.
        }
      }
    }

    return removed;
  }

  /**
   * Indicates the given nodes.
   *
   * Resolves ids concurrently and tolerates partial failure: an agent that
   * references five nodes where two have been deleted should still get the other
   * three highlighted, with the misses reported.
   */
  async highlight(
    nodeIds: readonly string[],
    reason: string,
  ): Promise<HighlightOutcome> {
    this.clear();

    if (this.options.mode === "off" || nodeIds.length === 0) {
      return { highlighted: [], missing: [], offPage: [] };
    }

    const resolved = await Promise.all(
      nodeIds.map(async (id) => {
        try {
          const node = await figma.getNodeByIdAsync(id);
          return { id, node };
        } catch {
          return { id, node: null };
        }
      }),
    );

    const missing: string[] = [];
    const offPage: { id: string; name: string; page: string }[] = [];
    const onPage: SceneNode[] = [];

    for (const { id, node } of resolved) {
      if (node === null || !isSceneNode(node)) {
        missing.push(id);
        continue;
      }

      const page = pageOf(node);
      if (page === null) {
        // Detached from the document tree — resolvable by id but not rendered.
        missing.push(id);
        continue;
      }

      if (page.id !== figma.currentPage.id) {
        offPage.push({ id, name: node.name, page: page.name });
        continue;
      }

      onPage.push(node);
    }

    if (onPage.length === 0) {
      this.publish([], reason);
      return { highlighted: [], missing, offPage };
    }

    if (this.options.mode === "select") {
      figma.currentPage.selection = onPage;
    } else {
      this.drawOverlays(onPage, reason);
    }

    if (this.options.scrollIntoView) {
      try {
        figma.viewport.scrollAndZoomIntoView(onPage);
      } catch {
        // Non-fatal: a zero-area or otherwise unviewable node just does not move
        // the viewport. The highlight itself already succeeded.
      }
    }

    const highlighted = onPage.map((node) => node.id);
    this.publish(highlighted, reason);
    this.scheduleClear();

    return { highlighted, missing, offPage };
  }

  /** Removes overlays and cancels the pending timeout. */
  clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    for (const overlay of this.overlays) {
      try {
        if (!overlay.removed) overlay.remove();
      } catch {
        // The user may have undone the overlay creation already.
      }
    }

    this.overlays = [];

    if (this.currentIds.length > 0) this.publish([], null);
  }

  private drawOverlays(nodes: readonly SceneNode[], reason: string): void {
    const created: SceneNode[] = [];

    for (const node of nodes) {
      const box = node.absoluteBoundingBox;
      // Null for nodes with no geometry, e.g. an empty group.
      if (box === null) continue;

      const outline = figma.createRectangle();
      // Truncated so a long reason cannot make the layer name unreadable.
      outline.name = `${SENTINEL}${reason.slice(0, 40)}`;

      // Appended to the page, so x/y are absolute page coordinates and match
      // absoluteBoundingBox directly. Nesting it under the target would put it
      // in the parent's coordinate space and inherit clipping and auto-layout.
      figma.currentPage.appendChild(outline);

      outline.x = box.x - PADDING;
      outline.y = box.y - PADDING;
      outline.resize(
        Math.max(1, box.width + PADDING * 2),
        Math.max(1, box.height + PADDING * 2),
      );

      outline.fills = [];
      outline.strokes = [{ type: "SOLID", color: HIGHLIGHT_STROKE }];
      outline.strokeWeight = STROKE_WEIGHT;
      outline.strokeAlign = "OUTSIDE";
      outline.cornerRadius = 2;
      outline.dashPattern = [6, 3];
      // Locked so it cannot be dragged or caught by a marquee selection.
      outline.locked = true;

      created.push(outline);
    }

    this.overlays = created;
  }

  private scheduleClear(): void {
    if (this.options.mode !== "overlay") return;
    if (this.options.durationMs <= 0) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      this.clear();
    }, this.options.durationMs);
  }

  private publish(nodeIds: readonly string[], reason: string | null): void {
    this.currentIds = nodeIds;
    this.currentReason = reason;
    this.onStateChange(nodeIds, this.currentReason);
  }
}

/** Whether a node can be placed on a page and given a bounding box. */
function isSceneNode(node: BaseNode): node is SceneNode {
  return node.type !== "DOCUMENT" && node.type !== "PAGE";
}

/** Walks ancestors to the owning page, or null if the node is detached. */
function pageOf(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;

  while (current !== null) {
    if (current.type === "PAGE") return current;
    current = current.parent;
  }

  return null;
}

/** Whether a layer name marks it as plugin scaffolding. */
export function isHighlightArtifact(name: string): boolean {
  return name.startsWith(SENTINEL);
}
