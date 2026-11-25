/**
 * Vocabulary shared by bridge plugins.
 *
 * A "bridge plugin" runs inside a host application (Figma, Sketch, a browser
 * extension) and connects it to an MCP harness. The harness drives; the bridge
 * executes host API calls and reports host events back.
 */

/**
 * Lifecycle of one bridge connection.
 *
 * `searching` and `reconnecting` are deliberately distinct: the first means
 * nothing has been found yet, the second means something was found and lost.
 * Users read those two situations very differently, so the UI needs to as well.
 */
export type ConnectionStatus =
  | "idle"
  | "searching"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "paused"
  | "error";

/** Severity for {@link DiagnosticEntry}. */
export type DiagnosticLevel = "debug" | "info" | "warn" | "error";

/** One entry in the diagnostics buffer surfaced to the plugin UI. */
export interface DiagnosticEntry {
  readonly id: number;
  readonly timestamp: number;
  readonly level: DiagnosticLevel;
  /** Short subsystem tag, e.g. `"discovery"` or `"socket:9223"`. */
  readonly scope: string;
  readonly message: string;
  /** Optional structured payload. Must be JSON-serialisable. */
  readonly detail?: unknown;
}

/**
 * Opaque timer handle.
 *
 * Browsers return a number and Node returns a `Timeout`; this package only ever
 * round-trips the value back to `clearTimeout`, so neither needs to be named.
 */
export interface TimerHandle {
  readonly __timerHandleBrand?: never;
}

/** Anything that can be torn down. */
export interface Disposable {
  dispose(): void;
}
