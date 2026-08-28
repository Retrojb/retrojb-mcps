import { Diagnostics, errorMessage } from "@retrojb/plugin-kit";
import {
  DEFAULT_SETTINGS,
  type BridgeSettings,
  type SandboxToUi,
  type SelectionNodeDetail,
} from "../shared/bridge-messages.js";
import {
  PLUGIN_VERSION,
  type FileInfo,
  type HarnessCommand,
} from "../shared/protocol.js";
import { HarnessPool } from "./harness-pool.js";
import { SandboxClient } from "./sandbox-client.js";
import { View, type TabId, type ViewState } from "./view.js";

/**
 * UI entry point.
 *
 * This context owns the network. The sandbox owns the `figma` API. Every harness
 * command lands here, gets relayed to the sandbox, and its result relayed back
 * out the socket it arrived on.
 */

const diagnostics = new Diagnostics({ capacity: 300 });
const sandbox = new SandboxClient();

/** Node ids a harness command referenced, so the UI can mirror the canvas. */
let highlightedIds: readonly string[] = [];
let highlightReason: string | null = null;

let fileInfo: FileInfo | null = null;
let selection: readonly SelectionNodeDetail[] = [];
let settings: BridgeSettings = DEFAULT_SETTINGS;
let codeExecutionEnabled = true;
let updateAvailable = false;
let activeTab: TabId = "status";
let refreshing = false;

// -----------------------------------------------------------------------------
// Harness pool
// -----------------------------------------------------------------------------

const pool = new HarnessPool({
  diagnostics,
  execute: (command: HarnessCommand) => runHarnessCommand(command),
  fileInfo: () => readFileInfo(),
  onChange: () => {
    scheduleRender();
    sandbox.send({
      kind: "REPORT_STATUS",
      status: pool.status,
      connectedPorts: pool.connectedPorts(),
    });
  },
  onUpdateAvailable: () => {
    updateAvailable = true;
    scheduleRender();
  },
});

/**
 * Relays a harness command to the sandbox.
 *
 * `EXECUTE_CODE` gets a longer ceiling than the default because the harness
 * passes its own timeout through in `params.timeout`, and the relay has to
 * outlast it or the plugin would report a timeout for code the sandbox is still
 * legitimately running.
 */
async function runHarnessCommand(command: HarnessCommand): Promise<unknown> {
  const params = command.params ?? {};

  const inner =
    typeof params.timeout === "number" && params.timeout > 0
      ? params.timeout
      : null;
  const timeoutMs = inner === null ? undefined : inner + 5000;

  diagnostics.debug("command", `${command.method}`, { id: command.id });

  return sandbox.executeCommand(command.method, params, timeoutMs);
}

/** Reads file identity from the sandbox for the `FILE_INFO` handshake. */
async function readFileInfo(): Promise<FileInfo | null> {
  try {
    const result = (await sandbox.requestFileInfo()) as {
      fileInfo?: FileInfo;
    };
    if (result.fileInfo !== undefined) {
      fileInfo = result.fileInfo;
      scheduleRender();
      return result.fileInfo;
    }
    return null;
  } catch (error) {
    diagnostics.error("file-info", errorMessage(error));
    return null;
  }
}

// -----------------------------------------------------------------------------
// Sandbox events
// -----------------------------------------------------------------------------

sandbox.on((event: SandboxToUi) => {
  switch (event.kind) {
    case "READY":
      settings = event.settings;
      fileInfo = event.fileInfo;
      diagnostics.info(
        "plugin",
        `Bridge v${event.pluginVersion} ready in "${event.fileInfo.fileName}"`,
      );
      // Discovery only starts once the sandbox is ready, so the FILE_INFO
      // handshake can be answered the instant a socket opens.
      if (settings.autoConnect) pool.start();
      else diagnostics.info("pool", "Auto-connect is off; press Refresh");
      scheduleRender();
      return;

    case "SELECTION":
      selection = event.detail;
      // Forwarded to every harness so each has current state, which is what
      // makes figma_get_selection work across concurrent instances.
      pool.broadcast({ type: "SELECTION_CHANGE", data: event.selection });
      scheduleRender();
      return;

    case "FILE_INFO":
      fileInfo = event.fileInfo;
      pool.broadcast({ type: "FILE_INFO", data: event.fileInfo });
      scheduleRender();
      return;

    case "PAGE_CHANGE":
      if (fileInfo !== null) {
        fileInfo = {
          ...fileInfo,
          currentPage: event.pageName,
          currentPageId: event.pageId,
        };
      }
      pool.broadcast({
        type: "PAGE_CHANGE",
        data: {
          pageId: event.pageId,
          pageName: event.pageName,
          timestamp: event.timestamp,
        },
      });
      scheduleRender();
      return;

    case "DOCUMENT_CHANGE":
      pool.broadcast({
        type: "DOCUMENT_CHANGE",
        data: {
          hasStyleChanges: event.hasStyleChanges,
          hasNodeChanges: event.hasNodeChanges,
          changedNodeIds: event.changedNodeIds,
          changeCount: event.changeCount,
          timestamp: event.timestamp,
        },
      });
      return;

    case "CONSOLE":
      pool.broadcast({
        type: "CONSOLE_CAPTURE",
        data: {
          timestamp: event.timestamp,
          level: event.level,
          message: event.message,
          args: event.args,
        },
      });
      return;

    case "DIAGNOSTIC":
      diagnostics.record(event.level, event.scope, event.message, event.detail);
      return;

    case "HIGHLIGHT_STATE":
      highlightedIds = event.nodeIds;
      highlightReason = event.reason;
      scheduleRender();
      return;

    default:
      return;
  }
});

// -----------------------------------------------------------------------------
// View
// -----------------------------------------------------------------------------

const root = document.getElementById("app");
if (root === null) throw new Error("Plugin UI root element is missing");

const view = new View(root, {
  onRefresh: () => {
    refreshing = true;
    scheduleRender();

    void pool.refresh().finally(() => {
      refreshing = false;
      scheduleRender();
    });
  },

  onTogglePause: () => {
    if (pool.isPaused) pool.start();
    else pool.pause();
    scheduleRender();
  },

  onSelectTab: (tab) => {
    activeTab = tab;
    scheduleRender();
  },

  onHighlightNode: (nodeId) => {
    sandbox.highlight([nodeId], "Located from plugin");
  },

  onClearHighlight: () => {
    sandbox.clearHighlight();
  },

  onSettingsChange: (partial) => {
    settings = { ...settings, ...partial };
    sandbox.updateSettings(settings);
    scheduleRender();
  },

  onCodeExecutionChange: (enabled) => {
    codeExecutionEnabled = enabled;
    // Session-scoped rather than part of persisted settings, so the permission
    // is never silently re-granted on a later open.
    sandbox.send({ kind: "SET_CODE_EXECUTION", enabled });
    scheduleRender();
  },

  onClearLog: () => {
    diagnostics.clear();
    scheduleRender();
  },
});

diagnostics.subscribe(() => scheduleRender());

/**
 * Coalesces renders into one per frame.
 *
 * A burst of document changes or console lines would otherwise re-render the
 * whole window dozens of times in a few milliseconds.
 */
let renderQueued = false;
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
    paused: pool.isPaused,
    connections: pool.connections(),
    fileInfo,
    selection,
    highlightedIds,
    highlightReason,
    diagnostics: diagnostics.all(),
    settings,
    codeExecutionEnabled,
    pluginVersion: PLUGIN_VERSION,
    updateAvailable,
    activeTab,
    refreshing,
  };
}

// Render immediately so the window is never blank while the sandbox boots.
scheduleRender();
