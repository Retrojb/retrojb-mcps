/**
 * The Kiro Figma Bridge wire protocol.
 *
 * One WebSocket connection between the Figma plugin (client) and the bridge
 * server running on the developer's machine (server). The server also speaks MCP
 * over stdio to the AI agent in the editor, so the shape here is "whatever the
 * agent needs, expressed as things a Figma plugin can do".
 *
 * Traffic is newline-free JSON. Every frame is either a typed envelope
 * (`{ type, data }`) or a command/reply correlated by `id`.
 *
 * Unlike a plain relay this connection is **authenticated before any command is
 * accepted**: the server issues a random challenge, the plugin returns an HMAC
 * over it keyed by a pairing code derived from `FIGMA_ACCESS_TOKEN`, and the
 * server refuses to route anything until that verifies. See
 * {@link authChallenge} for why the challenge binds the document and user too.
 */

import { hmacHex } from "./hmac.js";

// -----------------------------------------------------------------------------
// Versions and ports
// -----------------------------------------------------------------------------

/**
 * Wire protocol revision.
 *
 * Bumped whenever a frame changes shape incompatibly. Both halves refuse to talk
 * across a mismatch rather than half-working: a plugin installed from Figma
 * Community updates on Figma's schedule, not in lockstep with the server, so
 * version skew is the normal case and has to fail loudly.
 */
export const PROTOCOL_VERSION = 1;

/** Version the plugin reports during the handshake. */
export const PLUGIN_VERSION = "0.1.0";

/** Version the server reports. */
export const SERVER_VERSION = "0.1.0";

/**
 * Inclusive port range the server binds, one port per instance.
 *
 * Deliberately clear of 9222-9232 (Chrome remote debugging, and the range the
 * sibling `figma-bridge-plugin` scans) so the two bridges can run side by side
 * without either dialling the other's server.
 *
 * Every port here must also appear in `manifest.json` under
 * `networkAccess.allowedDomains`, as both `http://` and `ws://`. Figma blocks
 * anything not listed, and the failure is a silent connection refusal.
 */
export const BRIDGE_PORT_MIN = 9770;
export const BRIDGE_PORT_MAX = 9779;

/** Every port a bridge server may be listening on, low to high. */
export const BRIDGE_PORTS: readonly number[] = Array.from(
  { length: BRIDGE_PORT_MAX - BRIDGE_PORT_MIN + 1 },
  (_, index) => BRIDGE_PORT_MIN + index,
);

/** How long the server waits for `CLIENT_AUTH` before closing the socket. */
export const AUTH_TIMEOUT_MS = 10_000;

// -----------------------------------------------------------------------------
// Health endpoint
// -----------------------------------------------------------------------------

/**
 * Body served by `GET /health` on a bridge port.
 *
 * Probed over HTTP before a WebSocket is opened. That ordering is not cosmetic:
 * `new WebSocket()` against a closed port logs an error the plugin cannot catch,
 * so scanning ten ports every few seconds with bare sockets would bury every
 * real message in console noise. `fetch` rejects quietly.
 *
 * Nothing secret appears here. The endpoint is unauthenticated by necessity —
 * it is what makes discovery possible — so it carries only what is needed to
 * decide whether to dial: never the pairing code, never the access token, never
 * the owner's email.
 */
export interface BridgeHealth {
  readonly service: "kiro-figma-bridge";
  readonly status: "ok";
  readonly protocolVersion: number;
  readonly serverVersion: string;
  /** Whether a pairing code is required. False only in explicit insecure mode. */
  readonly requiresPairing: boolean;
  /** Authenticated plugin connections. */
  readonly plugins: number;
  /** Figma account the server is acting for, resolved from the access token. */
  readonly owner: OwnerIdentity | null;
  readonly uptimeSeconds: number;
}

/**
 * Whether a `/health` body came from a bridge server rather than some other
 * process holding the port.
 *
 * The `service` discriminator exists so this cannot be confused with the sibling
 * bridge's harness health payload, which is also `{status: "ok", version}` on a
 * nearby port.
 */
export function isBridgeHealth(body: unknown): body is BridgeHealth {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    candidate.service === "kiro-figma-bridge" &&
    candidate.status === "ok" &&
    typeof candidate.protocolVersion === "number" &&
    typeof candidate.serverVersion === "string"
  );
}

// -----------------------------------------------------------------------------
// Identity
// -----------------------------------------------------------------------------

/**
 * The Figma account the server holds a token for, from `GET /v1/me`.
 *
 * `email` is deliberately absent: the server knows it, the plugin has no use for
 * it, and it would otherwise travel over a plaintext local socket and land in a
 * plugin's memory for no benefit.
 */
export interface OwnerIdentity {
  readonly id: string;
  readonly handle: string;
}

/**
 * The Figma user actually driving the editor, from `figma.currentUser`.
 *
 * Requires `"permissions": ["currentuser"]` in the manifest. Fields are nullable
 * because Figma leaves them null in some contexts (notably when the plugin runs
 * without that permission, and historically in Dev Mode).
 */
export interface FigmaUserRef {
  readonly id: string | null;
  readonly name: string | null;
}

/**
 * How the connected editor's user compares to the token owner.
 *
 * - `match` — `figma.currentUser.id` equals the `/v1/me` id.
 * - `mismatch` — they differ. Someone else's editor is talking to your bridge.
 * - `unknown` — one side did not report an id, so no conclusion is possible.
 * - `skipped` — no access token configured, so there is nothing to compare to.
 */
export type UserMatch = "match" | "mismatch" | "unknown" | "skipped";

/**
 * Identity of the open Figma file.
 *
 * `documentId` is generated by the plugin and stored in the file's plugin data,
 * **not** `figma.fileKey`. `figma.fileKey` is restricted to private
 * organisation plugins, and this plugin is meant to be publishable on Figma
 * Community, so it cannot rely on it. See `sandbox/document-id.ts`.
 */
export interface DocumentIdentity {
  readonly documentId: string;
  readonly fileName: string;
  readonly currentPage: string;
  readonly currentPageId: string;
  readonly selectionCount: number;
  readonly editorType: string;
  /** Whether the plugin could persist `documentId` into the file. */
  readonly documentIdPersisted: boolean;
}

// -----------------------------------------------------------------------------
// Handshake: server -> plugin
// -----------------------------------------------------------------------------

/** Sent once, immediately after the socket opens, before anything else. */
export interface ServerHelloMessage {
  readonly type: "SERVER_HELLO";
  readonly data: {
    readonly protocolVersion: number;
    readonly serverVersion: string;
    readonly port: number;
    readonly pid: number;
    readonly startedAt: number;
    readonly requiresPairing: boolean;
    /** Fresh random challenge for this connection, hex. Never reused. */
    readonly nonce: string;
    readonly owner: OwnerIdentity | null;
  };
}

/** Verdict on {@link ClientAuthMessage}. Nothing is routed before this. */
export type AuthResultMessage = {
  readonly type: "AUTH_RESULT";
} & (
  | {
      readonly ok: true;
      readonly owner: OwnerIdentity | null;
      readonly userMatch: UserMatch;
      /** Set when the server accepted the socket but wants it said out loud. */
      readonly warning: string | null;
    }
  | {
      readonly ok: false;
      readonly code: AuthFailureCode;
      readonly message: string;
    }
);

export type AuthFailureCode =
  "PROTOCOL_MISMATCH" | "BAD_PAIR_CODE" | "USER_MISMATCH" | "MALFORMED";

// -----------------------------------------------------------------------------
// Handshake: plugin -> server
// -----------------------------------------------------------------------------

/** The plugin's answer to the challenge. Must be the first frame it sends. */
export interface ClientAuthMessage {
  readonly type: "CLIENT_AUTH";
  readonly data: {
    readonly protocolVersion: number;
    readonly pluginVersion: string;
    /**
     * HMAC-SHA256 over {@link authChallenge}, keyed by the pairing code, hex.
     *
     * The pairing code itself never crosses the wire, so a passive listener on
     * the loopback interface learns nothing reusable: the nonce changes every
     * connection.
     */
    readonly proof: string;
    readonly document: DocumentIdentity;
    readonly figmaUser: FigmaUserRef | null;
  };
}

// -----------------------------------------------------------------------------
// Commands: server -> plugin
// -----------------------------------------------------------------------------

/**
 * A request to run something against the Figma API.
 *
 * `id` correlates the reply. Only accepted after a successful `AUTH_RESULT`.
 */
export interface BridgeCommand {
  readonly id: string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

/** Narrows a parsed frame to a command. */
export function isBridgeCommand(message: unknown): message is BridgeCommand {
  if (typeof message !== "object" || message === null) return false;
  const candidate = message as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.method === "string" &&
    candidate.type === undefined
  );
}

/**
 * Every method the sandbox implements.
 *
 * Named constants rather than bare strings so a typo is a compile error on both
 * sides of the socket. The MCP tool layer maps one tool onto one method.
 */
export const METHODS = {
  getDocumentInfo: "GET_DOCUMENT_INFO",
  getSelection: "GET_SELECTION",
  getNode: "GET_NODE",
  findNodes: "FIND_NODES",
  setSelection: "SET_SELECTION",
  highlightNodes: "HIGHLIGHT_NODES",
  clearHighlight: "CLEAR_HIGHLIGHT",
  scrollAndZoom: "SCROLL_AND_ZOOM",
  getLocalComponents: "GET_LOCAL_COMPONENTS",
  getLocalVariables: "GET_LOCAL_VARIABLES",
  getLocalStyles: "GET_LOCAL_STYLES",
  exportNodeImage: "EXPORT_NODE_IMAGE",
  renameNode: "RENAME_NODE",
} as const;

export type MethodName = (typeof METHODS)[keyof typeof METHODS];

// -----------------------------------------------------------------------------
// Replies and events: plugin -> server
// -----------------------------------------------------------------------------

export interface CommandSuccess {
  readonly id: string;
  readonly result: unknown;
}

export interface CommandFailure {
  readonly id: string;
  /** A plain string, not an `Error`: this has to survive `JSON.stringify`. */
  readonly error: string;
}

export type CommandReply = CommandSuccess | CommandFailure;

/** One node in a selection report. */
export interface SelectionNode {
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
  /** Key of the main component, when this node is an instance. */
  readonly mainComponentKey: string | null;
  readonly childCount: number | null;
}

export interface SelectionInfo {
  readonly nodes: readonly SelectionNode[];
  readonly count: number;
  readonly page: string;
  readonly pageId: string;
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
    readonly changedNodeIds: readonly string[];
    readonly changeCount: number;
    readonly timestamp: number;
  };
}

/** Re-sent whenever file or page identity changes, so the server stays current. */
export interface DocumentInfoMessage {
  readonly type: "DOCUMENT_INFO";
  readonly data: DocumentIdentity;
}

export type PluginEvent =
  | SelectionChangeMessage
  | PageChangeMessage
  | DocumentChangeMessage
  | DocumentInfoMessage;

// -----------------------------------------------------------------------------
// The signed challenge
// -----------------------------------------------------------------------------

/** Inputs the proof is computed over. Both halves must agree exactly. */
export interface AuthChallengeInput {
  readonly nonce: string;
  readonly documentId: string;
  readonly figmaUserId: string | null;
}

/**
 * Builds the canonical string the pairing proof is an HMAC of.
 *
 * Three properties are worth spelling out, because each is a specific attack
 * this closes:
 *
 * 1. **The nonce** is fresh per connection, so a proof captured once cannot be
 *    replayed on a later socket.
 * 2. **`documentId` and `figmaUserId` are inside the signature**, so a client
 *    that legitimately holds the pairing code still cannot present a proof for
 *    one document and then claim to be a different one — the server verifies the
 *    signature against the values it was handed, so tampering invalidates it.
 * 3. **The domain prefix** (`kiro-figma-bridge/auth/v1`) means a proof is
 *    meaningless outside this protocol, so the same pairing code can never be
 *    cross-used to sign something else.
 *
 * Newline-separated with a fixed field order and a `-` placeholder for a missing
 * user id, so the encoding is unambiguous: no field can be shifted into another
 * by choosing a value that contains the separator, because none of these values
 * may contain a newline.
 */
export function authChallenge(input: AuthChallengeInput): string {
  return [
    "kiro-figma-bridge/auth/v1",
    input.nonce,
    input.documentId,
    input.figmaUserId ?? "-",
  ].join("\n");
}

/** Computes the proof a client sends, or the one a server expects. */
export function authProof(pairCode: string, input: AuthChallengeInput): string {
  return hmacHex(normalizePairCode(pairCode), authChallenge(input));
}

/**
 * Canonical form of a pairing code.
 *
 * Users retype these, so case and separators are forgiving on input and
 * normalised before the code is ever used as an HMAC key — otherwise
 * `abcd-1234` and `ABCD1234` would produce different proofs and the mismatch
 * would look like a wrong code.
 */
export function normalizePairCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

// -----------------------------------------------------------------------------
// Close semantics
// -----------------------------------------------------------------------------

/** Application close codes, in the 4000-4999 range reserved for private use. */
export const CLOSE_AUTH_FAILED = 4401;
export const CLOSE_AUTH_TIMEOUT = 4408;
export const CLOSE_REPLACED = 4409;
export const CLOSE_PROTOCOL_MISMATCH = 4426;

/**
 * Whether a close means "do not dial this port again".
 *
 * Retrying after a rejected pairing code would produce an endless reconnect
 * loop that presents to the user as a flaky network rather than as the wrong
 * code, which is the one thing they could actually fix.
 */
export function isTerminalClose(code: number): boolean {
  return (
    code === CLOSE_AUTH_FAILED ||
    code === CLOSE_PROTOCOL_MISMATCH ||
    code === CLOSE_REPLACED
  );
}
