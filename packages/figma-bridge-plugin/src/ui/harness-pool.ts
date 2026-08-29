import {
  Backoff,
  type Diagnostics,
  errorMessage,
  Poller,
  type ConnectionStatus,
} from "@retrojb/plugin-kit";
import {
  HARNESS_PORTS,
  isHarnessCommand,
  isHarnessHealth,
  isTerminalClose,
  type CommandReply,
  type FileInfo,
  type HarnessCommand,
  type PluginEvent,
} from "../shared/protocol.js";

/** Cadence while nothing is connected — fast, so attach feels immediate. */
const DISCOVERY_IDLE_MS = 3000;
/** Cadence while connected — slow, only to notice a restarted instance. */
const DISCOVERY_STEADY_MS = 10_000;
const HEALTH_TIMEOUT_MS = 1500;

/** State of one harness connection, as rendered by the UI. */
export interface HarnessConnection {
  readonly port: number;
  readonly status: "connecting" | "connected" | "retrying" | "failed";
  readonly serverVersion: string | null;
  readonly pid: number | null;
  readonly connectedAt: number | null;
  readonly lastError: string | null;
  /** Commands served on this connection since it opened. */
  readonly commandCount: number;
}

interface Socket {
  readonly port: number;
  ws: WebSocket;
  status: HarnessConnection["status"];
  serverVersion: string | null;
  pid: number | null;
  connectedAt: number | null;
  lastError: string | null;
  commandCount: number;
  backoff: Backoff;
  retryTimer: number | null;
}

export interface HarnessPoolOptions {
  readonly diagnostics: Diagnostics;
  /** Executes a harness command and resolves with its result. */
  readonly execute: (command: HarnessCommand) => Promise<unknown>;
  /** Supplies the `FILE_INFO` payload sent on every new connection. */
  readonly fileInfo: () => Promise<FileInfo | null>;
  /** Called whenever connection state changes, so the view can re-render. */
  readonly onChange: () => void;
  /** Called when the harness reports a newer bundled plugin build. */
  readonly onUpdateAvailable: () => void;
}

/**
 * Maintains connections to every harness instance on localhost.
 *
 * Multiple harnesses run at once in normal use — one per AI client tab — and
 * each binds its own port in the 9223-9232 range. A plugin connected to only the
 * first one leaves the others unable to reach Figma, so the pool dials all of
 * them.
 *
 * Discovery probes HTTP `/health` before opening a WebSocket. That ordering
 * matters for a reason that is not obvious: `new WebSocket()` against a closed
 * port logs an uncatchable error to the console, so a plain WebSocket scan across
 * ten ports every three seconds would bury every real message in noise. `fetch`
 * rejects quietly.
 */
export class HarnessPool {
  private readonly options: HarnessPoolOptions;
  private readonly diagnostics: Diagnostics;
  private readonly sockets = new Map<number, Socket>();
  private readonly poller: Poller;
  private paused = false;

  constructor(options: HarnessPoolOptions) {
    this.options = options;
    this.diagnostics = options.diagnostics;

    this.poller = new Poller({
      idleIntervalMs: DISCOVERY_IDLE_MS,
      steadyIntervalMs: DISCOVERY_STEADY_MS,
      isSatisfied: () => this.connectedCount > 0,
      run: () => this.discover(),
      onError: (error) => {
        this.diagnostics.warn("discovery", errorMessage(error));
      },
    });
  }

  start(): void {
    this.paused = false;
    this.poller.start(true);
  }

  /** Live connections. */
  get connectedCount(): number {
    let count = 0;
    for (const socket of this.sockets.values()) {
      if (socket.ws.readyState === WebSocket.OPEN) count += 1;
    }
    return count;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Aggregate status for the UI's headline indicator. */
  get status(): ConnectionStatus {
    if (this.paused) return "paused";
    if (this.connectedCount > 0) return "connected";

    const states = [...this.sockets.values()].map((socket) => socket.status);
    if (states.includes("connecting")) return "connecting";
    if (states.includes("retrying")) return "reconnecting";
    if (states.includes("failed")) return "error";

    return "searching";
  }

  /** Per-port state, ordered by port. */
  connections(): HarnessConnection[] {
    return [...this.sockets.values()]
      .map((socket) => ({
        port: socket.port,
        status: socket.status,
        serverVersion: socket.serverVersion,
        pid: socket.pid,
        connectedAt: socket.connectedAt,
        lastError: socket.lastError,
        commandCount: socket.commandCount,
      }))
      .sort((a, b) => a.port - b.port);
  }

  connectedPorts(): number[] {
    return [...this.sockets.values()]
      .filter((socket) => socket.ws.readyState === WebSocket.OPEN)
      .map((socket) => socket.port)
      .sort((a, b) => a - b);
  }

  /**
   * Tears every connection down and rediscovers from scratch.
   *
   * This is what the refresh button calls. A full teardown rather than a probe:
   * the states worth recovering from are precisely the ones where a socket looks
   * open but the harness is no longer behind it, and only reconnecting proves
   * otherwise.
   */
  async refresh(): Promise<void> {
    this.diagnostics.info("pool", "Refreshing all harness connections");
    this.paused = false;

    for (const socket of [...this.sockets.values()]) {
      this.teardown(socket, "Manual refresh");
    }
    this.sockets.clear();
    this.options.onChange();

    this.poller.start(false);
    await this.poller.runNow();
  }

  /** Stops discovery and closes every connection. */
  pause(): void {
    this.paused = true;
    this.poller.stop();

    for (const socket of [...this.sockets.values()]) {
      this.teardown(socket, "Manual disconnect");
    }
    this.sockets.clear();

    this.diagnostics.info("pool", "Paused — no harness connections");
    this.options.onChange();
  }

  /** Pushes an event to every live connection. */
  broadcast(event: PluginEvent): void {
    const payload = JSON.stringify(event);

    for (const socket of this.sockets.values()) {
      if (socket.ws.readyState !== WebSocket.OPEN) continue;
      try {
        socket.ws.send(payload);
      } catch (error) {
        this.diagnostics.warn(
          `socket:${socket.port}`,
          `Failed to send ${event.type}: ${errorMessage(error)}`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------

  private async discover(): Promise<void> {
    if (this.paused) return;

    const candidates = HARNESS_PORTS.filter((port) => !this.sockets.has(port));
    if (candidates.length === 0) return;

    const results = await Promise.all(
      candidates.map((port) => this.probe(port)),
    );

    for (const found of results) {
      if (found === null) continue;
      this.open(found.port, found.version);
    }
  }

  /** Confirms a harness is behind `port` before committing a WebSocket to it. */
  private async probe(
    port: number,
  ): Promise<{ port: number; version: string } | null> {
    try {
      const init: RequestInit = {};
      // AbortSignal.timeout keeps a hung port from stalling the whole pass.
      if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
        init.signal = AbortSignal.timeout(HEALTH_TIMEOUT_MS);
      }

      const response = await fetch(`http://localhost:${port}/health`, init);
      if (!response.ok) return null;

      const body: unknown = await response.json();
      if (!isHarnessHealth(body)) {
        // Something is listening, but it is not a harness. Recorded at debug so
        // it is available when diagnosing a port conflict without being noise.
        this.diagnostics.debug(
          "discovery",
          `Port ${port} responded but is not a harness`,
        );
        return null;
      }

      return { port, version: body.version };
    } catch {
      // Closed port, timeout, or non-JSON body. All expected; all quiet.
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  private open(port: number, version: string): void {
    if (this.sockets.has(port)) return;

    this.diagnostics.info(
      "discovery",
      `Harness v${version} found on port ${port}, connecting`,
    );

    let ws: WebSocket;
    try {
      ws = new WebSocket(`ws://localhost:${port}`);
    } catch (error) {
      this.diagnostics.error(
        `socket:${port}`,
        `Could not open socket: ${errorMessage(error)}`,
      );
      return;
    }

    const socket: Socket = {
      port,
      ws,
      status: "connecting",
      serverVersion: version,
      pid: null,
      connectedAt: null,
      lastError: null,
      commandCount: 0,
      backoff: new Backoff({ initialMs: 1000, maxMs: 15_000 }),
      retryTimer: null,
    };

    this.sockets.set(port, socket);
    this.attach(socket);
    this.options.onChange();
  }

  private attach(socket: Socket): void {
    const { ws, port } = socket;

    ws.onopen = () => {
      socket.status = "connected";
      socket.connectedAt = Date.now();
      socket.lastError = null;
      socket.backoff.reset();

      this.diagnostics.info(`socket:${port}`, "Connected");
      this.options.onChange();

      // FILE_INFO is mandatory: the harness holds the socket as unidentified
      // and closes it after 30s without one.
      void this.identify(socket);
    };

    ws.onmessage = (event: MessageEvent) => {
      this.receive(socket, event.data);
    };

    ws.onerror = () => {
      // The browser withholds detail here for security reasons; `onclose`
      // follows and carries the code worth reporting.
      socket.lastError = "Socket error";
    };

    ws.onclose = (event: CloseEvent) => {
      const wasConnected = socket.status === "connected";
      this.sockets.delete(port);

      if (socket.retryTimer !== null) {
        clearTimeout(socket.retryTimer);
        socket.retryTimer = null;
      }

      if (isTerminalClose(event.code, event.reason)) {
        this.diagnostics.info(
          `socket:${port}`,
          `Closed by harness: ${event.reason}`,
        );
        this.options.onChange();
        return;
      }

      const detail = event.reason || `code ${event.code}`;
      if (wasConnected) {
        this.diagnostics.warn(`socket:${port}`, `Disconnected (${detail})`);
      } else {
        this.diagnostics.debug(
          `socket:${port}`,
          `Connection attempt failed (${detail})`,
        );
      }

      this.options.onChange();

      // One prompt same-port retry covers a harness restarting in place.
      // Anything slower is picked up by the discovery loop, so there is no need
      // to keep escalating here.
      if (!this.paused && wasConnected) {
        const delay = socket.backoff.nextDelay();
        this.diagnostics.debug(`socket:${port}`, `Retrying in ${delay}ms`);
        setTimeout(() => {
          if (!this.paused && !this.sockets.has(port)) {
            this.open(port, socket.serverVersion ?? "unknown");
          }
        }, delay);
      }
    };
  }

  private async identify(socket: Socket): Promise<void> {
    try {
      const info = await this.options.fileInfo();
      if (info === null) {
        this.diagnostics.warn(
          `socket:${socket.port}`,
          "Could not read file info; harness will not identify this file",
        );
        return;
      }

      if (socket.ws.readyState !== WebSocket.OPEN) return;
      socket.ws.send(JSON.stringify({ type: "FILE_INFO", data: info }));

      if (info.fileKey === null) {
        this.diagnostics.warn(
          `socket:${socket.port}`,
          "File key unavailable — the harness cannot route by file. See the README note on enablePrivatePluginApi.",
        );
      }
    } catch (error) {
      this.diagnostics.error(
        `socket:${socket.port}`,
        `Identification failed: ${errorMessage(error)}`,
      );
    }
  }

  private receive(socket: Socket, raw: unknown): void {
    if (typeof raw !== "string") return;

    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      this.diagnostics.warn(
        `socket:${socket.port}`,
        "Discarded a frame that was not valid JSON",
      );
      return;
    }

    const framed = message as { type?: string; data?: unknown };

    if (framed.type === "SERVER_HELLO") {
      const data = framed.data as
        { pid?: number; serverVersion?: string } | undefined;
      socket.pid = data?.pid ?? null;
      socket.serverVersion = data?.serverVersion ?? socket.serverVersion;

      this.diagnostics.info(
        `socket:${socket.port}`,
        `Harness v${socket.serverVersion ?? "?"} (pid ${socket.pid ?? "?"})`,
      );
      this.options.onChange();
      return;
    }

    if (framed.type === "PLUGIN_UPDATE_AVAILABLE") {
      this.diagnostics.warn(
        `socket:${socket.port}`,
        "The harness ships a different bridge build than this one",
      );
      this.options.onUpdateAvailable();
      return;
    }

    if (!isHarnessCommand(message)) {
      this.diagnostics.debug(
        `socket:${socket.port}`,
        `Ignored unrecognised frame${framed.type ? ` (${framed.type})` : ""}`,
      );
      return;
    }

    void this.dispatch(socket, message);
  }

  private async dispatch(
    socket: Socket,
    command: HarnessCommand,
  ): Promise<void> {
    socket.commandCount += 1;
    this.options.onChange();

    let reply: CommandReply;
    try {
      const result = await this.options.execute(command);
      reply = { id: command.id, result };
    } catch (error) {
      const detail = errorMessage(error);
      this.diagnostics.error(
        `socket:${socket.port}`,
        `${command.method} failed: ${detail}`,
      );
      reply = { id: command.id, error: detail };
    }

    // Must go back out the same socket: the harness rejects a reply whose id
    // matches a request it routed to a different file.
    if (socket.ws.readyState !== WebSocket.OPEN) {
      this.diagnostics.warn(
        `socket:${socket.port}`,
        `Dropped reply for ${command.method} — socket closed while it ran`,
      );
      return;
    }

    try {
      socket.ws.send(JSON.stringify(reply));
    } catch (error) {
      this.diagnostics.error(
        `socket:${socket.port}`,
        `Could not send reply for ${command.method}: ${errorMessage(error)}`,
      );
    }
  }

  private teardown(socket: Socket, reason: string): void {
    if (socket.retryTimer !== null) {
      clearTimeout(socket.retryTimer);
      socket.retryTimer = null;
    }

    // Detached before closing so the handler does not schedule a reconnect for
    // a socket we are deliberately discarding.
    socket.ws.onclose = null;
    socket.ws.onerror = null;
    socket.ws.onmessage = null;
    socket.ws.onopen = null;

    try {
      socket.ws.close(1000, reason);
    } catch {
      // Already closing or closed.
    }
  }
}
