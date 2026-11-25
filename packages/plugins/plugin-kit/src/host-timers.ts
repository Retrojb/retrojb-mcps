import type { TimerHandle } from "./types.js";

/**
 * The only host capability this package requires.
 *
 * Declared explicitly rather than pulled in via the `DOM` or `node` type
 * libraries. Those would also hand us `document`, `window`, and `process` —
 * none of which exist in a Figma plugin sandbox, so having them in scope would
 * turn a compile-time error into a runtime one. Adding them as globals would
 * also collide with `lib.dom.d.ts` in consumers that legitimately do have a DOM.
 */
interface TimerHost {
  setTimeout(handler: () => void, timeoutMs?: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

const host = globalThis as unknown as TimerHost;

/** Schedules `handler` after `timeoutMs`, returning an opaque handle. */
export function setTimer(handler: () => void, timeoutMs?: number): TimerHandle {
  return host.setTimeout(handler, timeoutMs);
}

/** Cancels a timer created by {@link setTimer}. Safe to call with `null`. */
export function clearTimer(handle: TimerHandle | null | undefined): void {
  if (handle === null || handle === undefined) return;
  host.clearTimeout(handle);
}
