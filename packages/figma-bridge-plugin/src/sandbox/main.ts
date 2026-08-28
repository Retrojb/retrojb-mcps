import {
  DEFAULT_SETTINGS,
  type BridgeSettings,
  type SandboxToUi,
  type UiToSandbox,
} from "../shared/bridge-messages.js";
import { PLUGIN_VERSION } from "../shared/protocol.js";
import { ChangeMonitor } from "./change-monitor.js";
import { createCommandRegistry, currentFileInfo } from "./commands.js";
import { NodeHighlighter } from "./highlight.js";
import {
  describeSelection,
  serializeSelectionForHarness,
} from "./selection.js";

/**
 * Sandbox entry point.
 *
 * Owns the `figma` API and nothing else. Every byte that goes to or from the
 * harness travels through the UI iframe, because this context has no network
 * access at all.
 */

const SETTINGS_KEY = "retro-mcp-bridge:settings";
const UI_WIDTH = 380;
const UI_HEIGHT = 620;

let settings: BridgeSettings = DEFAULT_SETTINGS;
/**
 * Whether `EXECUTE_CODE` is allowed.
 *
 * Held here rather than in {@link BridgeSettings} so it always starts enabled
 * for the current session and is never persisted — a permission this broad
 * should not be silently inherited from a previous session.
 */
let codeExecutionEnabled = true;

function post(message: SandboxToUi): void {
  figma.ui.postMessage(message);
}

function report(
  level: "debug" | "info" | "warn" | "error",
  scope: string,
  message: string,
  detail?: unknown,
): void {
  post({
    kind: "DIAGNOSTIC",
    level,
    scope,
    message,
    ...(detail === undefined ? {} : { detail }),
  });
}

const highlighter = new NodeHighlighter(
  {
    mode: settings.highlightMode,
    durationMs: settings.highlightDurationMs,
    scrollIntoView: settings.scrollIntoView,
  },
  (nodeIds, reason) => {
    post({ kind: "HIGHLIGHT_STATE", nodeIds, reason });
  },
);

/**
 * Highlights the nodes a harness command referenced.
 *
 * This is what makes the plugin's activity legible: when an agent renames or
 * moves something, the human watching Figma sees which node it was. Fired
 * without awaiting so highlighting never delays the command's reply.
 */
function noteReferencedNodes(nodeIds: readonly string[], reason: string): void {
  report("info", "reference", `${reason} → ${nodeIds.length} node(s)`, {
    nodeIds,
  });

  void highlighter.highlight(nodeIds, reason).then((outcome) => {
    if (outcome.missing.length > 0) {
      report(
        "warn",
        "highlight",
        `${outcome.missing.length} referenced node(s) no longer exist`,
        { missing: outcome.missing },
      );
    }
    if (outcome.offPage.length > 0) {
      report(
        "info",
        "highlight",
        `${outcome.offPage.length} referenced node(s) are on another page`,
        { offPage: outcome.offPage },
      );
    }
  });
}

const commands = createCommandRegistry({
  highlighter,
  isCodeExecutionEnabled: () => codeExecutionEnabled,
  noteReferencedNodes,
});

// -----------------------------------------------------------------------------
// Selection and document tracking
// -----------------------------------------------------------------------------

async function pushSelection(): Promise<void> {
  const selection = figma.currentPage.selection;
  try {
    post({
      kind: "SELECTION",
      selection: serializeSelectionForHarness(selection),
      detail: await describeSelection(selection),
    });
  } catch (error) {
    report("error", "selection", "Failed to describe selection", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

figma.on("selectionchange", () => {
  void pushSelection();
});

figma.on("currentpagechange", () => {
  post({
    kind: "PAGE_CHANGE",
    pageId: figma.currentPage.id,
    pageName: figma.currentPage.name,
    timestamp: Date.now(),
  });
  // Overlays live on a specific page; leaving them behind would strand them.
  highlighter.clear();
  // `nodechange` is bound to a PageNode, so the subscription has to follow the
  // user or monitoring goes quiet without reporting a problem.
  changeMonitor.retarget();
  void pushSelection();
});

/**
 * Document change monitoring.
 *
 * Registered in {@link start} rather than here, and this is the whole reason:
 * under `documentAccess: "dynamic-page"` the `documentchange` event throws unless
 * `figma.loadAllPagesAsync()` has already run, and a top-level registration runs
 * before anything has had a chance to await that. Figma's recommendation is to
 * prefer the granular `nodechange`/`stylechange` events and skip the full load
 * entirely, which is what {@link ChangeMonitor} defaults to.
 */
const changeMonitor = new ChangeMonitor({
  isOverlayId: (id) => highlighter.overlayIds.includes(id),
  emit: (payload) => {
    post({ kind: "DOCUMENT_CHANGE", ...payload });
  },
  report,
});

// -----------------------------------------------------------------------------
// Console capture
// -----------------------------------------------------------------------------

/**
 * Mirrors sandbox console output to the UI, which forwards it to the harness.
 *
 * The harness exposes plugin console logs as a debugging tool, and this is the
 * only place they exist — Figma's plugin console is a separate devtools window.
 *
 * Wraps rather than replaces, so logs still reach that window for anyone who has
 * it open.
 */
function installConsoleCapture(): void {
  // Only the four levels Figma's sandbox console actually declares. `debug` is
  // absent there, so wrapping it would install a method nothing calls.
  const levels = ["log", "info", "warn", "error"] as const;

  for (const level of levels) {
    const original = console[level] as (...args: unknown[]) => void;

    console[level] = (...args: unknown[]): void => {
      original.apply(console, args);

      try {
        post({
          kind: "CONSOLE",
          level,
          message: args
            .map((arg) => (typeof arg === "string" ? arg : safeStringify(arg)))
            .join(" ")
            .slice(0, 1000),
          args: args.slice(0, 10).map((arg) => safeStringify(arg)),
          timestamp: Date.now(),
        });
      } catch {
        // Never let capture failure break the log call it wrapped.
      }
    };
  }
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

async function loadSettings(): Promise<BridgeSettings> {
  try {
    const stored = await figma.clientStorage.getAsync(SETTINGS_KEY);
    if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;

    const candidate = stored as Partial<BridgeSettings>;
    return {
      highlightMode:
        candidate.highlightMode === "overlay" ||
        candidate.highlightMode === "select" ||
        candidate.highlightMode === "off"
          ? candidate.highlightMode
          : DEFAULT_SETTINGS.highlightMode,
      highlightDurationMs:
        typeof candidate.highlightDurationMs === "number" &&
        candidate.highlightDurationMs >= 0
          ? candidate.highlightDurationMs
          : DEFAULT_SETTINGS.highlightDurationMs,
      scrollIntoView:
        typeof candidate.scrollIntoView === "boolean"
          ? candidate.scrollIntoView
          : DEFAULT_SETTINGS.scrollIntoView,
      autoConnect:
        typeof candidate.autoConnect === "boolean"
          ? candidate.autoConnect
          : DEFAULT_SETTINGS.autoConnect,
      monitorMode:
        candidate.monitorMode === "current-page" ||
        candidate.monitorMode === "full-document"
          ? candidate.monitorMode
          : DEFAULT_SETTINGS.monitorMode,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applySettings(next: BridgeSettings): void {
  const previousMonitorMode = settings.monitorMode;
  settings = next;

  highlighter.setOptions({
    mode: next.highlightMode,
    durationMs: next.highlightDurationMs,
    scrollIntoView: next.scrollIntoView,
  });

  // Only re-subscribe when the scope actually changed: switching to
  // `full-document` triggers a full-document load, which is far too expensive to
  // run on an unrelated settings edit.
  if (next.monitorMode !== previousMonitorMode) {
    void changeMonitor.enable(next.monitorMode);
  }

  void figma.clientStorage.setAsync(SETTINGS_KEY, next).catch(() => {
    report("warn", "settings", "Could not persist settings");
  });
}

// -----------------------------------------------------------------------------
// UI message handling
// -----------------------------------------------------------------------------

figma.ui.onmessage = (raw: unknown): void => {
  const message = raw as UiToSandbox;
  if (typeof message !== "object" || message === null) return;

  switch (message.kind) {
    case "EXECUTE_COMMAND":
      void runCommand(message.requestId, message.method, message.params);
      return;

    case "REQUEST_FILE_INFO":
      post({
        kind: "COMMAND_RESULT",
        requestId: message.requestId,
        ok: true,
        result: { fileInfo: currentFileInfo() },
      });
      return;

    case "REQUEST_SELECTION":
      void (async () => {
        const selection = figma.currentPage.selection;
        post({
          kind: "COMMAND_RESULT",
          requestId: message.requestId,
          ok: true,
          result: {
            selection: serializeSelectionForHarness(selection),
            detail: await describeSelection(selection),
          },
        });
      })();
      return;

    case "HIGHLIGHT_NODES":
      noteReferencedNodes(message.nodeIds, message.reason);
      return;

    case "CLEAR_HIGHLIGHT":
      highlighter.clear();
      return;

    case "UPDATE_SETTINGS":
      applySettings(message.settings);
      return;

    case "SET_CODE_EXECUTION":
      codeExecutionEnabled = message.enabled;
      report(
        "info",
        "security",
        message.enabled
          ? "EXECUTE_CODE enabled for this session"
          : "EXECUTE_CODE disabled",
      );
      return;

    case "REPORT_STATUS":
      report(
        "debug",
        "status",
        `${message.status}${
          message.connectedPorts.length > 0
            ? ` on ${message.connectedPorts.join(", ")}`
            : ""
        }`,
      );
      return;

    case "RESIZE_UI":
      figma.ui.resize(
        Math.max(300, Math.round(message.width)),
        Math.max(320, Math.round(message.height)),
      );
      return;

    case "CLOSE_PLUGIN":
      highlighter.clear();
      figma.closePlugin();
      return;

    default:
      return;
  }
};

async function runCommand(
  requestId: string,
  method: string,
  params: Record<string, unknown>,
): Promise<void> {
  const handler = commands.get(method);

  if (handler === undefined) {
    post({
      kind: "COMMAND_RESULT",
      requestId,
      ok: false,
      error: `Unknown method: ${method}. This bridge implements: ${[...commands.keys()].sort().join(", ")}`,
    });
    return;
  }

  try {
    const result = await handler(params);
    post({ kind: "COMMAND_RESULT", requestId, ok: true, result });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    report("error", `command:${method}`, detail);
    post({ kind: "COMMAND_RESULT", requestId, ok: false, error: detail });
  }
}

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

figma.on("close", () => {
  // The last chance to take overlays out of the user's document. Skipping this
  // leaves a stray locked rectangle behind with no plugin running to explain it.
  highlighter.clear();
  changeMonitor.disable();
});

async function start(): Promise<void> {
  installConsoleCapture();

  settings = await loadSettings();
  highlighter.setOptions({
    mode: settings.highlightMode,
    durationMs: settings.highlightDurationMs,
    scrollIntoView: settings.scrollIntoView,
  });

  figma.showUI(__html__, {
    width: UI_WIDTH,
    height: UI_HEIGHT,
    title: "Retro MCP Bridge",
  });

  const swept = await highlighter.sweepOrphans();
  if (swept > 0) {
    report(
      "info",
      "highlight",
      `Removed ${swept} highlight overlay(s) left by a previous session`,
    );
  }

  // Sent before monitoring is established so the window paints immediately.
  // `full-document` mode can take tens of seconds on a large file, and blocking
  // READY on it would look like the plugin had hung.
  post({
    kind: "READY",
    settings,
    fileInfo: currentFileInfo(),
    pluginVersion: PLUGIN_VERSION,
  });

  await pushSelection();

  try {
    await changeMonitor.enable(settings.monitorMode);
  } catch (error) {
    // Monitoring is one feature among several. Losing it must not take down
    // selection reporting, highlighting, or command handling.
    report(
      "error",
      "changes",
      `Change monitoring unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

void start();
