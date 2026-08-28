/**
 * A stand-in for the Figma Console MCP harness.
 *
 * Speaks enough of the real protocol to exercise a bridge plugin end to end:
 * serves `/health`, accepts a WebSocket, sends `SERVER_HELLO`, waits for
 * `FILE_INFO`, and lets you issue commands from the terminal.
 *
 * Two uses:
 *
 *   1. Manual — run it, open the plugin in Figma, and drive commands by hand to
 *      watch selection reporting and node highlighting without needing an agent
 *      or the real harness installed.
 *   2. Automated — imported by the tests as a real server the transport connects
 *      to over a real socket.
 *
 * Usage:
 *   node tools/mock-mcp-server.mjs [--port 9223]
 *
 * Once a plugin connects, type a command at the prompt:
 *   GET_FILE_INFO
 *   GET_SELECTION
 *   HIGHLIGHT_NODES {"nodeIds":["1:23"],"reason":"manual test"}
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const SERVER_VERSION = "mock-1.0.0";

/**
 * Starts a mock harness.
 *
 * @param {object} [options]
 * @param {number} [options.port] Port to bind. Defaults to 9223.
 * @param {boolean} [options.quiet] Suppress logging, for tests.
 * @param {boolean} [options.brokenHealth] Serve a body that is not a harness
 *   payload, to check the plugin declines to dial it.
 */
export async function startMockHarness(options = {}) {
  const port = options.port ?? 9223;
  const quiet = options.quiet ?? false;
  const brokenHealth = options.brokenHealth ?? false;

  const log = (...args) => {
    if (!quiet) console.log("[mock-harness]", ...args);
  };

  /** @type {Set<import("ws").WebSocket>} */
  const sockets = new Set();
  /** Frames received from plugins, in arrival order. */
  const received = [];
  /** Resolvers waiting on a matching frame. */
  const waiters = [];
  /** Pending command replies keyed by request id. */
  const pending = new Map();

  const startedAt = Date.now();

  const http = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          brokenHealth
            ? { hello: "not a harness" }
            : {
                status: "ok",
                version: SERVER_VERSION,
                clients: sockets.size,
                connectedClients: sockets.size,
                uptime: Math.floor((Date.now() - startedAt) / 1000),
              },
        ),
      );
      return;
    }
    res.writeHead(404).end("Not Found");
  });

  const wss = new WebSocketServer({ server: http });

  wss.on("connection", (ws) => {
    sockets.add(ws);
    log(`plugin connected (${sockets.size} total)`);

    ws.send(
      JSON.stringify({
        type: "SERVER_HELLO",
        data: {
          port,
          pid: process.pid,
          serverVersion: SERVER_VERSION,
          startedAt,
        },
      }),
    );

    ws.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        log("received non-JSON frame");
        return;
      }

      received.push(message);

      // Settle a command we issued.
      if (typeof message.id === "string" && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error !== undefined) reject(new Error(message.error));
        else resolve(message.result);
      }

      if (message.type !== undefined) {
        log(`event ${message.type}`);
      }

      // Wake anything waiting for this frame.
      for (let i = waiters.length - 1; i >= 0; i -= 1) {
        if (waiters[i].predicate(message)) {
          waiters[i].resolve(message);
          waiters.splice(i, 1);
        }
      }
    });

    ws.on("close", () => {
      sockets.delete(ws);
      log(`plugin disconnected (${sockets.size} remaining)`);
    });
  });

  await new Promise((resolve, reject) => {
    http.once("error", reject);
    http.listen(port, "127.0.0.1", resolve);
  });

  log(`listening on http://localhost:${port} (ws + /health)`);

  return {
    port,
    get connectionCount() {
      return sockets.size;
    },
    get frames() {
      return received;
    },

    /** Waits for a frame matching `predicate`, or rejects on timeout. */
    waitFor(predicate, timeoutMs = 5000) {
      const existing = received.find(predicate);
      if (existing !== undefined) return Promise.resolve(existing);

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((w) => w.resolve === wrapped);
          if (index !== -1) waiters.splice(index, 1);
          reject(new Error("Timed out waiting for a matching frame"));
        }, timeoutMs);

        const wrapped = (value) => {
          clearTimeout(timer);
          resolve(value);
        };

        waiters.push({ predicate, resolve: wrapped });
      });
    },

    /** Waits for a frame of the given `type`. */
    waitForType(type, timeoutMs = 5000) {
      return this.waitFor((frame) => frame.type === type, timeoutMs);
    },

    /** Issues a command and resolves with its result. */
    command(method, params = {}, timeoutMs = 10_000) {
      const target = [...sockets][0];
      if (target === undefined) {
        return Promise.reject(new Error("No plugin connected"));
      }

      const id = `mock-${Math.random().toString(36).slice(2, 10)}`;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });

        target.send(JSON.stringify({ id, method, params }));
      });
    },

    /**
     * Closes every socket with a graceful close frame.
     *
     * Use for codes the protocol permits on the wire. 1006 is not one of them —
     * it means "connection lost with no close frame", so it can only be observed,
     * never sent. Use {@link dropAll} to produce it.
     */
    closeAll(code = 1000, reason = "") {
      for (const ws of sockets) ws.close(code, reason);
    },

    /**
     * Kills every socket without a close frame.
     *
     * Reproduces a harness process dying or a cable being pulled: the client sees
     * code 1006, which is the case the automatic retry exists for.
     */
    dropAll() {
      for (const ws of sockets) ws.terminate();
      sockets.clear();
    },

    async stop() {
      for (const ws of sockets) ws.terminate();
      sockets.clear();
      await new Promise((resolve) => wss.close(resolve));
      await new Promise((resolve) => http.close(resolve));
    },
  };
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

const isMain = process.argv[1]?.endsWith("mock-mcp-server.mjs") ?? false;

if (isMain) {
  const portFlag = process.argv.indexOf("--port");
  const port =
    portFlag !== -1 && process.argv[portFlag + 1] !== undefined
      ? Number.parseInt(process.argv[portFlag + 1], 10)
      : 9223;

  const harness = await startMockHarness({ port });

  console.log("");
  console.log("Type a command and press enter. Examples:");
  console.log("  GET_FILE_INFO");
  console.log("  GET_SELECTION");
  console.log('  HIGHLIGHT_NODES {"nodeIds":["1:23"],"reason":"manual test"}');
  console.log("Ctrl+C to stop.");
  console.log("");

  process.stdin.setEncoding("utf8");
  let buffer = "";

  process.stdin.on("data", (chunk) => {
    buffer += chunk;

    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line === "") continue;

      const space = line.indexOf(" ");
      const method = space === -1 ? line : line.slice(0, space);
      const rest = space === -1 ? "" : line.slice(space + 1).trim();

      let params = {};
      if (rest !== "") {
        try {
          params = JSON.parse(rest);
        } catch {
          console.error("params must be valid JSON");
          continue;
        }
      }

      harness
        .command(method, params)
        .then((result) => {
          console.log(`${method} →`, JSON.stringify(result, null, 2));
        })
        .catch((error) => {
          console.error(`${method} failed:`, error.message);
        });
    }
  });

  const shutdown = async () => {
    await harness.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
