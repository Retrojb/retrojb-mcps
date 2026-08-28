import type { ConnectionStatus, DiagnosticEntry } from "@retrojb/plugin-kit";
import type {
  BridgeSettings,
  SelectionNodeDetail,
} from "../shared/bridge-messages.js";
import type { FileInfo } from "../shared/protocol.js";
import type { HarnessConnection } from "./harness-pool.js";

export interface ViewState {
  readonly status: ConnectionStatus;
  readonly paused: boolean;
  readonly connections: readonly HarnessConnection[];
  readonly fileInfo: FileInfo | null;
  readonly selection: readonly SelectionNodeDetail[];
  readonly highlightedIds: readonly string[];
  readonly highlightReason: string | null;
  readonly diagnostics: readonly DiagnosticEntry[];
  readonly settings: BridgeSettings;
  readonly codeExecutionEnabled: boolean;
  readonly pluginVersion: string;
  readonly updateAvailable: boolean;
  readonly activeTab: TabId;
  readonly refreshing: boolean;
}

export type TabId = "status" | "selection" | "activity" | "settings";

export interface ViewCallbacks {
  readonly onRefresh: () => void;
  readonly onTogglePause: () => void;
  readonly onSelectTab: (tab: TabId) => void;
  readonly onHighlightNode: (nodeId: string) => void;
  readonly onClearHighlight: () => void;
  readonly onSettingsChange: (settings: Partial<BridgeSettings>) => void;
  readonly onCodeExecutionChange: (enabled: boolean) => void;
  readonly onClearLog: () => void;
}

/** Human-readable headline for each connection status. */
const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle: "Idle",
  searching: "Looking for a harness",
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  paused: "Paused",
  error: "Connection problem",
};

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "selection", label: "Selection" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" },
];

/**
 * Renders the plugin window.
 *
 * Full re-render on every state change rather than incremental patching. The
 * whole surface is a few dozen nodes and updates are driven by discrete events,
 * so a diffing layer would add machinery without buying anything measurable.
 *
 * Focus is preserved across renders by id, because a re-render triggered by a
 * background event (a selection change, a log line) must not eject the user from
 * the control they are using.
 */
export class View {
  private readonly root: HTMLElement;
  private readonly callbacks: ViewCallbacks;

  constructor(root: HTMLElement, callbacks: ViewCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
  }

  render(state: ViewState): void {
    const activeId =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.id
        : null;

    this.root.replaceChildren(
      this.header(state),
      this.tabs(state),
      this.panel(state),
      this.footer(state),
    );

    if (activeId !== null && activeId !== "") {
      const restored = document.getElementById(activeId);
      if (restored !== null) restored.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  private header(state: ViewState): HTMLElement {
    const header = el("header", "header");

    const block = el("div", "statusBlock");

    const line = el("div", "statusLine");
    const dot = el("span", "dot");
    dot.dataset.status = state.status;
    dot.setAttribute("aria-hidden", "true");
    line.append(dot, text(STATUS_LABEL[state.status]));

    /*
     * The status is a live region so a screen reader announces transitions
     * without the user having to go looking. `polite` rather than `assertive`:
     * connection churn should not interrupt whatever is being read.
     */
    const detail = el("div", "statusDetail");
    detail.setAttribute("role", "status");
    detail.setAttribute("aria-live", "polite");
    detail.textContent = this.statusDetail(state);

    block.append(line, detail);

    const actions = el("div", "headerActions");

    const refresh = button(
      state.refreshing ? "Refreshing…" : "Refresh",
      "primary",
      this.callbacks.onRefresh,
    );
    refresh.id = "btn-refresh";
    refresh.disabled = state.refreshing;
    refresh.title =
      "Drop every harness connection and rediscover from scratch (ports 9223-9232)";

    const pause = button(
      state.paused ? "Resume" : "Pause",
      "",
      this.callbacks.onTogglePause,
    );
    pause.id = "btn-pause";
    pause.title = state.paused
      ? "Resume discovery and reconnect"
      : "Disconnect and stop searching";

    actions.append(refresh, pause);
    header.append(block, actions);

    return header;
  }

  private statusDetail(state: ViewState): string {
    if (state.paused) return "Discovery stopped. Press Resume to reconnect.";

    const live = state.connections.filter(
      (connection) => connection.status === "connected",
    );

    if (live.length > 0) {
      const ports = live.map((connection) => connection.port).join(", ");
      const commands = live.reduce(
        (total, connection) => total + connection.commandCount,
        0,
      );
      return `${live.length} harness${live.length === 1 ? "" : "es"} on ${ports} · ${commands} command${commands === 1 ? "" : "s"} served`;
    }

    if (state.status === "error") {
      const failed = state.connections.find(
        (connection) => connection.lastError !== null,
      );
      return failed?.lastError ?? "Could not reach a harness.";
    }

    return "Scanning localhost ports 9223-9232 every few seconds.";
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  private tabs(state: ViewState): HTMLElement {
    const list = el("div", "tabs");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Bridge sections");

    for (const tab of TABS) {
      const isActive = state.activeTab === tab.id;
      const control = el("button", "tab");
      control.id = `tab-${tab.id}`;
      control.type = "button";
      control.setAttribute("role", "tab");
      control.setAttribute("aria-selected", String(isActive));
      control.setAttribute("aria-controls", "panel");

      let label = tab.label;
      if (tab.id === "selection" && state.selection.length > 0) {
        label = `${tab.label} (${state.selection.length})`;
      }
      if (tab.id === "activity") {
        const errors = state.diagnostics.filter(
          (entry) => entry.level === "error",
        ).length;
        if (errors > 0) label = `${tab.label} (${errors})`;
      }

      control.textContent = label;
      control.addEventListener("click", () =>
        this.callbacks.onSelectTab(tab.id),
      );
      list.append(control);
    }

    return list;
  }

  // ---------------------------------------------------------------------------
  // Panels
  // ---------------------------------------------------------------------------

  private panel(state: ViewState): HTMLElement {
    const panel = el("div", "panel");
    panel.id = "panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `tab-${state.activeTab}`);

    switch (state.activeTab) {
      case "status":
        panel.append(...this.statusPanel(state));
        break;
      case "selection":
        panel.append(...this.selectionPanel(state));
        break;
      case "activity":
        panel.append(...this.activityPanel(state));
        break;
      case "settings":
        panel.append(...this.settingsPanel(state));
        break;
    }

    return panel;
  }

  private statusPanel(state: ViewState): HTMLElement[] {
    const sections: HTMLElement[] = [];

    if (state.updateAvailable) {
      const box = el("div", "warnBox");
      box.append(
        strong("Version mismatch"),
        para(
          "A connected harness ships a different bridge build than this one. Command coverage may differ. Re-import the manifest if you meant to use the harness's own bridge.",
        ),
      );
      sections.push(box);
    }

    const connections = el("section", "section");
    connections.append(title("Harness connections"));

    if (state.connections.length === 0) {
      connections.append(
        emptyState(
          state.paused
            ? "Paused."
            : "No harness found yet. Start the Figma Console MCP server; this window attaches automatically.",
        ),
      );
    } else {
      const list = el("ul", "connList");
      for (const connection of state.connections) {
        list.append(this.connectionRow(connection));
      }
      connections.append(list);
    }
    sections.push(connections);

    const file = el("section", "section");
    file.append(title("This file"));
    if (state.fileInfo === null) {
      file.append(emptyState("Reading file info…"));
    } else {
      file.append(
        definitions([
          ["Name", state.fileInfo.fileName],
          ["Page", state.fileInfo.currentPage],
          ["Editor", state.fileInfo.editorType],
          [
            "File key",
            state.fileInfo.fileKey ??
              "unavailable — harness cannot route by file",
          ],
        ]),
      );
    }
    sections.push(file);

    return sections;
  }

  private connectionRow(connection: HarnessConnection): HTMLElement {
    const item = el("li", "conn");

    const port = el("span", "connPort");
    port.textContent = String(connection.port);

    const status = el("span", "");
    status.textContent = connection.status;

    const meta = el("span", "connMeta");
    const bits: string[] = [];
    if (connection.serverVersion !== null)
      bits.push(`v${connection.serverVersion}`);
    if (connection.pid !== null) bits.push(`pid ${connection.pid}`);
    if (connection.commandCount > 0)
      bits.push(`${connection.commandCount} cmd`);
    meta.textContent = bits.join(" · ");

    item.append(port, status, meta);

    if (connection.lastError !== null && connection.status !== "connected") {
      const error = el("div", "hint");
      error.textContent = connection.lastError;
      item.append(error);
    }

    return item;
  }

  private selectionPanel(state: ViewState): HTMLElement[] {
    const section = el("section", "section");

    const heading = el("div", "field");
    heading.append(title("Current selection"));
    if (state.highlightedIds.length > 0) {
      const clear = button(
        "Clear highlight",
        "ghost",
        this.callbacks.onClearHighlight,
      );
      clear.id = "btn-clear-highlight";
      heading.append(clear);
    }
    section.append(heading);

    if (state.highlightReason !== null && state.highlightedIds.length > 0) {
      const note = el("div", "hint");
      note.textContent = `Highlighting ${state.highlightedIds.length} node(s) · ${state.highlightReason}`;
      section.append(note);
    }

    if (state.selection.length === 0) {
      section.append(
        emptyState(
          "Nothing selected. Pick a layer on the canvas to inspect it.",
        ),
      );
      return [section];
    }

    const list = el("ul", "nodeList");
    for (const node of state.selection) {
      list.append(this.nodeRow(node, state.highlightedIds.includes(node.id)));
    }
    section.append(list);

    return [section];
  }

  private nodeRow(
    node: SelectionNodeDetail,
    highlighted: boolean,
  ): HTMLElement {
    const item = el("li", "node");
    item.dataset.highlighted = String(highlighted);

    const head = el("div", "nodeHead");

    const badge = el("span", "badge");
    badge.textContent = node.type;

    const name = el("span", "nodeName");
    name.textContent = node.name;
    name.title = node.name;

    const locate = button("Locate", "ghost", () =>
      this.callbacks.onHighlightNode(node.id),
    );
    locate.id = `btn-locate-${node.id}`;
    locate.style.marginLeft = "auto";
    // Names repeat constantly in Figma, so the visible label alone would give a
    // screen reader user several identical "Locate" buttons (WCAG 2.4.6).
    locate.setAttribute("aria-label", `Locate ${node.name} on the canvas`);
    locate.title = "Highlight this node on the canvas and scroll it into view";

    head.append(badge, name, locate);
    item.append(head);

    if (node.path.length > 0) {
      const path = el("div", "nodePath");
      path.textContent = node.path.join(" › ");
      item.append(path);
    }

    const rows: [string, string][] = [
      ["Size", formatSize(node.width, node.height)],
      ["Position", formatPoint(node.x, node.y)],
      ["ID", node.id],
    ];
    if (node.mainComponent !== null) {
      rows.push(["Component", node.mainComponent]);
    }
    if (node.childCount !== null) {
      rows.push(["Children", String(node.childCount)]);
    }
    const flags = [
      node.visible ? null : "hidden",
      node.locked ? "locked" : null,
    ].filter((flag): flag is string => flag !== null);
    if (flags.length > 0) rows.push(["Flags", flags.join(", ")]);

    const body = definitions(rows);
    body.className = "nodeBody";
    item.append(body);

    return item;
  }

  private activityPanel(state: ViewState): HTMLElement[] {
    const section = el("section", "section");

    const heading = el("div", "field");
    heading.append(title("Activity and errors"));
    const clear = button("Clear", "ghost", this.callbacks.onClearLog);
    clear.id = "btn-clear-log";
    heading.append(clear);
    section.append(heading);

    if (state.diagnostics.length === 0) {
      section.append(emptyState("Nothing logged yet."));
      return [section];
    }

    // Newest first, via `flex-direction: column-reverse` on `.log`, so the most
    // recent entry is visible without scrolling.
    const list = el("ul", "log");
    for (const entry of state.diagnostics.slice(-150)) {
      list.append(logRow(entry));
    }
    section.append(list);

    return [section];
  }

  private settingsPanel(state: ViewState): HTMLElement[] {
    const sections: HTMLElement[] = [];

    const highlight = el("section", "section");
    highlight.append(title("Node highlighting"));

    const mode = selectField(
      "setting-highlight-mode",
      "How to indicate a referenced node",
      [
        { value: "overlay", label: "Outline overlay" },
        { value: "select", label: "Select the node" },
        { value: "off", label: "Off" },
      ],
      state.settings.highlightMode,
      (value) => {
        this.callbacks.onSettingsChange({
          highlightMode: value as BridgeSettings["highlightMode"],
        });
      },
    );
    highlight.append(mode);
    highlight.append(
      hint(
        state.settings.highlightMode === "select"
          ? "Selecting replaces whatever you had selected, and the Selection tab will follow the agent rather than you."
          : "Draws a temporary dashed outline around the node. Leaves your selection alone, but does add an undo step.",
      ),
    );

    highlight.append(
      numberField(
        "setting-highlight-duration",
        "Outline duration (ms)",
        state.settings.highlightDurationMs,
        0,
        20_000,
        (value) => {
          this.callbacks.onSettingsChange({ highlightDurationMs: value });
        },
      ),
    );

    highlight.append(
      checkboxField(
        "setting-scroll",
        "Scroll referenced nodes into view",
        state.settings.scrollIntoView,
        (checked) => {
          this.callbacks.onSettingsChange({ scrollIntoView: checked });
        },
      ),
    );
    sections.push(highlight);

    const monitoring = el("section", "section");
    monitoring.append(title("Change monitoring"));
    monitoring.append(
      selectField(
        "setting-monitor-mode",
        "What to watch for edits",
        [
          { value: "current-page", label: "Current page" },
          { value: "full-document", label: "Every page" },
        ],
        state.settings.monitorMode,
        (value) => {
          this.callbacks.onSettingsChange({
            monitorMode: value as BridgeSettings["monitorMode"],
          });
        },
      ),
    );
    monitoring.append(
      hint(
        state.settings.monitorMode === "full-document"
          ? "Reports edits on every page. Requires loading the whole document, which Figma warns can take tens of seconds on a large file and can hit a memory limit."
          : "Reports edits on the page you are viewing, plus style changes anywhere. Costs nothing to start. Edits made on other pages are not reported.",
      ),
    );
    sections.push(monitoring);

    const security = el("section", "section");
    security.append(title("Security"));
    security.append(
      checkboxField(
        "setting-code-exec",
        "Allow EXECUTE_CODE",
        state.codeExecutionEnabled,
        (checked) => {
          this.callbacks.onCodeExecutionChange(checked);
        },
      ),
    );

    const box = el("div", "warnBox");
    box.append(
      strong("EXECUTE_CODE runs arbitrary code in this document"),
      para(
        "The harness uses it for most of its write tools, so turning it off will break them. Any process on this machine that can reach ports 9223-9232 can send it. Leave it off when you are not actively using an agent.",
      ),
    );
    security.append(box);
    sections.push(security);

    return sections;
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  private footer(state: ViewState): HTMLElement {
    const footer = el("footer", "footer");

    const version = el("span", "");
    version.textContent = `Bridge v${state.pluginVersion}`;

    const spacer = el("span", "footerSpacer");

    const counts = el("span", "");
    const errors = state.diagnostics.filter(
      (entry) => entry.level === "error",
    ).length;
    const warnings = state.diagnostics.filter(
      (entry) => entry.level === "warn",
    ).length;
    counts.textContent =
      errors + warnings === 0
        ? "No problems"
        : `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`;

    footer.append(version, spacer, counts);
    return footer;
  }
}

// -----------------------------------------------------------------------------
// DOM helpers
// -----------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== "") node.className = className;
  return node;
}

function text(value: string): Text {
  return document.createTextNode(value);
}

function button(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  if (className !== "") node.className = className;
  node.textContent = label;
  node.addEventListener("click", onClick);
  return node;
}

function title(value: string): HTMLElement {
  const node = el("h2", "sectionTitle");
  node.textContent = value;
  return node;
}

function strong(value: string): HTMLElement {
  const node = document.createElement("strong");
  node.textContent = value;
  node.style.display = "block";
  return node;
}

function para(value: string): HTMLElement {
  const node = el("p", "hint");
  node.textContent = value;
  return node;
}

function hint(value: string): HTMLElement {
  const node = el("p", "hint");
  node.textContent = value;
  return node;
}

function emptyState(value: string): HTMLElement {
  const node = el("p", "empty");
  node.textContent = value;
  return node;
}

function definitions(rows: readonly [string, string][]): HTMLElement {
  const list = el("dl", "nodeBody");
  for (const [key, value] of rows) {
    const term = document.createElement("dt");
    term.textContent = key;
    const detail = document.createElement("dd");
    detail.textContent = value;
    list.append(term, detail);
  }
  return list;
}

function logRow(entry: DiagnosticEntry): HTMLElement {
  const row = el("li", "logRow");
  row.dataset.level = entry.level;

  const time = el("span", "logTime");
  time.textContent = new Date(entry.timestamp).toLocaleTimeString(undefined, {
    hour12: false,
  });

  const body = el("span", "");
  const scope = el("span", "logScope");
  scope.textContent = `${entry.scope} `;
  body.append(scope, text(entry.message));

  // The level is in a data attribute for styling, so it also needs to be
  // readable as text rather than inferred from colour (WCAG 1.4.1).
  if (entry.level === "warn" || entry.level === "error") {
    const label = el("span", "visuallyHidden");
    label.textContent = ` (${entry.level})`;
    body.append(label);
  }

  row.append(time, body);
  return row;
}

function checkboxField(
  id: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLElement {
  const field = el("div", "field");

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));

  const text_ = document.createElement("label");
  text_.htmlFor = id;
  text_.textContent = label;

  field.append(input, text_);
  return field;
}

function numberField(
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  onChange: (value: number) => void,
): HTMLElement {
  const field = el("div", "field");

  const text_ = document.createElement("label");
  text_.htmlFor = id;
  text_.textContent = label;

  const input = document.createElement("input");
  input.type = "number";
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = "100";
  input.value = String(value);
  input.addEventListener("change", () => {
    const parsed = Number.parseInt(input.value, 10);
    if (Number.isFinite(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  });

  field.append(text_, input);
  return field;
}

function selectField(
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
  value: string,
  onChange: (value: string) => void,
): HTMLElement {
  const field = el("div", "field");

  const text_ = document.createElement("label");
  text_.htmlFor = id;
  text_.textContent = label;

  const select = document.createElement("select");
  select.id = id;
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.selected = option.value === value;
    select.append(node);
  }
  select.addEventListener("change", () => onChange(select.value));

  field.append(text_, select);
  return field;
}

function formatSize(width: number | null, height: number | null): string {
  if (width === null || height === null) return "—";
  return `${width} × ${height}`;
}

function formatPoint(x: number | null, y: number | null): string {
  if (x === null || y === null) return "—";
  return `${x}, ${y}`;
}
