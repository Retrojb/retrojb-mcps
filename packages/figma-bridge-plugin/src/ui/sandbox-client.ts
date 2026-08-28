import { RequestRegistry } from "@retrojb/plugin-kit";
import type {
  BridgeSettings,
  SandboxToUi,
  UiToSandbox,
} from "../shared/bridge-messages.js";

/**
 * The UI's half of the sandbox relay.
 *
 * Wraps Figma's `postMessage` channel in a request/response API. Without the
 * correlation and timeouts, a harness command that the sandbox never answers
 * would leave the harness waiting on a promise that can never settle — and the
 * harness's own timeout would report it as a Figma failure rather than a relay
 * one.
 */
export class SandboxClient {
  private readonly registry = new RequestRegistry({
    defaultTimeoutMs: 20_000,
    idPrefix: "sbx",
  });

  private readonly listeners = new Set<(event: SandboxToUi) => void>();

  constructor() {
    window.addEventListener("message", (event: MessageEvent) => {
      // Figma wraps plugin traffic in `pluginMessage`. Anything without it came
      // from somewhere else and must not be treated as sandbox output.
      const payload = (event.data as { pluginMessage?: unknown } | null)
        ?.pluginMessage;
      if (payload === undefined || payload === null) return;

      this.handle(payload as SandboxToUi);
    });
  }

  /** Subscribes to sandbox events. Returns an unsubscribe function. */
  on(listener: (event: SandboxToUi) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Sends a message without expecting a reply. */
  send(message: UiToSandbox): void {
    parent.postMessage({ pluginMessage: message }, "*");
  }

  /** Runs a harness command in the sandbox and resolves with its result. */
  executeCommand(
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<unknown> {
    const requestId = this.registry.nextId();
    const promise = this.registry.register<unknown>(
      requestId,
      `Figma command ${method}`,
      timeoutMs,
    );

    this.send({ kind: "EXECUTE_COMMAND", requestId, method, params });
    return promise;
  }

  /** Asks the sandbox for current file identity. */
  requestFileInfo(): Promise<unknown> {
    const requestId = this.registry.nextId();
    const promise = this.registry.register<unknown>(
      requestId,
      "file info",
      5000,
    );

    this.send({ kind: "REQUEST_FILE_INFO", requestId });
    return promise;
  }

  /** Asks the sandbox for the current selection. */
  requestSelection(): Promise<unknown> {
    const requestId = this.registry.nextId();
    const promise = this.registry.register<unknown>(
      requestId,
      "selection",
      5000,
    );

    this.send({ kind: "REQUEST_SELECTION", requestId });
    return promise;
  }

  updateSettings(settings: BridgeSettings): void {
    this.send({ kind: "UPDATE_SETTINGS", settings });
  }

  highlight(nodeIds: readonly string[], reason: string): void {
    this.send({ kind: "HIGHLIGHT_NODES", nodeIds, reason });
  }

  clearHighlight(): void {
    this.send({ kind: "CLEAR_HIGHLIGHT" });
  }

  private handle(event: SandboxToUi): void {
    if (event.kind === "COMMAND_RESULT") {
      const settled = event.ok
        ? this.registry.resolve(event.requestId, event.result)
        : this.registry.reject(event.requestId, event.error);

      // A late reply is normal after a timeout; there is nothing to do with it,
      // and reporting it would be noise rather than signal.
      if (!settled) return;
      return;
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A throwing view must not stop the other subscribers from running.
      }
    }
  }
}
