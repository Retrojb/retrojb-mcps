/**
 * The Figma Console MCP harness wire protocol.
 *
 * Transcribed from the harness implementation
 * (`southleft/figma-console-mcp`, `src/core/websocket-server.ts`) so this
 * plugin is a drop-in alternative to the bundled Desktop Bridge. Anything here
 * that drifts from the harness breaks the pairing, so the shapes are pinned
 * rather than inferred.
 *
 * Traffic is newline-free JSON over a plain WebSocket. There is no framing,
 * version negotiation, or handshake beyond `SERVER_HELLO` / `FILE_INFO`.
 */

/** Inclusive port range the harness binds, one port per instance. */
export const HARNESS_PORT_MIN = 9223;
export const HARNESS_PORT_MAX = 9232;

/** Every port a harness may be listening on, low to high. */
export const HARNESS_PORTS: readonly number[] = Array.from(
  { length: HARNESS_PORT_MAX - HARNESS_PORT_MIN + 1 },
  (_, index) => HARNESS_PORT_MIN + index,
);

/**
 * Version this plugin reports in {@link FileInfo}.
 *
 * The harness compares it against the plugin build it ships and shows an
 * update prompt when they differ. This is an independent implementation, so it
 * carries its own version line.
 */
export const PLUGIN_VERSION = "0.1.0";

// -----------------------------------------------------------------------------
// Harness health endpoint
// -----------------------------------------------------------------------------

/** Body served by `GET /health` on a harness port. */
export interface HarnessHealth {
  readonly status: "ok";
  readonly version: string;
  readonly clients: number;
  readonly connectedClients?: number;
  readonly uptime?: number;
}

/**
 * Whether a `/health` body came from a harness rather than some other process
 * that happens to hold the port.
 *
 * The check matters: 9223 is also Chrome's remote debugging port in some
 * setups, and dialling a WebSocket at an unrelated server produces console
 * noise the user cannot act on. Probing over HTTP first keeps that quiet,
 * because `fetch` to a closed or foreign port rejects without logging.
 */
export function isHarnessHealth(body: unknown): body is HarnessHealth {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    candidate.status === "ok" &&
    typeof candidate.version === "string" &&
    candidate.clients !== undefined
  );
}

// -----------------------------------------------------------------------------
// Harness -> plugin
// -----------------------------------------------------------------------------

/** Sent once per connection, immediately after the socket opens. */
export interface ServerHelloMessage {
  readonly type: "SERVER_HELLO";
  readonly data: {
    readonly port: number;
    readonly pid: number;
    readonly serverVersion: string;
    readonly startedAt: number;
  };
}

/** Sent when the harness ships a newer plugin build than the one running. */
export interface PluginUpdateAvailableMessage {
  readonly type: "PLUGIN_UPDATE_AVAILABLE";
}

/**
 * A command to execute against the Figma API.
 *
 * `id` correlates the reply. The harness rejects a reply arriving on a socket
 * belonging to a different file, so responses must go back out the same socket
 * the command came in on.
 */
export interface HarnessCommand {
  readonly id: string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export type HarnessMessage =
  ServerHelloMessage | PluginUpdateAvailableMessage | HarnessCommand;

/** Narrows a parsed harness frame to a command. */
export function isHarnessCommand(message: unknown): message is HarnessCommand {
  if (typeof message !== "object" || message === null) return false;
  const candidate = message as Record<string, unknown>;
  return (
    typeof candidate.id === "string" && typeof candidate.method === "string"
  );
}

// -----------------------------------------------------------------------------
// Plugin -> harness
// -----------------------------------------------------------------------------

export interface CommandSuccess {
  readonly id: string;
  readonly result: unknown;
}

export interface CommandFailure {
  readonly id: string;
  /** Plain string, not an object — the harness wraps it in `new Error(...)`. */
  readonly error: string;
}

export type CommandReply = CommandSuccess | CommandFailure;

/**
 * File identity, sent unprompted right after connecting.
 *
 * The harness holds a new socket as "pending" until this arrives and closes it
 * after 30 seconds without one. A null `fileKey` leaves the socket pending,
 * which still works while it is the only socket but breaks multi-file routing —
 * see the README note on `enablePrivatePluginApi`.
 */
export interface FileInfo {
  readonly fileName: string;
  readonly fileKey: string | null;
  readonly currentPage: string;
  readonly currentPageId: string;
  readonly selectionCount: number;
  readonly pluginVersion: string;
  readonly editorType: string;
}

export interface FileInfoMessage {
  readonly type: "FILE_INFO";
  readonly data: FileInfo;
}

/** One node in a selection report. */
export interface SelectionNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly width?: number;
  readonly height?: number;
}

export interface SelectionInfo {
  readonly nodes: readonly SelectionNode[];
  readonly count: number;
  readonly page: string;
  readonly timestamp: number;
}

export interface SelectionChangeMessage {
  readonly type: "SELECTION_CHANGE";
  readonly data: SelectionInfo;
}

export interface PageChangeMessage {
  readonly type: "PAGE_CHANGE";
  readonly data: {
    readonly pageId: string;
    readonly pageName: string;
    readonly timestamp: number;
  };
}

export interface DocumentChangeMessage {
  readonly type: "DOCUMENT_CHANGE";
  readonly data: {
    readonly hasStyleChanges: boolean;
    readonly hasNodeChanges: boolean;
    readonly changedNodeIds: readonly string[];
    readonly changeCount: number;
    readonly timestamp: number;
  };
}

export interface ConsoleCaptureMessage {
  readonly type: "CONSOLE_CAPTURE";
  readonly data: {
    readonly timestamp: number;
    readonly level: string;
    readonly message: string;
    readonly args: readonly unknown[];
  };
}

export type PluginEvent =
  | FileInfoMessage
  | SelectionChangeMessage
  | PageChangeMessage
  | DocumentChangeMessage
  | ConsoleCaptureMessage;

// -----------------------------------------------------------------------------
// Close semantics
// -----------------------------------------------------------------------------

/**
 * Close reasons that mean "do not dial this port again".
 *
 * The harness sends these when it has deliberately displaced a socket. Retrying
 * would fight the harness and produce a reconnect loop that looks like a network
 * fault to the user.
 */
const TERMINAL_CLOSE_REASONS: readonly string[] = [
  "Replaced by new connection",
  "Replaced by same file reconnection",
  "Manual disconnect",
  "File identification timeout",
];

/** Whether a close event should suppress the automatic same-port retry. */
export function isTerminalClose(code: number, reason: string): boolean {
  return code === 1000 && TERMINAL_CLOSE_REASONS.includes(reason);
}
