/**
 * Shared primitives for bridge plugins.
 *
 * A bridge plugin runs inside a host application and connects it to an MCP
 * harness. The pieces here are the parts that are the same whatever the host
 * is: correlating requests across an async channel, deciding when to retry,
 * polling for a harness to appear, and keeping errors somewhere the plugin's own
 * UI can show them.
 *
 * Deliberately host-agnostic — no DOM, no Node, no dependencies — because this
 * code has to run in a Figma plugin sandbox, a plugin iframe, and a test
 * process without change.
 *
 * Scope note: shaped by one consumer so far (`figma-bridge-plugin`). Everything
 * here was needed to build that plugin rather than added speculatively; expect
 * it to shift as a second bridge lands.
 */

export { Diagnostics, errorMessage } from "./diagnostics.js";
export type { DiagnosticsOptions } from "./diagnostics.js";

export { RequestRegistry } from "./request-registry.js";
export type { RequestRegistryOptions } from "./request-registry.js";

export { Poller } from "./poller.js";
export type { PollerOptions } from "./poller.js";

export { Backoff } from "./backoff.js";
export type { BackoffOptions } from "./backoff.js";

export type {
  ConnectionStatus,
  DiagnosticEntry,
  DiagnosticLevel,
  Disposable,
  TimerHandle,
} from "./types.js";
