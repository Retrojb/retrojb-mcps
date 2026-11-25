/**
 * UI entry point.
 *
 * This half owns the network. It holds the sockets to every bridge server, relays
 * each inbound command to the sandbox, and pushes document events back out. The
 * sandbox cannot do any of that — Figma gives the iframe the network and the
 * sandbox the document, and never both to one context.
 *
 * Nothing starts until `READY` arrives: discovery needs the pairing code and the
 * document identity, both of which live in the sandbox.
 */

import { Diagnostics, errorMessage } from "@retrojb/plugin-kit";
import { BridgePool } from "./bridge-pool.js";
import { SandboxClient } from "./sandbox-client.js";
import { View, type ViewState } from "./view.js";
import {
  DEFAULT_SETTINGS,
  type BridgeSettings,
} from "../shared/bridge-messages.js";
import {
  normalizePairCode,
  PLUGIN_VERSION,
  type BridgeCommand,
  type DocumentIdentity,
  type FigmaUserRef,
  type SelectionInfo,
} from "../shared/protocol.js";

const root = document.getElementById("app");
if (root === null) throw new Error("The plugin window has no #app element");

const diagnostics = new Diagnostics({ capacity: 300 });

let settings: BridgeSettings = DEFAULT_SETTINGS;
let pairCode = "";
let document_: DocumentIdentity | null = null;
let figmaUser: FigmaUserRef | null = null;
let selection: SelectionInfo | null = null;
let canWrite = true;
let ready = false;

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

let renderQueued = false;

/**
 * Coalesces renders to one per frame.
 *
 * A discovery pass across ten ports, each updating state as it settles, would
 * otherwise repaint the window ten times in a few milliseconds — visible as a
 * flicker, and enough to interrupt typing in the pairing field.
 */
function scheduleRender(): void {
  if (renderQueued) return;
  renderQueued = true;

  requestAnimationFrame(() => {
    renderQueued = false;
    view.render(currentState());
  });
}

function currentState(): ViewState {
  return {
    status: pool.status,
    connections: pool.connections(),
    owner: pool.owner,
    userMatch: pool.userMatch,
    needsPairing: pool.needsPairing,
    pairCode,
    document: document_,
    figmaUser,
    selection,
    settings,
    canWrite,
    diagnostics: diagnostics.all(),
    pluginVersion: PLUGIN_VERSION,
    paused: pool.isPaused,
  };
}

// -----------------------------------------------------------------------------
// Wiring
// -----------------------------------------------------------------------------

const sandbox = new SandboxClient(diagnostics, {
  onReady: (event) => {
    settings = event.settings;
    pairCode = normalizePairCode(event.credentials.pairCode);
    document_ = event.document;
    figmaUser = event.figmaUser;
    canWrite = event.canWrite;
    ready = true;

    if (!document_.documentIdPersisted) {
      diagnostics.warn(
        "document",
        "This file could not store a bridge id, so the agent sees a new id each session. Expected in Dev Mode and view-only files.",
      );
    }

    if (settings.autoConnect) pool.start();
    else
      diagnostics.info(
        "pool",
        "Auto-connect is off. Press Reconnect to attach.",
      );

    scheduleRender();
  },

  onSelection: (next) => {
    selection = next;
    pool.broadcast({ type: "SELECTION_CHANGE", data: next });
    scheduleRender();
  },

  onDocumentInfo: (next) => {
    document_ = next;
    pool.broadcast({ type: "DOCUMENT_INFO", data: next });
    scheduleRender();
  },

  onPageChange: (pageId, pageName) => {
    pool.broadcast({
      type: "PAGE_CHANGE",
      data: { pageId, pageName, timestamp: Date.now() },
    });
  },

  onDocumentChange: (changedNodeIds, changeCount) => {
    pool.broadcast({
      type: "DOCUMENT_CHANGE",
      data: { changedNodeIds, changeCount, timestamp: Date.now() },
    });
  },

  onHighlightState: (nodeIds, reason) => {
    if (nodeIds.length > 0 && reason !== null) {
      diagnostics.debug("highlight", `${nodeIds.length} layer(s): ${reason}`);
    }
    scheduleRender();
  },
});

const pool = new BridgePool({
  diagnostics,
  execute: (command: BridgeCommand) => runCommand(command),
  document: () => sandbox.requestDocumentInfo(),
  figmaUser: () => figmaUser,
  pairCode: () => pairCode,
  onChange: () => {
    reportStatus();
    scheduleRender();
  },
});

/**
 * Relays a command to the sandbox.
 *
 * The relay timeout is derived from the server's own, plus headroom: if the
 * server gives up first the reply is wasted work, and if the relay gives up first
 * the server reports a timeout for a command that actually succeeded.
 */
function runCommand(command: BridgeCommand): Promise<unknown> {
  const params = command.params ?? {};
  const declared = params.timeoutMs;
  const timeoutMs =
    typeof declared === "number" && Number.isFinite(declared)
      ? declared + 5000
      : undefined;

  return sandbox.executeCommand(command.method, params, timeoutMs);
}

let lastReportedStatus = "";

/** Mirrors connection state into the sandbox, but only when it changes. */
function reportStatus(): void {
  const ports = pool.connectedPorts();
  const signature = `${pool.status}|${ports.join(",")}|${pool.owner?.id ?? ""}|${pool.userMatch ?? ""}`;
  if (signature === lastReportedStatus) return;
  lastReportedStatus = signature;

  sandbox.reportStatus({
    kind: "REPORT_STATUS",
    status: pool.status,
    port: ports[0] ?? null,
    owner: pool.owner,
    userMatch: pool.userMatch,
  });
}

const view = new View(root, {
  onSavePairCode: (code) => {
    const normalized = normalizePairCode(code);
    if (normalized === pairCode) {
      // Still reconnect: the user pressing the button with an unchanged code is
      // almost always "try again", and silently doing nothing looks broken.
      pool.reconnect();
      return;
    }

    pairCode = normalized;
    sandbox.storeCredentials({ pairCode: normalized });
    diagnostics.info(
      "pairing",
      normalized === "" ? "Pairing code cleared" : "Pairing code saved",
    );

    // Sockets rejected for a bad code are never retried automatically, so a new
    // code has to discard them and rediscover.
    pool.reconnect();
  },

  onSettingsChange: (next) => {
    settings = next;
    sandbox.updateSettings(next);
    scheduleRender();
  },

  onReconnect: () => {
    pool.reconnect();
  },

  onPauseToggle: () => {
    if (pool.isPaused) pool.start();
    else pool.pause();
    scheduleRender();
  },

  onFocusNode: (nodeId) => {
    sandbox.highlight([nodeId], "selected in the plugin window");
  },
});

diagnostics.subscribe(() => {
  scheduleRender();
});

view.render(currentState());

// A visible failure beats a window that never fills in. `READY` is the only
// thing this half cannot proceed without, and the sandbox sends it unprompted.
setTimeout(() => {
  if (ready) return;
  diagnostics.error(
    "startup",
    "The plugin sandbox did not report ready. Close and reopen the plugin.",
  );
  scheduleRender();
}, 8000);

window.addEventListener("error", (event: ErrorEvent) => {
  diagnostics.error("ui", errorMessage(event.error ?? event.message));
  scheduleRender();
});

window.addEventListener(
  "unhandledrejection",
  (event: PromiseRejectionEvent) => {
    diagnostics.error("ui", errorMessage(event.reason));
    scheduleRender();
  },
);
