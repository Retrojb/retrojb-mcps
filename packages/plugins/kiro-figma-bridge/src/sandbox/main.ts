/**
 * Sandbox entry point.
 *
 * Owns the `figma` API and nothing else. It has no network access, so it never
 * sees the bridge server: the UI iframe holds the socket and relays each command
 * here over `postMessage`. This file is that relay's other end, plus the document
 * event subscriptions that let the agent learn about changes it did not cause.
 *
 * Startup order matters and is not arbitrary:
 *
 * 1. Load persisted settings and the pairing code, because the UI cannot start
 *    connecting without them and a second round-trip would delay every launch.
 * 2. Show the UI, so the window appears while the rest of startup happens.
 * 3. Sweep highlight overlays orphaned by a previous session, before the user
 *    sees them.
 * 4. Send `READY`, which is the UI's cue to begin discovery.
 * 5. Only then subscribe to document events, so nothing fires at a UI that has
 *    not finished initialising.
 */

import { Diagnostics, errorMessage } from "@retrojb/plugin-kit";
import {
  createCommandRegistry,
  currentDocumentInfo,
  type CommandHandler,
} from "./commands.js";
import { NodeHighlighter } from "./highlight.js";
import { describeSelection } from "./selection.js";
import {
  DEFAULT_SETTINGS,
  type BridgeSettings,
  type SandboxToUi,
  type StoredCredentials,
  type UiToSandbox,
} from "../shared/bridge-messages.js";
import { PLUGIN_VERSION, type FigmaUserRef } from "../shared/protocol.js";

const SETTINGS_KEY = "kiro-figma-bridge:settings";
const CREDENTIALS_KEY = "kiro-figma-bridge:credentials";

const UI_WIDTH = 400;
const UI_HEIGHT = 640;

/**
 * Node changes coalesced into one event.
 *
 * A drag produces a `nodechange` per frame. Forwarding each one would flood the
 * socket and tell the agent nothing it could not learn from the last one, so
 * changes are batched on a short timer.
 */
const CHANGE_DEBOUNCE_MS = 250;

const highlighter = new NodeHighlighter();

let settings: BridgeSettings = DEFAULT_SETTINGS;
let credentials: StoredCredentials = { pairCode: "" };
let registry: Map<string, CommandHandler>;

/**
 * Whether this editor accepts document writes at all.
 *
 * Dev Mode is inspection-only. Checked once because `editorType` cannot change
 * within a plugin's lifetime — switching modes restarts the plugin.
 */
const canWrite = figma.editorType !== "dev";

/** Sends a frame to the UI. */
function post(message: SandboxToUi): void {
  figma.ui.postMessage(message);
}

/**
 * Diagnostics are mirrored to the UI's activity log rather than kept local.
 *
 * The sandbox has no console anyone will look at, so a warning that stays here is
 * a warning nobody reads. `subscribe` hands over the whole buffer on every write,
 * so the highest id already forwarded is tracked to avoid re-posting history.
 */
const diagnostics = new Diagnostics({ capacity: 100 });

let lastForwardedEntryId = 0;

diagnostics.subscribe((entries) => {
  for (const entry of entries) {
    if (entry.id <= lastForwardedEntryId) continue;
    lastForwardedEntryId = entry.id;
    post({
      kind: "DIAGNOSTIC",
      level: entry.level,
      scope: entry.scope,
      message: entry.message,
    });
  }
});

// -----------------------------------------------------------------------------
// Persistence
// -----------------------------------------------------------------------------

/**
 * Coerces stored settings back into a valid object.
 *
 * Anything in `clientStorage` was written by a previous version of this plugin,
 * so it is untrusted input in the same sense a config file is: a renamed field or
 * a removed option must not leave the plugin holding `undefined` where it expects
 * a number.
 */
function coerceSettings(raw: unknown): BridgeSettings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_SETTINGS;
  const value = raw as Record<string, unknown>;

  const mode = value.highlightMode;
  const duration = value.highlightDurationMs;

  return {
    highlightMode:
      mode === "overlay" || mode === "select" || mode === "off"
        ? mode
        : DEFAULT_SETTINGS.highlightMode,
    highlightDurationMs:
      typeof duration === "number" && duration >= 0 && duration <= 30_000
        ? duration
        : DEFAULT_SETTINGS.highlightDurationMs,
    scrollIntoView:
      typeof value.scrollIntoView === "boolean"
        ? value.scrollIntoView
        : DEFAULT_SETTINGS.scrollIntoView,
    autoConnect:
      typeof value.autoConnect === "boolean"
        ? value.autoConnect
        : DEFAULT_SETTINGS.autoConnect,
    allowWrites:
      typeof value.allowWrites === "boolean"
        ? value.allowWrites
        : DEFAULT_SETTINGS.allowWrites,
  };
}

function coerceCredentials(raw: unknown): StoredCredentials {
  if (typeof raw !== "object" || raw === null) return { pairCode: "" };
  const value = raw as Record<string, unknown>;
  return {
    pairCode: typeof value.pairCode === "string" ? value.pairCode : "",
  };
}

async function loadPersisted(): Promise<void> {
  try {
    // `getAsync` is typed as returning `any`, so both values are pinned to
    // `unknown` here. The coercers below are the only thing that decides what
    // shape they have, which is the point: this data was written by a previous
    // version of the plugin and is untrusted in the same way a config file is.
    const stored: unknown[] = await Promise.all([
      figma.clientStorage.getAsync(SETTINGS_KEY) as Promise<unknown>,
      figma.clientStorage.getAsync(CREDENTIALS_KEY) as Promise<unknown>,
    ]);

    settings = coerceSettings(stored[0]);
    credentials = coerceCredentials(stored[1]);
  } catch (error) {
    // Defaults are a working configuration, so a storage failure degrades to
    // "user retypes the pairing code" rather than a plugin that will not open.
    diagnostics.warn(
      "storage",
      `Could not read saved settings: ${errorMessage(error)}`,
    );
  }
}

async function persistSettings(): Promise<void> {
  try {
    await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
  } catch (error) {
    diagnostics.warn(
      "storage",
      `Could not save settings: ${errorMessage(error)}`,
    );
  }
}

async function persistCredentials(): Promise<void> {
  try {
    await figma.clientStorage.setAsync(CREDENTIALS_KEY, credentials);
  } catch (error) {
    diagnostics.warn(
      "storage",
      `Could not save the pairing code: ${errorMessage(error)}`,
    );
  }
}

// -----------------------------------------------------------------------------
// Identity
// -----------------------------------------------------------------------------

/**
 * The signed-in Figma user, when the manifest permission allows it.
 *
 * Reading `figma.currentUser` without `"permissions": ["currentuser"]` throws
 * rather than returning null, so this is guarded. The server uses the id to check
 * the editor belongs to the same account as the configured access token, and
 * treats a null id as "cannot tell" rather than as a failure.
 */
function currentUser(): FigmaUserRef | null {
  try {
    const user = figma.currentUser;
    if (user === null) return null;
    return { id: user.id, name: user.name };
  } catch (error) {
    diagnostics.warn(
      "identity",
      `Could not read the current Figma user: ${errorMessage(error)}`,
    );
    return null;
  }
}

// -----------------------------------------------------------------------------
// Command dispatch
// -----------------------------------------------------------------------------

async function runCommand(
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const handler = registry.get(method);
  if (handler === undefined) {
    throw new Error(
      `Unknown method "${method}". Implemented: ${[...registry.keys()].sort().join(", ")}`,
    );
  }
  return handler(params);
}

// -----------------------------------------------------------------------------
// Document events
// -----------------------------------------------------------------------------

let pendingChanges = new Set<string>();
let changeTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeNodeChange: (() => void) | null = null;

function flushChanges(): void {
  changeTimer = null;
  if (pendingChanges.size === 0) return;

  const ids = [...pendingChanges];
  pendingChanges = new Set();

  post({
    kind: "DOCUMENT_CHANGE",
    changedNodeIds: ids,
    changeCount: ids.length,
    timestamp: Date.now(),
  });
}

/**
 * Watches the open page for node changes.
 *
 * Page-scoped rather than document-scoped on purpose: the `documentchange` event
 * requires `loadAllPagesAsync()` under dynamic-page access, which is the slow path
 * this plugin avoids unless the agent explicitly asks for document-wide scope.
 * Re-bound on page change, because the subscription belongs to a specific page.
 */
function watchCurrentPage(): void {
  unsubscribeNodeChange?.();

  const page = figma.currentPage;
  const handler = (event: NodeChangeEvent) => {
    for (const change of event.nodeChanges) {
      // The plugin's own overlays would otherwise report as document activity
      // and the agent would chase changes it caused itself.
      if (change.node.removed) {
        pendingChanges.add(change.node.id);
        continue;
      }
      if (change.node.name.startsWith("[kiro-bridge-highlight]")) continue;
      pendingChanges.add(change.node.id);
    }

    if (changeTimer === null) {
      changeTimer = setTimeout(flushChanges, CHANGE_DEBOUNCE_MS);
    }
  };

  page.on("nodechange", handler);
  unsubscribeNodeChange = () => {
    page.off("nodechange", handler);
  };
}

async function pushSelection(): Promise<void> {
  try {
    post({
      kind: "SELECTION",
      selection: await describeSelection(figma.currentPage.selection),
    });
  } catch (error) {
    diagnostics.warn(
      "selection",
      `Could not read the selection: ${errorMessage(error)}`,
    );
  }
}

// -----------------------------------------------------------------------------
// Message handling
// -----------------------------------------------------------------------------

function handleMessage(message: UiToSandbox): void {
  switch (message.kind) {
    case "EXECUTE_COMMAND": {
      const { requestId, method, params } = message;
      void runCommand(method, params).then(
        (result) => {
          post({ kind: "COMMAND_RESULT", requestId, ok: true, result });
        },
        (error: unknown) => {
          post({
            kind: "COMMAND_RESULT",
            requestId,
            ok: false,
            error: errorMessage(error),
          });
        },
      );
      return;
    }

    case "REQUEST_DOCUMENT_INFO": {
      const { requestId } = message;
      try {
        post({
          kind: "COMMAND_RESULT",
          requestId,
          ok: true,
          result: currentDocumentInfo(),
        });
      } catch (error) {
        post({
          kind: "COMMAND_RESULT",
          requestId,
          ok: false,
          error: errorMessage(error),
        });
      }
      return;
    }

    case "REQUEST_SELECTION": {
      const { requestId } = message;
      void describeSelection(figma.currentPage.selection).then(
        (selection) => {
          post({
            kind: "COMMAND_RESULT",
            requestId,
            ok: true,
            result: selection,
          });
        },
        (error: unknown) => {
          post({
            kind: "COMMAND_RESULT",
            requestId,
            ok: false,
            error: errorMessage(error),
          });
        },
      );
      return;
    }

    case "HIGHLIGHT_NODES": {
      void highlighter
        .highlight(message.nodeIds, {
          mode: settings.highlightMode,
          durationMs: settings.highlightDurationMs,
          scrollIntoView: settings.scrollIntoView,
        })
        .then((outcome) => {
          post({
            kind: "HIGHLIGHT_STATE",
            nodeIds: outcome.highlighted,
            reason: message.reason,
          });
        })
        .catch((error: unknown) => {
          diagnostics.warn("highlight", errorMessage(error));
        });
      return;
    }

    case "CLEAR_HIGHLIGHT": {
      highlighter.clear();
      post({ kind: "HIGHLIGHT_STATE", nodeIds: [], reason: null });
      return;
    }

    case "UPDATE_SETTINGS": {
      settings = coerceSettings(message.settings);
      void persistSettings();
      return;
    }

    case "STORE_CREDENTIALS": {
      credentials = coerceCredentials(message.credentials);
      void persistCredentials();
      return;
    }

    case "REPORT_STATUS": {
      const where = message.port === null ? "" : ` on port ${message.port}`;
      const who = message.owner === null ? "" : ` as @${message.owner.handle}`;
      diagnostics.info("bridge", `${message.status}${where}${who}`);

      if (message.userMatch === "mismatch") {
        diagnostics.warn(
          "bridge",
          "The bridge server's Figma account is not the account signed in here.",
        );
      }
      return;
    }

    case "RESIZE_UI": {
      figma.ui.resize(
        Math.max(320, Math.min(message.width, 900)),
        Math.max(320, Math.min(message.height, 1000)),
      );
      return;
    }

    case "CLOSE_PLUGIN": {
      figma.closePlugin();
      return;
    }
  }
}

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  await loadPersisted();

  registry = createCommandRegistry({
    highlighter,
    settings: () => settings,
    canWrite: () => canWrite,
  });

  figma.showUI(__html__, {
    width: UI_WIDTH,
    height: UI_HEIGHT,
    title: "Kiro Figma Bridge",
    themeColors: true,
  });

  const swept = highlighter.sweepOrphans();
  if (swept > 0) {
    diagnostics.info(
      "highlight",
      `Removed ${swept} leftover highlight overlays`,
    );
  }

  post({
    kind: "READY",
    settings,
    credentials,
    document: currentDocumentInfo(),
    figmaUser: currentUser(),
    pluginVersion: PLUGIN_VERSION,
    canWrite,
  });

  figma.ui.onmessage = (raw: unknown) => {
    // Frames come from this plugin's own iframe, but the handler still validates
    // rather than trusting the shape: a version mismatch between a cached UI
    // bundle and this sandbox is a real scenario after an update.
    if (typeof raw !== "object" || raw === null) return;
    if (typeof (raw as { kind?: unknown }).kind !== "string") return;
    handleMessage(raw as UiToSandbox);
  };

  void pushSelection();

  figma.on("selectionchange", () => {
    void pushSelection();
  });

  figma.on("currentpagechange", () => {
    highlighter.clear();
    watchCurrentPage();

    post({
      kind: "PAGE_CHANGE",
      pageId: figma.currentPage.id,
      pageName: figma.currentPage.name,
      timestamp: Date.now(),
    });
    post({ kind: "DOCUMENT_INFO", document: currentDocumentInfo() });
    void pushSelection();
  });

  figma.on("close", () => {
    unsubscribeNodeChange?.();
    if (changeTimer !== null) clearTimeout(changeTimer);
    highlighter.clear();
  });

  watchCurrentPage();
}

void main().catch((error: unknown) => {
  // Nothing above can recover from a failure here, and a plugin window that
  // silently does nothing is the worst outcome. Say why and close.
  figma.notify(`Kiro Figma Bridge could not start: ${errorMessage(error)}`, {
    error: true,
  });
});
