/**
 * Full-document loading, done once and only when something genuinely needs it.
 *
 * Under `documentAccess: "dynamic-page"` Figma loads pages on demand, and a few
 * APIs refuse to work until every page is resident:
 * `figma.root.findAll*` and the `documentchange` event.
 *
 * Figma's guidance is to avoid this where possible — on a large file the load can
 * take tens of seconds, and loading every page can hit a memory limit. So it is
 * deliberately not called at startup: callers opt in, and the result is memoised
 * so a second caller pays nothing.
 */

let loaded: Promise<void> | null = null;

/**
 * Loads every page, at most once per session.
 *
 * Prefer `figma.loadAllPagesAsync()` over loading pages individually: it also
 * arranges for pages added later by other collaborators to be loaded.
 */
export function ensureAllPagesLoaded(): Promise<void> {
  if (loaded === null) {
    loaded = figma.loadAllPagesAsync().catch((error: unknown) => {
      // Cleared so a transient failure can be retried rather than poisoning
      // every later caller with the same rejection.
      loaded = null;
      throw error;
    });
  }
  return loaded;
}

/** Whether a full load has been completed or is in flight. */
export function isAllPagesLoadRequested(): boolean {
  return loaded !== null;
}

/**
 * Discards the memoised load.
 *
 * Exists for test isolation. A plugin session has exactly one document, so
 * production code never needs this — but the memo is module state, and without a
 * reset a test that loads pages silently satisfies the next test's load, which
 * makes the next test pass without exercising anything.
 */
export function resetPageLoadingForTests(): void {
  loaded = null;
}
