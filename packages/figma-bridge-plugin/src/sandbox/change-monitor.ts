import type { DiagnosticLevel } from "@retrojb/plugin-kit";
import { ensureAllPagesLoaded } from "./page-loading.js";

/** What the harness receives as a `DOCUMENT_CHANGE` event. */
export interface DocumentChangePayload {
  readonly hasStyleChanges: boolean;
  readonly hasNodeChanges: boolean;
  readonly changedNodeIds: readonly string[];
  readonly changeCount: number;
  readonly timestamp: number;
}

/**
 * How much of the document to watch.
 *
 * - `current-page` — `nodechange` on the current page plus global `stylechange`.
 *   No full-document load, so it is instant on any file size. Edits the user
 *   makes on *other* pages are not reported.
 * - `full-document` — `documentchange` across every page. Complete, but requires
 *   loading the whole document first.
 */
export type MonitorMode = "current-page" | "full-document";

export interface ChangeMonitorOptions {
  /** Identifies the plugin's own highlight overlays so they can be excluded. */
  readonly isOverlayId: (id: string) => boolean;
  readonly emit: (payload: DocumentChangePayload) => void;
  readonly report: (
    level: DiagnosticLevel,
    scope: string,
    message: string,
    detail?: unknown,
  ) => void;
}

/**
 * Watches the document and reports changes to the harness.
 *
 * Two strategies, because Figma's cheap path and its complete path are different
 * APIs with different costs.
 *
 * `documentchange` is the obvious choice and the one the harness's own bridge
 * uses, but under `documentAccess: "dynamic-page"` it throws unless
 * `figma.loadAllPagesAsync()` has run first — and Figma explicitly recommends
 * the granular `nodechange`/`stylechange` events instead, precisely to avoid
 * that load. So `current-page` is the default and `full-document` is opt-in.
 *
 * The subtlety worth knowing: `nodechange` is bound to a specific `PageNode`, so
 * switching pages silently stops the events unless the subscription is moved.
 * {@link retarget} exists for that, and skipping it would leave monitoring
 * looking healthy while reporting nothing.
 */
export class ChangeMonitor {
  private readonly options: ChangeMonitorOptions;

  private mode: MonitorMode | null = null;
  private watchedPage: PageNode | null = null;
  private nodeHandler: ((event: NodeChangeEvent) => void) | null = null;
  private styleHandler: ((event: StyleChangeEvent) => void) | null = null;
  private documentHandler: ((event: DocumentChangeEvent) => void) | null = null;

  constructor(options: ChangeMonitorOptions) {
    this.options = options;
  }

  /** The strategy currently in effect, or null when monitoring is off. */
  get activeMode(): MonitorMode | null {
    return this.mode;
  }

  /**
   * Starts monitoring, replacing any existing subscription.
   *
   * Falls back to `current-page` if `full-document` cannot be established, so a
   * file too large to load fully still gets monitoring rather than none.
   */
  async enable(mode: MonitorMode): Promise<void> {
    this.disable();

    if (mode === "full-document") {
      try {
        await ensureAllPagesLoaded();
        this.attachDocumentChange();
        this.mode = "full-document";
        this.options.report(
          "info",
          "changes",
          "Watching every page (full document loaded)",
        );
        return;
      } catch (error) {
        this.options.report(
          "warn",
          "changes",
          `Could not load all pages; falling back to current-page monitoring: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.attachCurrentPage();
    this.mode = "current-page";
    this.options.report(
      "info",
      "changes",
      `Watching "${figma.currentPage.name}" and style changes`,
    );
  }

  /**
   * Re-points a `current-page` subscription at the page now in focus.
   *
   * No-op in `full-document` mode, where the subscription is not page-bound.
   */
  retarget(): void {
    if (this.mode !== "current-page") return;
    if (this.watchedPage === figma.currentPage) return;

    this.detachCurrentPage();
    this.attachCurrentPage();
    this.options.report(
      "debug",
      "changes",
      `Now watching "${figma.currentPage.name}"`,
    );
  }

  /** Removes every subscription. */
  disable(): void {
    this.detachCurrentPage();

    if (this.documentHandler !== null) {
      figma.off("documentchange", this.documentHandler);
      this.documentHandler = null;
    }

    this.mode = null;
  }

  // ---------------------------------------------------------------------------
  // Subscription management
  // ---------------------------------------------------------------------------

  private attachCurrentPage(): void {
    const page = figma.currentPage;

    const nodeHandler = (event: NodeChangeEvent): void => {
      const ids = this.filterOwnChanges(
        event.nodeChanges.map((change) => change.id),
      );
      if (ids.length === 0) return;

      this.options.emit({
        hasStyleChanges: false,
        hasNodeChanges: true,
        changedNodeIds: ids,
        changeCount: ids.length,
        timestamp: Date.now(),
      });
    };

    page.on("nodechange", nodeHandler);
    this.nodeHandler = nodeHandler;
    this.watchedPage = page;

    const styleHandler = (event: StyleChangeEvent): void => {
      if (event.styleChanges.length === 0) return;

      this.options.emit({
        hasStyleChanges: true,
        hasNodeChanges: false,
        changedNodeIds: [],
        changeCount: event.styleChanges.length,
        timestamp: Date.now(),
      });
    };

    figma.on("stylechange", styleHandler);
    this.styleHandler = styleHandler;
  }

  private detachCurrentPage(): void {
    if (this.nodeHandler !== null && this.watchedPage !== null) {
      // Guarded: the page may have been closed or removed, in which case `off`
      // throws and there is nothing left to unsubscribe from anyway.
      try {
        this.watchedPage.off("nodechange", this.nodeHandler);
      } catch {
        // Already gone.
      }
    }
    this.nodeHandler = null;
    this.watchedPage = null;

    if (this.styleHandler !== null) {
      figma.off("stylechange", this.styleHandler);
      this.styleHandler = null;
    }
  }

  private attachDocumentChange(): void {
    const handler = (event: DocumentChangeEvent): void => {
      let hasStyleChanges = false;
      let hasNodeChanges = false;
      const ids: string[] = [];

      for (const change of event.documentChanges) {
        if (
          change.type === "STYLE_CREATE" ||
          change.type === "STYLE_DELETE" ||
          change.type === "STYLE_PROPERTY_CHANGE"
        ) {
          hasStyleChanges = true;
          continue;
        }

        if (this.options.isOverlayId(change.id)) continue;

        hasNodeChanges = true;
        ids.push(change.id);
      }

      if (!hasStyleChanges && !hasNodeChanges) return;

      this.options.emit({
        hasStyleChanges,
        hasNodeChanges,
        changedNodeIds: ids,
        changeCount: ids.length,
        timestamp: Date.now(),
      });
    };

    figma.on("documentchange", handler);
    this.documentHandler = handler;
  }

  /**
   * Drops the plugin's own highlight overlays from a change list.
   *
   * Creating and removing an overlay is a real document change, so without this
   * every highlight would look to the harness like the user edited the file —
   * and since highlights fire in response to harness commands, that would be a
   * feedback loop.
   *
   * Filters by id rather than name: a deleted node arrives as a `RemovedNode`,
   * which carries `id` and `type` but no `name`.
   */
  private filterOwnChanges(ids: readonly string[]): string[] {
    return ids.filter((id) => !this.options.isOverlayId(id));
  }
}
