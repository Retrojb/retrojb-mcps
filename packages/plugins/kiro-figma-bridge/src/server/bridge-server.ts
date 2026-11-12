/**
 * The local server the Figma plugin connects to.
 *
 * It is two things on one port: an HTTP endpoint serving `/health` so the plugin
 * can discover it quietly, and a WebSocket endpoint carrying the actual traffic.
 * The MCP layer sits on top and turns agent tool calls into
 * {@link BridgeServer.command} calls.
 *
 * Security posture, since this opens a listening socket on a developer's machine:
 *
 * - **Bound to 127.0.0.1 only.** Never `0.0.0.0`, so nothing off-machine can
 *   reach it even on a hostile network.
 * - **Authenticated.** A connection is `pending` until it proves it holds the
 *   pairing code, and a pending connection cannot issue or receive anything but
 *   the handshake. This is what stops any web page you happen to have open from
 *   connecting to `ws://localhost:9770` and driving your Figma file — browsers
 *   allow that cross-origin, and `Origin` cannot be trusted to prevent it because
 *   a Figma plugin iframe legitimately sends `Origin: null`.
 * - **Host header checked**, which closes the DNS-rebinding variant of the same
 *   attack, where an attacker-controlled name resolves to 127.0.0.1.
 * - **Unidentified connections time out**, so a socket cannot sit open
 *   indefinitely without authenticating.
 */

import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { FigmaIdentity } from "./figma-identity.js";
import type { PairingConfig } from "./pair-code.js";
import { timingSafeEqualHex } from "../shared/hmac.js";
import {
  authProof,
  AUTH_TIMEOUT_MS,
  BRIDGE_PORTS,
  CLOSE_AUTH_FAILED,
  CLOSE_AUTH_TIMEOUT,
  CLOSE_PROTOCOL_MISMATCH,
  CLOSE_REPLACED,
  PROTOCOL_VERSION,
  SERVER_VERSION,
  type AuthFailureCode,
  type BridgeHealth,
  type ClientAuthMessage,
  type CommandReply,
  type DocumentIdentity,
  type FigmaUserRef,
  type OwnerIdentity,
  type PluginEvent,
  type SelectionInfo,
  type UserMatch,
} from "../shared/protocol.js";

const HOST = "127.0.0.1";

/** Events retained per connection for the "recent activity" tool. */
const EVENT_BUFFER = 50;

/** Default ceiling on one command, unless a caller asks for longer. */
const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;

export type LogLevel = "debug" | "info" | "warn" | "error";
export type Logger = (level: LogLevel, message: string) => void;

export interface BridgeServerOptions {
  readonly pairing: PairingConfig;
  /** Account resolved from the access token, or null when unresolved. */
  readonly owner: FigmaIdentity | null;
  /**
   * Whether a Figma user that does not match {@link owner} is refused outright.
   *
   * Off by default, and that default is a deliberate judgement rather than
   * laziness. `figma.currentUser.id` and the REST API's account id are believed
   * to be the same identifier, but that equivalence is not something Figma
   * documents as a contract, so enforcing it by default would risk locking
   * legitimate users out of their own bridge over an undocumented detail. The
   * mismatch is always reported — to the server log and in the plugin window — so
   * it is visible either way, and this flag turns it into a hard refusal for
   * anyone who wants that.
   */
  readonly requireUserMatch: boolean;
  /** Preferred port. Falls back to scanning the range when taken or unset. */
  readonly port?: number | undefined;
  readonly log: Logger;
}

/** One connected plugin, as reported to the agent. */
export interface PluginSession {
  readonly sessionId: number;
  readonly authenticated: boolean;
  readonly document: DocumentIdentity | null;
  readonly figmaUser: FigmaUserRef | null;
  readonly userMatch: UserMatch;
  readonly connectedAt: number;
  readonly commandCount: number;
}

/** A recorded document event, with the file it came from. */
export interface RecordedEvent {
  readonly documentId: string | null;
  readonly event: PluginEvent;
  readonly receivedAt: number;
}

interface Pending {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
  readonly method: string;
}

interface Session {
  readonly sessionId: number;
  readonly ws: WebSocket;
  readonly nonce: string;
  readonly connectedAt: number;
  authenticated: boolean;
  document: DocumentIdentity | null;
  figmaUser: FigmaUserRef | null;
  userMatch: UserMatch;
  commandCount: number;
  authTimer: NodeJS.Timeout | null;
  readonly pending: Map<string, Pending>;
  events: RecordedEvent[];
  latestSelection: SelectionInfo | null;
}

export class BridgeServer {
  private readonly http: Server;
  private readonly wss: WebSocketServer;
  private readonly options: BridgeServerOptions;
  private readonly log: Logger;
  private readonly sessions = new Map<number, Session>();
  private readonly startedAt = Date.now();
  private nextSessionId = 1;
  private commandCounter = 0;
  private boundPort = 0;

  private constructor(options: BridgeServerOptions) {
    this.options = options;
    this.log = options.log;

    this.http = createServer((request, response) => {
      this.serveHttp(request, response.writeHead.bind(response), response);
    });

    // `noServer: false` via the `server` option, so `ws` handles the upgrade
    // handshake and this class only sees established connections.
    this.wss = new WebSocketServer({ server: this.http });
    this.wss.on("connection", (ws, request) => {
      this.accept(ws, request);
    });
  }

  /**
   * Binds a port and starts listening.
   *
   * Scans the range rather than failing on a taken port, because running one
   * bridge per editor is the normal case, not an edge case.
   */
  static async start(options: BridgeServerOptions): Promise<BridgeServer> {
    const server = new BridgeServer(options);
    const candidates =
      options.port === undefined ? BRIDGE_PORTS : [options.port];

    let lastError: unknown = null;

    for (const port of candidates) {
      try {
        await server.listen(port);
        return server;
      } catch (error) {
        lastError = error;
      }
    }

    await server.stop();

    const range =
      options.port === undefined
        ? `ports ${BRIDGE_PORTS[0]}-${BRIDGE_PORTS[BRIDGE_PORTS.length - 1]}`
        : `port ${options.port}`;
    throw new Error(
      `Could not bind ${range} on ${HOST}. ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  private listen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (error: Error) => {
        this.http.removeListener("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        this.http.removeListener("error", onError);

        // Read the port back rather than trusting the requested one. Port 0 means
        // "any free port", which the tests use to avoid colliding with a bridge
        // the developer has running, and in that case the requested value is not
        // the bound one.
        const address = this.http.address();
        this.boundPort =
          typeof address === "object" && address !== null ? address.port : port;

        resolve();
      };

      this.http.once("error", onError);
      this.http.once("listening", onListening);
      this.http.listen(port, HOST);
    });
  }

  get port(): number {
    return this.boundPort;
  }

  get owner(): OwnerIdentity | null {
    const { owner } = this.options;
    return owner === null ? null : { id: owner.id, handle: owner.handle };
  }

  /** Authenticated connections, newest first. */
  sessionList(): PluginSession[] {
    return [...this.sessions.values()]
      .map((session) => ({
        sessionId: session.sessionId,
        authenticated: session.authenticated,
        document: session.document,
        figmaUser: session.figmaUser,
        userMatch: session.userMatch,
        connectedAt: session.connectedAt,
        commandCount: session.commandCount,
      }))
      .sort((a, b) => b.connectedAt - a.connectedAt);
  }

  health(): BridgeHealth {
    let authenticated = 0;
    for (const session of this.sessions.values()) {
      if (session.authenticated) authenticated += 1;
    }

    return {
      service: "kiro-figma-bridge",
      status: "ok",
      protocolVersion: PROTOCOL_VERSION,
      serverVersion: SERVER_VERSION,
      requiresPairing: this.options.pairing.required,
      plugins: authenticated,
      owner: this.owner,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  /** The most recent selection reported by the target file. */
  latestSelection(documentId?: string): SelectionInfo | null {
    const session = this.pick(documentId);
    return session === null ? null : session.latestSelection;
  }

  /** Buffered document events, newest last. */
  recentEvents(documentId?: string, limit = EVENT_BUFFER): RecordedEvent[] {
    const session = this.pick(documentId);
    if (session === null) return [];
    return session.events.slice(-Math.max(1, limit));
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * Runs a command in a connected plugin and resolves with its result.
   *
   * @param documentId Target a specific file. Defaults to the most recently
   *   connected one, which is almost always the file the user is looking at.
   */
  async command(
    method: string,
    params: Record<string, unknown> = {},
    options: {
      documentId?: string | undefined;
      timeoutMs?: number | undefined;
    } = {},
  ): Promise<unknown> {
    const session = this.pick(options.documentId);

    if (session === null) {
      throw new Error(
        this.sessions.size === 0
          ? `No Figma file is connected. Open the Kiro Figma Bridge plugin in Figma; it will find this server on port ${this.boundPort}.`
          : "A plugin is connected but has not finished pairing. Check the pairing code in the plugin window.",
      );
    }

    this.commandCounter += 1;
    const id = `cmd-${this.commandCounter}`;
    const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;

    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        session.pending.delete(id);
        reject(
          new Error(
            `${method} did not complete within ${timeoutMs}ms. The Figma plugin window may be closed or busy.`,
          ),
        );
      }, timeoutMs);

      session.pending.set(id, { resolve, reject, timer, method });
    });

    session.commandCount += 1;

    try {
      session.ws.send(JSON.stringify({ id, method, params }));
    } catch (error) {
      const entry = session.pending.get(id);
      if (entry !== undefined) {
        clearTimeout(entry.timer);
        session.pending.delete(id);
      }
      throw new Error(`Could not send ${method} to Figma`, { cause: error });
    }

    return promise;
  }

  /**
   * Chooses the session a command should go to.
   *
   * Newest-first rather than a stable choice: with two Figma files open, the one
   * the user just opened the plugin in is the one they mean.
   */
  private pick(documentId?: string): Session | null {
    const authenticated = [...this.sessions.values()]
      .filter((session) => session.authenticated)
      .sort((a, b) => b.connectedAt - a.connectedAt);

    if (documentId === undefined) return authenticated[0] ?? null;
    return (
      authenticated.find(
        (session) => session.document?.documentId === documentId,
      ) ?? null
    );
  }

  // ---------------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------------

  private serveHttp(
    request: IncomingMessage,
    writeHead: (status: number, headers?: Record<string, string>) => void,
    response: { end: (body?: string) => void },
  ): void {
    if (!this.hostAllowed(request)) {
      writeHead(403, { "Content-Type": "text/plain" });
      response.end("Forbidden");
      return;
    }

    if (request.url === "/health" || request.url === "/") {
      writeHead(200, {
        "Content-Type": "application/json",
        // The plugin iframe is a `null` origin, which `*` covers and an explicit
        // origin would not.
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(this.health()));
      return;
    }

    writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not Found");
  }

  /**
   * Rejects requests whose `Host` is not a loopback name.
   *
   * Closes DNS rebinding: an attacker's page cannot point `evil.example.com` at
   * 127.0.0.1 and reach this server, because the browser sends that name in
   * `Host` and it is not on this list. The socket is already bound to loopback,
   * so this is the second of the two checks that attack needs to pass.
   */
  private hostAllowed(request: IncomingMessage): boolean {
    const header = request.headers.host;
    if (header === undefined) return false;

    // Strip the port, and the brackets IPv6 literals carry.
    const name = header
      .replace(/:\d+$/, "")
      .replace(/^\[/, "")
      .replace(/\]$/, "");

    return name === "localhost" || name === "127.0.0.1" || name === "::1";
  }

  // ---------------------------------------------------------------------------
  // WebSocket lifecycle
  // ---------------------------------------------------------------------------

  private accept(ws: WebSocket, request: IncomingMessage): void {
    if (!this.hostAllowed(request)) {
      this.log(
        "warn",
        `Refused a WebSocket with Host: ${request.headers.host ?? "(none)"}`,
      );
      ws.close(CLOSE_AUTH_FAILED, "Host not allowed");
      return;
    }

    const sessionId = this.nextSessionId++;
    const session: Session = {
      sessionId,
      ws,
      // 32 bytes so a nonce is never repeated across the lifetime of anything.
      nonce: randomBytes(32).toString("hex"),
      connectedAt: Date.now(),
      authenticated: false,
      document: null,
      figmaUser: null,
      userMatch: "skipped",
      commandCount: 0,
      authTimer: null,
      pending: new Map(),
      events: [],
      latestSelection: null,
    };

    this.sessions.set(sessionId, session);
    this.log("debug", `Connection ${sessionId} opened, awaiting pairing`);

    session.authTimer = setTimeout(() => {
      if (session.authenticated) return;
      this.log("warn", `Connection ${sessionId} never paired; closing`);
      ws.close(CLOSE_AUTH_TIMEOUT, "Pairing timeout");
    }, AUTH_TIMEOUT_MS);

    ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
      this.receive(session, frameToText(raw));
    });

    ws.on("close", (code: number, reason: Buffer) => {
      this.discard(
        session,
        `close ${code}${reason.length > 0 ? ` ${reason.toString()}` : ""}`,
      );
    });

    ws.on("error", (error: Error) => {
      this.log("debug", `Connection ${sessionId} error: ${error.message}`);
    });

    this.send(session, {
      type: "SERVER_HELLO",
      data: {
        protocolVersion: PROTOCOL_VERSION,
        serverVersion: SERVER_VERSION,
        port: this.boundPort,
        pid: process.pid,
        startedAt: this.startedAt,
        requiresPairing: this.options.pairing.required,
        owner: this.owner,
        nonce: session.nonce,
      },
    });
  }

  private send(session: Session, payload: unknown): void {
    try {
      session.ws.send(JSON.stringify(payload));
    } catch (error) {
      this.log(
        "debug",
        `Could not write to connection ${session.sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private discard(session: Session, why: string): void {
    if (session.authTimer !== null) {
      clearTimeout(session.authTimer);
      session.authTimer = null;
    }

    // Fail everything still in flight. Without this each caller waits out its own
    // timeout and reports "timed out" when the real cause was a disconnect.
    for (const [, pending] of session.pending) {
      clearTimeout(pending.timer);
      pending.reject(
        new Error(`${pending.method} failed: the Figma plugin disconnected`),
      );
    }
    session.pending.clear();

    if (this.sessions.delete(session.sessionId) && session.authenticated) {
      const name = session.document?.fileName ?? "a file";
      this.log("info", `Disconnected from ${name} (${why})`);
    } else {
      this.log("debug", `Connection ${session.sessionId} gone (${why})`);
    }
  }

  private receive(session: Session, raw: string): void {
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      this.log("warn", `Connection ${session.sessionId} sent a non-JSON frame`);
      return;
    }

    const framed = message as { type?: unknown; id?: unknown };

    if (framed.type === "CLIENT_AUTH") {
      this.authenticate(session, message as ClientAuthMessage);
      return;
    }

    // Everything past the handshake requires an authenticated socket. This is the
    // check that makes the pairing code mean anything.
    if (!session.authenticated) {
      const kind = typeof framed.type === "string" ? framed.type : "a reply";
      this.log(
        "warn",
        `Connection ${session.sessionId} sent ${kind} before pairing; ignored`,
      );
      return;
    }

    if (typeof framed.id === "string") {
      this.settle(session, message as CommandReply);
      return;
    }

    if (typeof framed.type === "string") {
      this.record(session, message as PluginEvent);
      return;
    }

    this.log(
      "debug",
      `Connection ${session.sessionId} sent an unrecognised frame`,
    );
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  private authenticate(session: Session, message: ClientAuthMessage): void {
    const data = message.data;

    const refuse = (code: AuthFailureCode, why: string, closeCode: number) => {
      this.log(
        "warn",
        `Pairing refused for connection ${session.sessionId}: ${why}`,
      );
      this.send(session, {
        type: "AUTH_RESULT",
        ok: false,
        code,
        message: why,
      });
      session.ws.close(closeCode, why);
    };

    if (
      typeof data !== "object" ||
      data === null ||
      typeof data.proof !== "string" ||
      typeof data.document !== "object" ||
      data.document === null ||
      typeof data.document.documentId !== "string"
    ) {
      refuse(
        "MALFORMED",
        "The pairing request was malformed.",
        CLOSE_AUTH_FAILED,
      );
      return;
    }

    if (data.protocolVersion !== PROTOCOL_VERSION) {
      refuse(
        "PROTOCOL_MISMATCH",
        `Plugin speaks protocol v${String(data.protocolVersion)}, this server speaks v${PROTOCOL_VERSION}. Update whichever is older.`,
        CLOSE_PROTOCOL_MISMATCH,
      );
      return;
    }

    const figmaUser = normalizeUser(data.figmaUser);

    if (this.options.pairing.required) {
      // An unconfigured server refuses everything, before any comparison happens.
      //
      // Without this check the empty code is a working credential: the server
      // would compute its expected proof from `""`, a client that also has no code
      // computes the identical proof, and they match. That would turn the most
      // likely misconfiguration — `FIGMA_ACCESS_TOKEN` not set — into a bridge that
      // accepts any local process. Failing closed has to be explicit.
      if (this.options.pairing.code === "") {
        refuse(
          "BAD_PAIR_CODE",
          "This server has no pairing code configured. Set FIGMA_ACCESS_TOKEN where the bridge runs and restart it.",
          CLOSE_AUTH_FAILED,
        );
        return;
      }

      // Recomputed from the values this server was handed, so a client cannot
      // present a proof for one document and then claim to be another: changing
      // either field changes the expected proof.
      const expected = authProof(this.options.pairing.code, {
        nonce: session.nonce,
        documentId: data.document.documentId,
        figmaUserId: figmaUser?.id ?? null,
      });

      if (!timingSafeEqualHex(expected, data.proof)) {
        refuse(
          "BAD_PAIR_CODE",
          "That pairing code is not correct for this server.",
          CLOSE_AUTH_FAILED,
        );
        return;
      }
    }

    const userMatch = this.compareUser(figmaUser);

    if (userMatch === "mismatch" && this.options.requireUserMatch) {
      refuse(
        "USER_MISMATCH",
        "This Figma editor is signed in as a different account than the bridge's access token.",
        CLOSE_AUTH_FAILED,
      );
      return;
    }

    // A newer connection for the same file displaces the older one. Two sockets
    // for one document happen routinely — reopening the plugin window, or Figma
    // reloading the iframe — and the stale one would otherwise keep receiving
    // commands it can no longer answer.
    for (const other of this.sessions.values()) {
      if (other.sessionId === session.sessionId) continue;
      if (!other.authenticated) continue;
      if (other.document?.documentId !== data.document.documentId) continue;

      this.log(
        "debug",
        `Replacing connection ${other.sessionId} for the same file`,
      );
      other.ws.close(CLOSE_REPLACED, "Replaced by a newer connection");
    }

    if (session.authTimer !== null) {
      clearTimeout(session.authTimer);
      session.authTimer = null;
    }

    session.authenticated = true;
    session.document = data.document;
    session.figmaUser = figmaUser;
    session.userMatch = userMatch;

    const warning =
      userMatch === "mismatch"
        ? "This editor is signed in as a different Figma account than the bridge's access token."
        : data.document.documentIdPersisted
          ? null
          : "This file is read-only, so its bridge id is not stable between sessions.";

    this.send(session, {
      type: "AUTH_RESULT",
      ok: true,
      owner: this.owner,
      userMatch,
      warning,
    });

    this.log(
      "info",
      `Paired with "${data.document.fileName}" (${data.document.editorType}${figmaUser?.name == null ? "" : `, ${figmaUser.name}`})`,
    );

    if (warning !== null) this.log("warn", warning);
  }

  /**
   * Compares the editor's user to the token owner.
   *
   * `unknown` rather than `mismatch` when either id is missing: the plugin cannot
   * read `figma.currentUser` in every context, and treating "could not tell" as
   * "wrong person" would refuse legitimate connections.
   */
  private compareUser(figmaUser: FigmaUserRef | null): UserMatch {
    const owner = this.options.owner;
    if (owner === null) return "skipped";

    const editorId = figmaUser?.id ?? null;
    if (editorId === null) return "unknown";

    return editorId === owner.id ? "match" : "mismatch";
  }

  // ---------------------------------------------------------------------------
  // Replies and events
  // ---------------------------------------------------------------------------

  private settle(session: Session, reply: CommandReply): void {
    const pending = session.pending.get(reply.id);
    if (pending === undefined) {
      // A reply that arrived after its timeout, or a duplicate.
      this.log("debug", `Unmatched reply ${reply.id}`);
      return;
    }

    clearTimeout(pending.timer);
    session.pending.delete(reply.id);

    if ("error" in reply) {
      pending.reject(new Error(reply.error));
      return;
    }
    pending.resolve(reply.result);
  }

  private record(session: Session, event: PluginEvent): void {
    if (event.type === "SELECTION_CHANGE") {
      session.latestSelection = event.data;
    }
    if (event.type === "DOCUMENT_INFO") {
      session.document = event.data;
    }

    session.events.push({
      documentId: session.document?.documentId ?? null,
      event,
      receivedAt: Date.now(),
    });

    // Bounded: the plugin can stay open for days, and a busy file emits a change
    // event every few hundred milliseconds.
    if (session.events.length > EVENT_BUFFER) {
      session.events = session.events.slice(-EVENT_BUFFER);
    }
  }

  // ---------------------------------------------------------------------------
  // Shutdown
  // ---------------------------------------------------------------------------

  async stop(): Promise<void> {
    for (const session of [...this.sessions.values()]) {
      this.discard(session, "server shutting down");
      try {
        session.ws.close(1001, "Server shutting down");
      } catch {
        // Already closed.
      }
    }

    await new Promise<void>((resolve) => {
      this.wss.close(() => {
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      this.http.close(() => {
        resolve();
      });
    });
  }
}

/**
 * Decodes an inbound WebSocket frame to text.
 *
 * `ws` hands over one of three representations depending on how the frame arrived
 * — a `Buffer`, an `ArrayBuffer`, or a list of `Buffer`s when the message was
 * fragmented. A bare `.toString()` on the union produces `"[object ArrayBuffer]"`
 * for the second case, which then fails to parse as JSON for a reason nothing in
 * the log would explain.
 */
function frameToText(raw: Buffer | ArrayBuffer | Buffer[]): string {
  if (Array.isArray(raw)) return Buffer.concat(raw).toString("utf8");
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString("utf8");
  return raw.toString("utf8");
}

/** Coerces the reported Figma user into the shape the server stores. */
function normalizeUser(raw: unknown): FigmaUserRef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  return {
    id: typeof value.id === "string" ? value.id : null,
    name: typeof value.name === "string" ? value.name : null,
  };
}
