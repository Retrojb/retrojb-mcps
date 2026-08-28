/**
 * The contract between the plugin's two halves.
 *
 * A Figma plugin runs in two isolated contexts:
 *
 * - **sandbox** (`code.js`) — owns the `figma` API, has no network access.
 * - **UI** (`ui.html` iframe) — owns `WebSocket` and `fetch`, has no `figma` API.
 *
 * Neither can do the other's job, so every harness command arrives in the UI and
 * has to be relayed to the sandbox and its result relayed back. That relay is
 * this file.
 *
 * Everything crossing the boundary is structurally cloned, so payloads must be
 * plain JSON — no `Error`s, no class instances, no Figma node references.
 */

import type { DiagnosticLevel, ConnectionStatus } from "@retrojb/plugin-kit";
import type { FileInfo, SelectionInfo } from "./protocol.js";

/** How a referenced node should be indicated on the canvas. */
export type HighlightMode = "overlay" | "select" | "off";

/** How much of the document to watch for changes. */
export type MonitorMode = "current-page" | "full-document";

/** User-adjustable settings, owned by the UI and persisted by the sandbox. */
export interface BridgeSettings {
  readonly highlightMode: HighlightMode;
  /** How long an overlay highlight stays on canvas, in milliseconds. */
  readonly highlightDurationMs: number;
  /** Whether to scroll a referenced node into view. */
  readonly scrollIntoView: boolean;
  /** Whether the plugin should auto-connect to discovered harnesses. */
  readonly autoConnect: boolean;
  /**
   * Change monitoring scope.
   *
   * `full-document` requires loading every page, which Figma warns can take tens
   * of seconds on a large file and can hit a memory limit — so the default is the
   * cheap current-page path.
   */
  readonly monitorMode: MonitorMode;
}

export const DEFAULT_SETTINGS: BridgeSettings = {
  highlightMode: "overlay",
  highlightDurationMs: 1600,
  scrollIntoView: true,
  autoConnect: true,
  monitorMode: "current-page",
};

// -----------------------------------------------------------------------------
// UI -> sandbox
// -----------------------------------------------------------------------------

/** Asks the sandbox to run a harness command and reply with `COMMAND_RESULT`. */
export interface ExecuteCommandRequest {
  readonly kind: "EXECUTE_COMMAND";
  /** Correlation id, distinct from the harness's own command id. */
  readonly requestId: string;
  readonly method: string;
  readonly params: Record<string, unknown>;
}

/** Asks for current file identity, used to build the `FILE_INFO` frame. */
export interface FileInfoRequest {
  readonly kind: "REQUEST_FILE_INFO";
  readonly requestId: string;
}

/** Asks for the current selection, used to populate the UI on open. */
export interface SelectionRequest {
  readonly kind: "REQUEST_SELECTION";
  readonly requestId: string;
}

/**
 * Asks the sandbox to indicate a node on the canvas.
 *
 * Sent by the UI when a harness command names a node, and when the user clicks
 * a node in the selection list.
 */
export interface HighlightRequest {
  readonly kind: "HIGHLIGHT_NODES";
  readonly nodeIds: readonly string[];
  /** Shown in the sandbox console and the UI activity log. */
  readonly reason: string;
}

export interface ClearHighlightRequest {
  readonly kind: "CLEAR_HIGHLIGHT";
}

export interface UpdateSettingsRequest {
  readonly kind: "UPDATE_SETTINGS";
  readonly settings: BridgeSettings;
}

/** Mirrors UI connection state into the sandbox so it can log and resize. */
export interface ReportStatusRequest {
  readonly kind: "REPORT_STATUS";
  readonly status: ConnectionStatus;
  readonly connectedPorts: readonly number[];
}

/**
 * Enables or disables `EXECUTE_CODE`.
 *
 * Separate from {@link UpdateSettingsRequest} because this permission is
 * deliberately session-scoped: persisting "arbitrary code execution allowed"
 * across sessions would re-grant it silently on the next open.
 */
export interface SetCodeExecutionRequest {
  readonly kind: "SET_CODE_EXECUTION";
  readonly enabled: boolean;
}

/** Asks the sandbox to close the plugin. */
export interface CloseRequest {
  readonly kind: "CLOSE_PLUGIN";
}

/** Asks the sandbox to resize the plugin window. */
export interface ResizeRequest {
  readonly kind: "RESIZE_UI";
  readonly width: number;
  readonly height: number;
}

export type UiToSandbox =
  | ExecuteCommandRequest
  | FileInfoRequest
  | SelectionRequest
  | HighlightRequest
  | ClearHighlightRequest
  | UpdateSettingsRequest
  | SetCodeExecutionRequest
  | ReportStatusRequest
  | CloseRequest
  | ResizeRequest;

// -----------------------------------------------------------------------------
// Sandbox -> UI
// -----------------------------------------------------------------------------

/**
 * Reply to {@link ExecuteCommandRequest}, {@link FileInfoRequest}, or
 * {@link SelectionRequest}.
 *
 * A discriminated success flag rather than an optional `error`, so a handler
 * cannot read `result` on a failed reply without TypeScript objecting.
 */
export type SandboxReply =
  | {
      readonly kind: "COMMAND_RESULT";
      readonly requestId: string;
      readonly ok: true;
      readonly result: unknown;
    }
  | {
      readonly kind: "COMMAND_RESULT";
      readonly requestId: string;
      readonly ok: false;
      readonly error: string;
    };

/** Pushed whenever the canvas selection changes, and once on startup. */
export interface SelectionEvent {
  readonly kind: "SELECTION";
  readonly selection: SelectionInfo;
  /** Richer per-node detail for the UI, beyond what the harness protocol carries. */
  readonly detail: readonly SelectionNodeDetail[];
}

/**
 * Node detail for the plugin UI.
 *
 * Wider than the harness's `SelectionNode` on purpose: the harness only needs
 * identity and size, whereas the UI is showing a human what they have picked.
 */
export interface SelectionNodeDetail {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly x: number | null;
  readonly y: number | null;
  readonly visible: boolean;
  readonly locked: boolean;
  /** Ancestor names from the page down to the immediate parent. */
  readonly path: readonly string[];
  /** Key of the main component, when this is an instance. */
  readonly mainComponent: string | null;
  readonly childCount: number | null;
}

export interface FileInfoEvent {
  readonly kind: "FILE_INFO";
  readonly fileInfo: FileInfo;
}

export interface PageChangeEvent {
  readonly kind: "PAGE_CHANGE";
  readonly pageId: string;
  readonly pageName: string;
  readonly timestamp: number;
}

export interface DocumentChangeEvent {
  readonly kind: "DOCUMENT_CHANGE";
  readonly hasStyleChanges: boolean;
  readonly hasNodeChanges: boolean;
  readonly changedNodeIds: readonly string[];
  readonly changeCount: number;
  readonly timestamp: number;
}

/** A sandbox console line, forwarded so the harness and UI can both see it. */
export interface ConsoleEvent {
  readonly kind: "CONSOLE";
  readonly level: string;
  readonly message: string;
  readonly args: readonly unknown[];
  readonly timestamp: number;
}

/** A sandbox-side diagnostic destined for the UI's activity log. */
export interface DiagnosticEvent {
  readonly kind: "DIAGNOSTIC";
  readonly level: DiagnosticLevel;
  readonly scope: string;
  readonly message: string;
  readonly detail?: unknown;
}

/** Sent once at startup with persisted settings and initial state. */
export interface ReadyEvent {
  readonly kind: "READY";
  readonly settings: BridgeSettings;
  readonly fileInfo: FileInfo;
  readonly pluginVersion: string;
}

/** Confirms which nodes are currently highlighted, for UI feedback. */
export interface HighlightStateEvent {
  readonly kind: "HIGHLIGHT_STATE";
  readonly nodeIds: readonly string[];
  readonly reason: string | null;
}

export type SandboxToUi =
  | SandboxReply
  | SelectionEvent
  | FileInfoEvent
  | PageChangeEvent
  | DocumentChangeEvent
  | ConsoleEvent
  | DiagnosticEvent
  | ReadyEvent
  | HighlightStateEvent;
