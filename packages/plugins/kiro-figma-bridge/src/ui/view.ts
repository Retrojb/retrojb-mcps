/**
 * The plugin window.
 *
 * Built with DOM calls rather than an HTML template string, for a specific
 * reason: almost everything rendered here is user content — layer names, file
 * names, page names, a Figma handle. Interpolating those into `innerHTML` makes
 * every layer name an injection vector into the plugin's own window, and a layer
 * called `<img onerror=...>` is trivial for anyone to plant in a shared file.
 * `textContent` is the only assignment used for untrusted strings.
 *
 * No framework, because a plugin window is a fixed-size panel with four tabs and
 * pulling one in would cost more bundle than the whole rest of the UI.
 */

import type { DiagnosticEntry } from "@retrojb/plugin-kit";
import type { ConnectionStatus } from "@retrojb/plugin-kit";
import type { BridgeConnection } from "./bridge-pool.js";
import type { BridgeSettings } from "../shared/bridge-messages.js";
import type {
  DocumentIdentity,
  FigmaUserRef,
  OwnerIdentity,
  SelectionInfo,
  UserMatch,
} from "../shared/protocol.js";

export type TabId = "status" | "selection" | "activity" | "settings";

export interface ViewState {
  readonly status: ConnectionStatus;
  readonly connections: readonly BridgeConnection[];
  readonly owner: OwnerIdentity | null;
  readonly userMatch: UserMatch | null;
  readonly needsPairing: boolean;
  readonly pairCode: string;
  readonly document: DocumentIdentity | null;
  readonly figmaUser: FigmaUserRef | null;
  readonly selection: SelectionInfo | null;
  readonly settings: BridgeSettings;
  readonly canWrite: boolean;
  readonly diagnostics: readonly DiagnosticEntry[];
  readonly pluginVersion: string;
  readonly paused: boolean;
}

export interface ViewHandlers {
  readonly onSavePairCode: (code: string) => void;
  readonly onSettingsChange: (settings: BridgeSettings) => void;
  readonly onReconnect: () => void;
  readonly onPauseToggle: () => void;
  readonly onFocusNode: (nodeId: string) => void;
}

/** Copy for each aggregate status, and the dot colour class it maps to. */
const STATUS_COPY: Record<ConnectionStatus, { label: string; tone: string }> = {
  idle: { label: "Idle", tone: "neutral" },
  searching: { label: "Looking for a bridge server", tone: "pending" },
  connecting: { label: "Connecting", tone: "pending" },
  connected: { label: "Connected", tone: "good" },
  reconnecting: { label: "Reconnecting", tone: "pending" },
  paused: { label: "Paused", tone: "neutral" },
  error: { label: "Not connected", tone: "bad" },
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class View {
  private readonly root: HTMLElement;
  private readonly handlers: ViewHandlers;
  private tab: TabId = "status";
  /** Held across renders so typing is not interrupted by a re-render. */
  private pairCodeDraft: string | null = null;

  constructor(root: HTMLElement, handlers: ViewHandlers) {
    this.root = root;
    this.handlers = handlers;
  }

  render(state: ViewState): void {
    // The pairing field is the one control a user is likely to be mid-typing in
    // when a discovery pass triggers a re-render, so its draft survives.
    const focusedId =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.id
        : null;

    this.root.textContent = "";
    this.root.append(
      this.header(state),
      this.tabs(state),
      this.panel(state),
      this.footer(state),
    );

    if (focusedId === "pair-code") {
      const field = document.getElementById("pair-code");
      if (field instanceof HTMLInputElement) {
        field.focus();
        // Caret to the end rather than selecting all, which is what a re-render
        // mid-typing would otherwise do.
        const end = field.value.length;
        field.setSelectionRange(end, end);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  private header(state: ViewState): HTMLElement {
    const copy = STATUS_COPY[state.status];
    const header = el("header", "header");

    const row = el("div", "header__row");
    const dot = el("span", `dot dot--${copy.tone}`);
    dot.setAttribute("aria-hidden", "true");

    const label = el("p", "header__status");
    // `role="status"` so a screen reader announces connection changes without
    // the user having to go looking for them.
    label.setAttribute("role", "status");
    label.textContent = copy.label;

    row.append(dot, label);

    const actions = el("div", "header__actions");

    const pauseButton = el(
      "button",
      "button button--ghost",
      state.paused ? "Resume" : "Pause",
    );
    pauseButton.type = "button";
    pauseButton.addEventListener("click", () => {
      this.handlers.onPauseToggle();
    });

    const refreshButton = el("button", "button button--ghost", "Reconnect");
    refreshButton.type = "button";
    refreshButton.addEventListener("click", () => {
      this.handlers.onReconnect();
    });

    actions.append(pauseButton, refreshButton);
    header.append(row, actions);

    if (state.owner !== null) {
      const owner = el("p", "header__meta");
      owner.textContent = `Agent is acting for @${state.owner.handle}`;
      header.append(owner);
    }

    if (state.userMatch === "mismatch") {
      header.append(
        this.notice(
          "warn",
          "The bridge server is configured with a different Figma account than the one signed in here. Check which FIGMA_ACCESS_TOKEN your editor is using.",
        ),
      );
    }

    return header;
  }

  private notice(tone: "warn" | "info" | "bad", message: string): HTMLElement {
    const notice = el("p", `notice notice--${tone}`, message);
    notice.setAttribute("role", tone === "info" ? "status" : "alert");
    return notice;
  }

  /**
   * A labelled key/value block.
   *
   * A real `dl` rather than a styled grid of divs, so the pairing between each
   * label and its value is in the accessibility tree instead of only in the
   * visual layout.
   */
  private definitionList(
    title: string,
    rows: readonly (readonly [string, string])[],
  ): HTMLElement {
    const card = el("div", "card");
    card.append(el("h2", "section__title", title));

    const list = el("dl", "definitions");
    for (const [key, value] of rows) {
      list.append(el("dt", undefined, key), el("dd", undefined, value));
    }

    card.append(list);
    return card;
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  private tabs(state: ViewState): HTMLElement {
    const list = el("div", "tabs");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Bridge panels");

    const entries: { id: TabId; label: string }[] = [
      { id: "status", label: "Status" },
      {
        id: "selection",
        label:
          state.selection === null || state.selection.count === 0
            ? "Selection"
            : `Selection (${state.selection.count})`,
      },
      { id: "activity", label: "Activity" },
      { id: "settings", label: "Settings" },
    ];

    for (const entry of entries) {
      const selected = entry.id === this.tab;
      const button = el(
        "button",
        `tab${selected ? " tab--active" : ""}`,
        entry.label,
      );
      button.type = "button";
      button.id = `tab-${entry.id}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(selected));
      button.setAttribute("aria-controls", "tabpanel");
      // Roving tabindex: only the active tab is a tab stop, so Tab moves past
      // the whole group rather than through every one of its buttons.
      button.tabIndex = selected ? 0 : -1;

      button.addEventListener("click", () => {
        this.tab = entry.id;
        this.render(state);
      });

      button.addEventListener("keydown", (event: KeyboardEvent) => {
        const offset =
          event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (offset === 0) return;
        event.preventDefault();

        const index = entries.findIndex(
          (candidate) => candidate.id === this.tab,
        );
        const next =
          entries[(index + offset + entries.length) % entries.length];
        if (next === undefined) return;

        this.tab = next.id;
        this.render(state);
        document.getElementById(`tab-${next.id}`)?.focus();
      });

      list.append(button);
    }

    return list;
  }

  private panel(state: ViewState): HTMLElement {
    const panel = el("section", "panel");
    panel.id = "tabpanel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `tab-${this.tab}`);

    switch (this.tab) {
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

  // ---------------------------------------------------------------------------
  // Status panel
  // ---------------------------------------------------------------------------

  private statusPanel(state: ViewState): HTMLElement[] {
    const blocks: HTMLElement[] = [];

    if (state.needsPairing || state.pairCode === "") {
      blocks.push(this.pairingForm(state));
    }

    if (state.document !== null) {
      const doc = state.document;
      blocks.push(
        this.definitionList("This file", [
          ["Name", doc.fileName],
          ["Page", doc.currentPage],
          ["Editor", doc.editorType],
          [
            "File id",
            doc.documentIdPersisted
              ? doc.documentId
              : `${doc.documentId} (not saved — read-only file)`,
          ],
        ]),
      );
    }

    const connections = state.connections;
    if (connections.length === 0) {
      blocks.push(
        el(
          "p",
          "empty",
          state.paused
            ? "Paused. Press Resume to look for a bridge server."
            : "No bridge server found yet. Start one in your editor with `npx kiro-figma-bridge`.",
        ),
      );
      return blocks;
    }

    const heading = el("h2", "section__title", "Bridge servers");
    blocks.push(heading);

    const list = el("ul", "list");
    for (const connection of connections) {
      list.append(this.connectionRow(connection));
    }
    blocks.push(list);

    return blocks;
  }

  private connectionRow(connection: BridgeConnection): HTMLElement {
    const item = el("li", "list__item");

    const top = el("div", "list__row");
    top.append(el("span", "list__title", `localhost:${connection.port}`));
    top.append(
      el("span", `badge badge--${connection.status}`, connection.status),
    );
    item.append(top);

    const details: string[] = [];
    if (connection.serverVersion !== null) {
      details.push(`server v${connection.serverVersion}`);
    }
    if (connection.owner !== null) details.push(`@${connection.owner.handle}`);
    if (connection.commandCount > 0) {
      details.push(
        `${connection.commandCount} ${connection.commandCount === 1 ? "request" : "requests"}`,
      );
    }
    if (details.length > 0) {
      item.append(el("p", "list__meta", details.join(" · ")));
    }

    if (connection.lastError !== null) {
      item.append(el("p", "list__error", connection.lastError));
    }

    return item;
  }

  private pairingForm(state: ViewState): HTMLElement {
    const form = el("form", "card");

    form.append(el("h2", "section__title", "Pairing code"));
    form.append(
      el(
        "p",
        "hint",
        "Run the bridge server in your editor and paste the code it prints. It is derived from your FIGMA_ACCESS_TOKEN and stays the same until that token changes.",
      ),
    );

    const label = el("label", "field__label", "Pairing code");
    label.htmlFor = "pair-code";

    const input = el("input", "field__input");
    input.id = "pair-code";
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "ABCD-2345";
    input.value = this.pairCodeDraft ?? state.pairCode;
    input.setAttribute("aria-describedby", "pair-code-hint");

    input.addEventListener("input", () => {
      this.pairCodeDraft = input.value;
    });

    const hint = el("p", "hint hint--small", "Case and dashes do not matter.");
    hint.id = "pair-code-hint";

    const submit = el("button", "button button--primary", "Save and connect");
    submit.type = "submit";

    form.addEventListener("submit", (event: SubmitEvent) => {
      event.preventDefault();
      const value = input.value.trim();
      this.pairCodeDraft = null;
      this.handlers.onSavePairCode(value);
    });

    form.append(label, input, hint, submit);
    return form;
  }

  // ---------------------------------------------------------------------------
  // Selection panel
  // ---------------------------------------------------------------------------

  private selectionPanel(state: ViewState): HTMLElement[] {
    const selection = state.selection;

    if (selection === null || selection.count === 0) {
      return [
        el(
          "p",
          "empty",
          "Nothing selected. Select layers on the canvas and the agent can ask about them by name or id.",
        ),
      ];
    }

    const blocks: HTMLElement[] = [];

    if (selection.count > selection.nodes.length) {
      blocks.push(
        this.notice(
          "info",
          `${selection.count} layers selected. Showing the first ${selection.nodes.length}; the agent sees the same.`,
        ),
      );
    }

    const list = el("ul", "list");

    for (const node of selection.nodes) {
      const item = el("li", "list__item");

      const button = el("button", "list__button");
      button.type = "button";
      button.addEventListener("click", () => {
        this.handlers.onFocusNode(node.id);
      });

      const top = el("div", "list__row");
      top.append(el("span", "list__title", node.name));
      top.append(el("span", "badge", node.type));
      button.append(top);

      const size =
        node.width === null || node.height === null
          ? null
          : `${Math.round(node.width)} × ${Math.round(node.height)}`;

      const meta = [node.path.join(" / "), size]
        .filter((part): part is string => part !== null && part !== "")
        .join(" · ");

      if (meta !== "") button.append(el("p", "list__meta", meta));
      button.append(el("p", "list__id", node.id));

      item.append(button);
      list.append(item);
    }

    blocks.push(list);
    return blocks;
  }

  // ---------------------------------------------------------------------------
  // Activity panel
  // ---------------------------------------------------------------------------

  private activityPanel(state: ViewState): HTMLElement[] {
    // Warnings and errors first is tempting, but chronological order is what
    // makes a connection sequence readable, so only the level is styled.
    const entries = [...state.diagnostics].reverse();

    if (entries.length === 0) {
      return [el("p", "empty", "Nothing logged yet.")];
    }

    const list = el("ul", "log");

    for (const entry of entries) {
      const item = el("li", `log__item log__item--${entry.level}`);
      const time = new Date(entry.timestamp);

      const head = el("div", "log__head");
      head.append(
        el(
          "span",
          "log__time",
          `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`,
        ),
      );
      head.append(el("span", "log__scope", entry.scope));

      item.append(head, el("p", "log__message", entry.message));
      list.append(item);
    }

    return [list];
  }

  // ---------------------------------------------------------------------------
  // Settings panel
  // ---------------------------------------------------------------------------

  private settingsPanel(state: ViewState): HTMLElement[] {
    const blocks: HTMLElement[] = [];
    const { settings } = state;

    blocks.push(this.pairingForm(state));

    const group = el("div", "card");
    group.append(el("h2", "section__title", "Behaviour"));

    group.append(
      this.selectField(
        "highlight-mode",
        "When the agent references a layer",
        settings.highlightMode,
        [
          ["overlay", "Outline it on the canvas"],
          ["select", "Select it"],
          ["off", "Do nothing"],
        ],
        (value) => {
          this.handlers.onSettingsChange({
            ...settings,
            highlightMode:
              value === "select" || value === "off" ? value : "overlay",
          });
        },
      ),
    );

    group.append(
      this.checkboxField(
        "scroll-into-view",
        "Scroll referenced layers into view",
        settings.scrollIntoView,
        (checked) => {
          this.handlers.onSettingsChange({
            ...settings,
            scrollIntoView: checked,
          });
        },
      ),
    );

    group.append(
      this.checkboxField(
        "auto-connect",
        "Connect automatically when the plugin opens",
        settings.autoConnect,
        (checked) => {
          this.handlers.onSettingsChange({ ...settings, autoConnect: checked });
        },
      ),
    );

    blocks.push(group);

    const writes = el("div", "card");
    writes.append(el("h2", "section__title", "Permissions"));

    if (!state.canWrite) {
      writes.append(
        this.notice(
          "info",
          "This editor is read-only, so the agent cannot change the document regardless of this setting.",
        ),
      );
    }

    writes.append(
      this.checkboxField(
        "allow-writes",
        "Allow the agent to change the document",
        settings.allowWrites,
        (checked) => {
          this.handlers.onSettingsChange({ ...settings, allowWrites: checked });
        },
        state.canWrite
          ? "Off by default. When off, the agent can read the file and highlight layers but every edit is refused."
          : undefined,
      ),
    );

    blocks.push(writes);
    return blocks;
  }

  private selectField(
    id: string,
    label: string,
    value: string,
    options: readonly (readonly [string, string])[],
    onChange: (value: string) => void,
  ): HTMLElement {
    const field = el("div", "field");

    const labelNode = el("label", "field__label", label);
    labelNode.htmlFor = id;

    const select = el("select", "field__input");
    select.id = id;

    for (const [optionValue, optionLabel] of options) {
      const option = el("option", undefined, optionLabel);
      option.value = optionValue;
      option.selected = optionValue === value;
      select.append(option);
    }

    select.addEventListener("change", () => {
      onChange(select.value);
    });

    field.append(labelNode, select);
    return field;
  }

  private checkboxField(
    id: string,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    hint?: string,
  ): HTMLElement {
    const field = el("div", "field field--inline");

    const input = el("input", "field__checkbox");
    input.type = "checkbox";
    input.id = id;
    input.checked = checked;
    if (hint !== undefined)
      input.setAttribute("aria-describedby", `${id}-hint`);

    input.addEventListener("change", () => {
      onChange(input.checked);
    });

    const labelNode = el("label", "field__label field__label--inline", label);
    labelNode.htmlFor = id;

    field.append(input, labelNode);

    if (hint !== undefined) {
      const hintNode = el("p", "hint hint--small", hint);
      hintNode.id = `${id}-hint`;
      field.append(hintNode);
    }

    return field;
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  private footer(state: ViewState): HTMLElement {
    const footer = el("footer", "footer");
    const parts = [`Plugin v${state.pluginVersion}`];

    if (state.figmaUser?.name != null && state.figmaUser.name !== "") {
      parts.push(`signed in as ${state.figmaUser.name}`);
    }

    footer.append(el("p", "footer__text", parts.join(" · ")));
    return footer;
  }
}
