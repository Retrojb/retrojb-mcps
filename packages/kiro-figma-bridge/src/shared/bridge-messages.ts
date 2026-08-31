/**
 * The contract between the plugin's two halves.
 *
 * A Figma plugin runs in two isolated contexts:
 *
 * - **sandbox** (`code.js`) — owns the `figma` API, has no network access.
 * - **UI** (`ui.html` iframe) — owns `WebSocket` and `fetch`, has no `figma` API.
 *
 * Neither can do the other's job, so every command from the bridge server
 * arrives in the UI and has to be relayed to the sandbox and its result relayed
 * back. That relay is this file.
 *
 * Everything crossing the boundary is structurally cloned, so payloads must be
 * plain JSON — no `Error`s, no class instances, no Figma node references. That
 * constraint is why `SandboxReply` carries an error *string* rather than an
 * error object.
 */

import type { ConnectionStatus, DiagnosticLevel } from "@retrojb/plugin-kit";
import type {
  DocumentIdentity,
  FigmaUserRef,
  OwnerIdentity,
  SelectionInfo,
  UserMatch,
} from "./protocol.js";

/** How a node referenced by the agent should be indicated on the canvas. */
export type HighlightMode = "overlay" | "select" | "off";

/** User-adjustable settings, owned by the UI and persisted by the sandbox. */
export interface BridgeSettings {
  readonly highlightMode: HighlightMode;
  /** How long an overlay highlight stays on canvas, in milliseconds. */
  readonly highlightDurationMs: number;
  /** Whether to scroll a referenced node into view. */
  readonly scrollIntoView: boolean;
  /** Whether to look for a bridge server automatically on open. */
  readonly autoConnect: boolean;
  /**
   * Whether the agent may change the document.
   *
   * Off by default. An agent that can rename and reorganise layers is useful,
   * but it is not what someone expects from installing a plugin described as
   * connecting their editor to their AI assistant, so it is opt-in per session
   * rather than assumed.
   */
  readonly allowWrites: boolean;
}

export const DEFAULT_SETTINGS: BridgeSettings = {
  highlightMode: "overlay",
  highlightDurationMs: 1600,
  scrollIntoView: true,
  autoConnect: true,
  allowWrites: false,
};

/** Everything the UI needs to persist the pairing code between sessions. */
export interface StoredCredentials {
  /** The code as the user typed it, normalised. Empty when unset. */
  readonly pairCode: string;
}

// -----------------------------------------------------------------------------
// UI -> sandbox
// -----------------------------------------------------------------------------

/** Asks the sandbox to run a command and reply with `COMMAND_RESULT`. */
export interface ExecuteCommandRequest {
  readonly kind: "EXECUTE_COMMAND";
  /** Correlation id, distinct from the server's own command id. */
  readonly requestId: string;
  readonly method: string;
  readonly params: Record<string, unknown>;
}

/** Asks for current document identity, used to build the auth payload. */
export interface DocumentInfoRequest {
  readonly kind: "REQUEST_DOCUMENT_INFO";
  readonly requestId: string;
}

/** Asks for the current selection, used to populate the UI on open. */
export interface SelectionRequest {
  readonly kind: "REQUEST_SELECTION";
  readonly requestId: string;
}

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

/** Persists the pairing code so the user types it once per machine. */
export interface StoreCredentialsRequest {
  readonly kind: "STORE_CREDENTIALS";
  readonly credentials: StoredCredentials;
}

/** Mirrors UI connection state into the sandbox so it can log it. */
export interface ReportStatusRequest {
  readonly kind: "REPORT_STATUS";
  readonly status: ConnectionStatus;
  readonly port: number | null;
  readonly owner: OwnerIdentity | null;
  readonly userMatch: UserMatch | null;
}

export interface CloseRequest {
  readonly kind: "CLOSE_PLUGIN";
}

export interface ResizeRequest {
  readonly kind: "RESIZE_UI";
  readonly width: number;
  readonly height: number;
}

export type UiToSandbox =
  | ExecuteCommandRequest
  | DocumentInfoRequest
  | SelectionRequest
  | HighlightRequest
  | ClearHighlightRequest
  | UpdateSettingsRequest
  | StoreCredentialsRequest
  | ReportStatusRequest
  | CloseRequest
  | ResizeRequest;

// -----------------------------------------------------------------------------
// Sandbox -> UI
// -----------------------------------------------------------------------------

/**
 * Reply to a request that carried a `requestId`.
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
}

export interface DocumentInfoEvent {
  readonly kind: "DOCUMENT_INFO";
  readonly document: DocumentIdentity;
}

export interface PageChangeEvent {
  readonly kind: "PAGE_CHANGE";
  readonly pageId: string;
  readonly pageName: string;
  readonly timestamp: number;
}

export interface DocumentChangeEvent {
  readonly kind: "DOCUMENT_CHANGE";
  readonly changedNodeIds: readonly string[];
  readonly changeCount: number;
  readonly timestamp: number;
}

/** A sandbox-side diagnostic destined for the UI's activity log. */
export interface DiagnosticEvent {
  readonly kind: "DIAGNOSTIC";
  readonly level: DiagnosticLevel;
  readonly scope: string;
  readonly message: string;
}

/** Sent once at startup with everything the UI needs to start connecting. */
export interface ReadyEvent {
  readonly kind: "READY";
  readonly settings: BridgeSettings;
  readonly credentials: StoredCredentials;
  readonly document: DocumentIdentity;
  readonly figmaUser: FigmaUserRef | null;
  readonly pluginVersion: string;
  /** Whether this editor can be written to at all (false in Dev Mode). */
  readonly canWrite: boolean;
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
  | DocumentInfoEvent
  | PageChangeEvent
  | DocumentChangeEvent
  | DiagnosticEvent
  | ReadyEvent
  | HighlightStateEvent;
