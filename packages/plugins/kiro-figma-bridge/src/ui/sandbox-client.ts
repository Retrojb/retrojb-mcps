/**
 * The UI's half of the relay to the sandbox.
 *
 * `postMessage` is fire-and-forget, so every request that expects an answer needs
 * an id, a promise, and a timeout. `RequestRegistry` provides all three; this
 * class is the Figma-specific wrapper around it — the `{ pluginMessage }`
 * envelope Figma requires, and the event listener that unwraps it.
 */

import { RequestRegistry, type Diagnostics } from "@retrojb/plugin-kit";
import type {
  BridgeSettings,
  SandboxToUi,
  StoredCredentials,
  UiToSandbox,
} from "../shared/bridge-messages.js";
import type { DocumentIdentity, SelectionInfo } from "../shared/protocol.js";

/**
 * Default ceiling for a sandbox round-trip.
 *
 * Generous because some commands legitimately take a while: exporting a large
 * frame, or a document-wide search that has to load every page first.
 */
const DEFAULT_TIMEOUT_MS = 25_000;

/** Callbacks for the unsolicited frames the sandbox pushes. */
export interface SandboxClientHandlers {
  readonly onReady: (event: Extract<SandboxToUi, { kind: "READY" }>) => void;
  readonly onSelection: (selection: SelectionInfo) => void;
  readonly onDocumentInfo: (document: DocumentIdentity) => void;
  readonly onPageChange: (pageId: string, pageName: string) => void;
  readonly onDocumentChange: (
    changedNodeIds: readonly string[],
    changeCount: number,
  ) => void;
  readonly onHighlightState: (
    nodeIds: readonly string[],
    reason: string | null,
  ) => void;
}

export class SandboxClient {
  private readonly registry = new RequestRegistry({
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    idPrefix: "sbx",
  });
  private readonly diagnostics: Diagnostics;
  private readonly handlers: SandboxClientHandlers;

  constructor(diagnostics: Diagnostics, handlers: SandboxClientHandlers) {
    this.diagnostics = diagnostics;
    this.handlers = handlers;

    window.addEventListener("message", (event: MessageEvent) => {
      // Figma wraps sandbox frames in `pluginMessage`. Anything else on this
      // channel is not ours — the iframe shares a window with Figma's own
      // messaging.
      const wrapper = event.data as { pluginMessage?: unknown } | null;
      const message = wrapper?.pluginMessage;
      if (typeof message !== "object" || message === null) return;
      if (typeof (message as { kind?: unknown }).kind !== "string") return;

      this.receive(message as SandboxToUi);
    });
  }

  /** Sends a frame to the sandbox. */
  private send(message: UiToSandbox): void {
    parent.postMessage({ pluginMessage: message }, "*");
  }

  // ---------------------------------------------------------------------------
  // Requests
  // ---------------------------------------------------------------------------

  /** Runs a command in the sandbox and resolves with its result. */
  executeCommand(
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<unknown> {
    const requestId = this.registry.nextId();
    const promise = this.registry.register<unknown>(
      requestId,
      method,
      timeoutMs,
    );
    this.send({ kind: "EXECUTE_COMMAND", requestId, method, params });
    return promise;
  }

  requestDocumentInfo(): Promise<DocumentIdentity> {
    const requestId = this.registry.nextId();
    const promise = this.registry.register<DocumentIdentity>(
      requestId,
      "document info",
    );
    this.send({ kind: "REQUEST_DOCUMENT_INFO", requestId });
    return promise;
  }

  requestSelection(): Promise<SelectionInfo> {
    const requestId = this.registry.nextId();
    const promise = this.registry.register<SelectionInfo>(
      requestId,
      "selection",
    );
    this.send({ kind: "REQUEST_SELECTION", requestId });
    return promise;
  }

  // ---------------------------------------------------------------------------
  // Fire-and-forget
  // ---------------------------------------------------------------------------

  highlight(nodeIds: readonly string[], reason: string): void {
    this.send({ kind: "HIGHLIGHT_NODES", nodeIds, reason });
  }

  clearHighlight(): void {
    this.send({ kind: "CLEAR_HIGHLIGHT" });
  }

  updateSettings(settings: BridgeSettings): void {
    this.send({ kind: "UPDATE_SETTINGS", settings });
  }

  storeCredentials(credentials: StoredCredentials): void {
    this.send({ kind: "STORE_CREDENTIALS", credentials });
  }

  reportStatus(message: Extract<UiToSandbox, { kind: "REPORT_STATUS" }>): void {
    this.send(message);
  }

  resize(width: number, height: number): void {
    this.send({ kind: "RESIZE_UI", width, height });
  }

  close(): void {
    this.send({ kind: "CLOSE_PLUGIN" });
  }

  // ---------------------------------------------------------------------------
  // Inbound
  // ---------------------------------------------------------------------------

  private receive(message: SandboxToUi): void {
    switch (message.kind) {
      case "COMMAND_RESULT": {
        const settled = message.ok
          ? this.registry.resolve(message.requestId, message.result)
          : this.registry.reject(message.requestId, message.error);

        if (!settled) {
          // A reply that arrived after its timeout, or a duplicate. Recorded at
          // debug because it is a symptom worth having when diagnosing a slow
          // sandbox, not something the user can act on.
          this.diagnostics.debug(
            "relay",
            `Unmatched reply for request ${message.requestId}`,
          );
        }
        return;
      }

      case "READY":
        this.handlers.onReady(message);
        return;

      case "SELECTION":
        this.handlers.onSelection(message.selection);
        return;

      case "DOCUMENT_INFO":
        this.handlers.onDocumentInfo(message.document);
        return;

      case "PAGE_CHANGE":
        this.handlers.onPageChange(message.pageId, message.pageName);
        return;

      case "DOCUMENT_CHANGE":
        this.handlers.onDocumentChange(
          message.changedNodeIds,
          message.changeCount,
        );
        return;

      case "HIGHLIGHT_STATE":
        this.handlers.onHighlightState(message.nodeIds, message.reason);
        return;

      case "DIAGNOSTIC":
        this.diagnostics.record(message.level, message.scope, message.message);
        return;
    }
  }
}
