/**
 * Connections to every bridge server on this machine.
 *
 * A pool rather than a single socket because the whole point is multi-agent: Kiro
 * in one window, Claude Code in a terminal, and Cursor in another can each be
 * running their own bridge server, and a plugin attached to only the first one
 * leaves the rest unable to see Figma. Each server binds its own port in the
 * {@link BRIDGE_PORTS} range and the pool dials all of them.
 *
 * Discovery probes HTTP `/health` before opening a WebSocket, and that ordering
 * is load-bearing: `new WebSocket()` against a closed port logs an error the
 * plugin cannot catch, so a bare socket scan across ten ports every few seconds
 * would bury every real message in console noise. `fetch` rejects quietly.
 *
 * Every connection is authenticated before it is usable. See
 * {@link authProof} — the pairing code is never sent, only an HMAC over a
 * server-chosen nonce.
 */

import {
  Backoff,
  errorMessage,
  Poller,
  type ConnectionStatus,
  type Diagnostics,
} from "@retrojb/plugin-kit";
import {
  authProof,
  BRIDGE_PORTS,
  CLOSE_PROTOCOL_MISMATCH,
  isBridgeCommand,
  isBridgeHealth,
  isTerminalClose,
  PLUGIN_VERSION,
  PROTOCOL_VERSION,
  type AuthResultMessage,
  type BridgeCommand,
  type CommandReply,
  type DocumentIdentity,
  type FigmaUserRef,
  type OwnerIdentity,
  type PluginEvent,
  type ServerHelloMessage,
  type UserMatch,
} from "../shared/protocol.js";

/** Cadence while nothing is connected — fast, so attach feels immediate. */
const DISCOVERY_IDLE_MS = 2500;
/** Cadence once connected, only to notice a newly started server. */
const DISCOVERY_STEADY_MS = 10_000;
const HEALTH_TIMEOUT_MS = 1500;

/** Per-connection state, as rendered by the UI. */
export type SocketStatus =
  | "connecting"
  | "authenticating"
  | "connected"
  | "retrying"
  /** A pairing code is required and none is set. Not dialled. */
  | "needs-pairing"
  /** The server refused the pairing code or the protocol version. Not retried. */
  | "rejected"
  | "failed";

export interface BridgeConnection {
  readonly port: number;
  readonly status: SocketStatus;
  readonly serverVersion: string | null;
  readonly owner: OwnerIdentity | null;
  readonly userMatch: UserMatch | null;
  readonly connectedAt: number | null;
  readonly lastError: string | null;
  readonly commandCount: number;
}

interface Socket {
  readonly port: number;
  ws: WebSocket | null;
  status: SocketStatus;
  serverVersion: string | null;
  owner: OwnerIdentity | null;
  userMatch: UserMatch | null;
  connectedAt: number | null;
  lastError: string | null;
  commandCount: number;
  backoff: Backoff;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

export interface BridgePoolOptions {
  readonly diagnostics: Diagnostics;
  /** Runs a command in the sandbox and resolves with its result. */
  readonly execute: (command: BridgeCommand) => Promise<unknown>;
  /** Current document identity, sent in the auth payload. */
  readonly document: () => Promise<DocumentIdentity>;
  /** The signed-in Figma user, or null when unavailable. */
  readonly figmaUser: () => FigmaUserRef | null;
  /** The pairing code the user has entered. Empty when unset. */
  readonly pairCode: () => string;
  /** Called whenever connection state changes, so the view can re-render. */
  readonly onChange: () => void;
}

export class BridgePool {
  private readonly options: BridgePoolOptions;
  private readonly diagnostics: Diagnostics;
  private readonly sockets = new Map<number, Socket>();
  private readonly poller: Poller;
  private paused = true;

  constructor(options: BridgePoolOptions) {
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

  /** Authenticated connections. */
  get connectedCount(): number {
    let count = 0;
    for (const socket of this.sockets.values()) {
      if (socket.status === "connected") count += 1;
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
    if (states.includes("rejected")) return "error";
    if (states.includes("needs-pairing")) return "error";
    if (states.includes("authenticating") || states.includes("connecting")) {
      return "connecting";
    }
    if (states.includes("retrying")) return "reconnecting";
    if (states.includes("failed")) return "error";

    return "searching";
  }

  /** The first authenticated server's owner, for the headline. */
  get owner(): OwnerIdentity | null {
    for (const socket of this.sockets.values()) {
      if (socket.status === "connected" && socket.owner !== null) {
        return socket.owner;
      }
    }
    return null;
  }

  get userMatch(): UserMatch | null {
    for (const socket of this.sockets.values()) {
      if (socket.status === "connected") return socket.userMatch;
    }
    return null;
  }

  /** Whether any port asked for a pairing code the user has not supplied. */
  get needsPairing(): boolean {
    for (const socket of this.sockets.values()) {
      if (socket.status === "needs-pairing") return true;
    }
    return false;
  }

  connections(): BridgeConnection[] {
    return [...this.sockets.values()]
      .map((socket) => ({
        port: socket.port,
        status: socket.status,
        serverVersion: socket.serverVersion,
        owner: socket.owner,
        userMatch: socket.userMatch,
        connectedAt: socket.connectedAt,
        lastError: socket.lastError,
        commandCount: socket.commandCount,
      }))
      .sort((a, b) => a.port - b.port);
  }

  connectedPorts(): number[] {
    return [...this.sockets.values()]
      .filter((socket) => socket.status === "connected")
      .map((socket) => socket.port)
      .sort((a, b) => a - b);
  }

  /**
   * Tears everything down and rediscovers from scratch.
   *
   * A full teardown rather than a probe, because this is what the refresh button
   * and a pairing-code change both call: a socket rejected for a bad code is
   * never retried automatically, so the only way back is to forget it entirely.
   */
  reconnect(): void {
    for (const socket of [...this.sockets.values()]) {
      this.teardown(socket);
    }
    this.sockets.clear();

    this.paused = false;
    this.options.onChange();
    void this.poller.runNow();
  }

  pause(): void {
    this.paused = true;
    this.poller.stop();

    for (const socket of [...this.sockets.values()]) {
      this.teardown(socket);
    }
    this.sockets.clear();

    this.diagnostics.info("pool", "Paused — not connected to any bridge");
    this.options.onChange();
  }

  /** Pushes an event to every authenticated connection. */
  broadcast(event: PluginEvent): void {
    const payload = JSON.stringify(event);

    for (const socket of this.sockets.values()) {
      if (socket.status !== "connected" || socket.ws === null) continue;
      if (socket.ws.readyState !== WebSocket.OPEN) continue;
      try {
        socket.ws.send(payload);
      } catch (error) {
        this.diagnostics.warn(
          `bridge:${socket.port}`,
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

    const candidates = BRIDGE_PORTS.filter((port) => !this.sockets.has(port));
    if (candidates.length === 0) return;

    const results = await Promise.all(
      candidates.map((port) => this.probe(port)),
    );

    for (const found of results) {
      if (found === null) continue;

      // A server that requires pairing cannot be dialled without a code: there
      // would be no proof to send, the server would reject the socket, and the
      // retry loop would present a fixable configuration problem as a network
      // fault. Surface it as its own state instead.
      if (found.requiresPairing && this.options.pairCode() === "") {
        this.sockets.set(
          found.port,
          this.blankSocket(found.port, "needs-pairing", found.serverVersion),
        );
        this.diagnostics.warn(
          "discovery",
          `Bridge on port ${found.port} needs a pairing code. Paste the one printed by the bridge server.`,
        );
        this.options.onChange();
        continue;
      }

      this.open(found.port, found.serverVersion);
    }
  }

  /** Confirms a bridge server is behind `port` before committing a socket. */
  private async probe(port: number): Promise<{
    port: number;
    serverVersion: string;
    requiresPairing: boolean;
  } | null> {
    try {
      const init: RequestInit = {};
      // Keeps one hung port from stalling the whole discovery pass.
      if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
        init.signal = AbortSignal.timeout(HEALTH_TIMEOUT_MS);
      }

      const response = await fetch(`http://localhost:${port}/health`, init);
      if (!response.ok) return null;

      const body: unknown = await response.json();
      if (!isBridgeHealth(body)) {
        // Something is listening but it is not our server — possibly the sibling
        // Figma bridge, or an unrelated dev server. Debug level: available when
        // diagnosing a port conflict, not noise the user must read.
        this.diagnostics.debug(
          "discovery",
          `Port ${port} responded but is not a Kiro bridge`,
        );
        return null;
      }

      if (body.protocolVersion !== PROTOCOL_VERSION) {
        this.diagnostics.error(
          "discovery",
          `Bridge on port ${port} speaks protocol v${body.protocolVersion}, this plugin speaks v${PROTOCOL_VERSION}. Update whichever is older.`,
        );
        this.sockets.set(
          port,
          this.blankSocket(
            port,
            "rejected",
            body.serverVersion,
            "Protocol version mismatch",
          ),
        );
        this.options.onChange();
        return null;
      }

      return {
        port,
        serverVersion: body.serverVersion,
        requiresPairing: body.requiresPairing,
      };
    } catch {
      // Closed port, timeout, or a non-JSON body. All expected; all quiet.
      return null;
    }
  }

  private blankSocket(
    port: number,
    status: SocketStatus,
    serverVersion: string | null,
    lastError: string | null = null,
  ): Socket {
    return {
      port,
      ws: null,
      status,
      serverVersion,
      owner: null,
      userMatch: null,
      connectedAt: null,
      lastError,
      commandCount: 0,
      backoff: new Backoff({ initialMs: 1000, maxMs: 15_000 }),
      retryTimer: null,
    };
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  private open(port: number, serverVersion: string): void {
    if (this.sockets.has(port)) return;

    this.diagnostics.info(
      "discovery",
      `Bridge v${serverVersion} found on port ${port}, connecting`,
    );

    let ws: WebSocket;
    try {
      ws = new WebSocket(`ws://localhost:${port}`);
    } catch (error) {
      this.diagnostics.error(
        `bridge:${port}`,
        `Could not open socket: ${errorMessage(error)}`,
      );
      return;
    }

    const socket = this.blankSocket(port, "connecting", serverVersion);
    socket.ws = ws;

    this.sockets.set(port, socket);
    this.attach(socket, ws);
    this.options.onChange();
  }

  private attach(socket: Socket, ws: WebSocket): void {
    const { port } = socket;

    ws.onopen = () => {
      // Nothing is sent yet. The server speaks first with SERVER_HELLO, which
      // carries the nonce the proof is computed over.
      socket.status = "authenticating";
      socket.lastError = null;
      this.options.onChange();
    };

    ws.onmessage = (event: MessageEvent) => {
      this.receive(socket, event.data);
    };

    ws.onerror = () => {
      // Browsers withhold detail here for security reasons; `onclose` follows
      // and carries the code worth reporting.
      socket.lastError = "Socket error";
    };

    ws.onclose = (event: CloseEvent) => {
      const wasConnected = socket.status === "connected";
      const wasRejected = socket.status === "rejected";

      if (socket.retryTimer !== null) {
        clearTimeout(socket.retryTimer);
        socket.retryTimer = null;
      }

      if (isTerminalClose(event.code) || wasRejected) {
        socket.status = "rejected";
        socket.ws = null;
        socket.connectedAt = null;
        if (event.reason !== "") socket.lastError = event.reason;

        this.diagnostics.error(
          `bridge:${port}`,
          `Refused by the bridge: ${socket.lastError ?? `close ${event.code}`}`,
        );
        this.options.onChange();
        return;
      }

      this.sockets.delete(port);

      const detail = event.reason || `code ${event.code}`;
      if (wasConnected) {
        this.diagnostics.warn(`bridge:${port}`, `Disconnected (${detail})`);
      } else {
        this.diagnostics.debug(
          `bridge:${port}`,
          `Connection attempt failed (${detail})`,
        );
      }

      this.options.onChange();

      // One prompt same-port retry covers a server restarting in place. Anything
      // slower is picked up by the discovery loop, so there is no need to keep
      // escalating here.
      if (!this.paused && wasConnected) {
        const delay = socket.backoff.nextDelay();
        this.diagnostics.debug(`bridge:${port}`, `Retrying in ${delay}ms`);
        setTimeout(() => {
          if (!this.paused && !this.sockets.has(port)) {
            this.open(port, socket.serverVersion ?? "unknown");
          }
        }, delay);
      }
    };
  }

  private receive(socket: Socket, raw: unknown): void {
    if (typeof raw !== "string") return;

    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      this.diagnostics.warn(
        `bridge:${socket.port}`,
        "Discarded a frame that was not valid JSON",
      );
      return;
    }

    const framed = message as { type?: string };

    if (framed.type === "SERVER_HELLO") {
      void this.authenticate(socket, message as ServerHelloMessage);
      return;
    }

    if (framed.type === "AUTH_RESULT") {
      this.settleAuth(socket, message as AuthResultMessage);
      return;
    }

    // Anything else requires a live, authenticated socket. A server that sends a
    // command before authenticating is either buggy or hostile; either way it is
    // not obeyed.
    if (socket.status !== "connected") {
      this.diagnostics.warn(
        `bridge:${socket.port}`,
        `Ignored a ${framed.type ?? "command"} frame received before authentication`,
      );
      return;
    }

    if (!isBridgeCommand(message)) {
      this.diagnostics.debug(
        `bridge:${socket.port}`,
        `Ignored unrecognised frame${framed.type === undefined ? "" : ` (${framed.type})`}`,
      );
      return;
    }

    void this.dispatch(socket, message);
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  private async authenticate(
    socket: Socket,
    hello: ServerHelloMessage,
  ): Promise<void> {
    const { ws } = socket;
    if (ws === null || ws.readyState !== WebSocket.OPEN) return;

    socket.serverVersion = hello.data.serverVersion;
    socket.owner = hello.data.owner;

    if (hello.data.protocolVersion !== PROTOCOL_VERSION) {
      socket.status = "rejected";
      socket.lastError = `Server speaks protocol v${hello.data.protocolVersion}, this plugin speaks v${PROTOCOL_VERSION}`;
      this.diagnostics.error(`bridge:${socket.port}`, socket.lastError);
      this.options.onChange();
      ws.close(CLOSE_PROTOCOL_MISMATCH, "Protocol version mismatch");
      return;
    }

    let document: DocumentIdentity;
    try {
      document = await this.options.document();
    } catch (error) {
      socket.status = "failed";
      socket.lastError = `Could not read document identity: ${errorMessage(error)}`;
      this.diagnostics.error(`bridge:${socket.port}`, socket.lastError);
      this.options.onChange();
      ws.close();
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) return;

    const figmaUser = this.options.figmaUser();
    const pairCode = this.options.pairCode();

    // An unauthenticated server still gets a proof, computed over an empty code.
    // Keeping the frame shape identical in both modes means there is only one
    // code path to reason about, and the server simply does not check it.
    const proof = authProof(pairCode, {
      nonce: hello.data.nonce,
      documentId: document.documentId,
      figmaUserId: figmaUser?.id ?? null,
    });

    try {
      ws.send(
        JSON.stringify({
          type: "CLIENT_AUTH",
          data: {
            protocolVersion: PROTOCOL_VERSION,
            pluginVersion: PLUGIN_VERSION,
            proof,
            document,
            figmaUser,
          },
        }),
      );
    } catch (error) {
      socket.status = "failed";
      socket.lastError = errorMessage(error);
      this.options.onChange();
    }
  }

  private settleAuth(socket: Socket, result: AuthResultMessage): void {
    if (!result.ok) {
      socket.status = "rejected";
      socket.lastError = result.message;
      this.diagnostics.error(
        `bridge:${socket.port}`,
        `Pairing refused (${result.code}): ${result.message}`,
      );
      this.options.onChange();
      return;
    }

    socket.status = "connected";
    socket.connectedAt = Date.now();
    socket.owner = result.owner;
    socket.userMatch = result.userMatch;
    socket.lastError = null;
    socket.backoff.reset();

    const who = result.owner === null ? "" : ` as @${result.owner.handle}`;
    this.diagnostics.info(`bridge:${socket.port}`, `Connected${who}`);

    if (result.warning !== null) {
      this.diagnostics.warn(`bridge:${socket.port}`, result.warning);
    }

    this.options.onChange();
  }

  // ---------------------------------------------------------------------------
  // Command dispatch
  // ---------------------------------------------------------------------------

  private async dispatch(
    socket: Socket,
    command: BridgeCommand,
  ): Promise<void> {
    socket.commandCount += 1;
    this.options.onChange();

    let reply: CommandReply;
    try {
      const result = await this.options.execute(command);
      reply = { id: command.id, result };
    } catch (error) {
      const detail = errorMessage(error);
      this.diagnostics.warn(
        `bridge:${socket.port}`,
        `${command.method} failed: ${detail}`,
      );
      reply = { id: command.id, error: detail };
    }

    // Back out the same socket the command arrived on: another server has no
    // pending request with this id and would discard it.
    if (socket.ws === null || socket.ws.readyState !== WebSocket.OPEN) {
      this.diagnostics.warn(
        `bridge:${socket.port}`,
        `Dropped the reply to ${command.method} — the socket closed while it ran`,
      );
      return;
    }

    try {
      socket.ws.send(JSON.stringify(reply));
    } catch (error) {
      this.diagnostics.error(
        `bridge:${socket.port}`,
        `Could not reply to ${command.method}: ${errorMessage(error)}`,
      );
    }
  }

  private teardown(socket: Socket): void {
    if (socket.retryTimer !== null) {
      clearTimeout(socket.retryTimer);
      socket.retryTimer = null;
    }

    const { ws } = socket;
    if (ws === null) return;

    // Detach handlers before closing: `onclose` would otherwise schedule a retry
    // for a socket that was deliberately discarded.
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    try {
      ws.close(1000, "Plugin disconnect");
    } catch {
      // Already closing.
    }
    socket.ws = null;
  }
}
