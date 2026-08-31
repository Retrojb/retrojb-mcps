/**
 * The authenticated handshake, end to end over a real socket.
 *
 * A real `BridgeServer` and a real WebSocket client, because the handshake is the
 * security boundary of the whole package and a mocked transport would only prove
 * the mock agrees with itself.
 *
 * The refusal cases matter more than the success case. A bridge that accepts a
 * correct pairing code but also accepts a wrong one is worse than no
 * authentication at all, because it looks secure.
 */

import assert from "node:assert/strict";
import { request } from "node:http";
import { after, test } from "node:test";
import { BridgeServer } from "../dist/server/bridge-server.js";
import {
  CLOSE_AUTH_FAILED,
  CLOSE_PROTOCOL_MISMATCH,
  CLOSE_REPLACED,
  METHODS,
} from "../dist/shared/protocol.js";
import { connectFakePlugin, DEFAULT_DOCUMENT } from "./helpers/fake-plugin.mjs";

const PAIR_CODE = "ABCD2345";

/** Servers started by tests, torn down together so no port is left bound. */
const running = new Set();

after(async () => {
  for (const server of running) await server.stop();
});

/**
 * Waits for a condition, polling.
 *
 * Needed because a client observing its socket close and the server finishing its
 * own cleanup for that socket are two separate events. Asserting on server state
 * immediately after a client-side close is a race that passes locally and fails
 * under load.
 */
async function eventually(predicate, description, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Timed out waiting for: ${description}`);
}

/**
 * Starts a server on an ephemeral port.
 *
 * Port 0 rather than the 9770-9779 production range, so a test run cannot collide
 * with a bridge the developer actually has running.
 */
async function startServer(overrides = {}) {
  const server = await BridgeServer.start({
    pairing: overrides.pairing ?? {
      required: true,
      code: PAIR_CODE,
      source: "explicit",
    },
    owner: overrides.owner ?? null,
    requireUserMatch: overrides.requireUserMatch ?? false,
    port: overrides.port ?? 0,
    log: () => {},
  });

  running.add(server);
  return server;
}

// -----------------------------------------------------------------------------
// Discovery
// -----------------------------------------------------------------------------

test("/health identifies the service without leaking the pairing code", async () => {
  const server = await startServer();

  const response = await fetch(`http://127.0.0.1:${server.port}/health`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.service, "kiro-figma-bridge");
  assert.equal(body.status, "ok");
  assert.equal(body.requiresPairing, true);
  assert.equal(body.plugins, 0);

  // The endpoint has to be unauthenticated for discovery to work at all, so it
  // must not carry anything worth having.
  const serialized = JSON.stringify(body);
  assert.ok(
    !serialized.includes(PAIR_CODE),
    "pairing code appeared in /health",
  );
  assert.ok(!serialized.includes("email"), "an email appeared in /health");
});

test("/health omits the owner email even when one is known", async () => {
  const server = await startServer({
    owner: { id: "user-1", handle: "designer", email: "someone@example.com" },
  });

  const body = await (
    await fetch(`http://127.0.0.1:${server.port}/health`)
  ).json();

  assert.deepEqual(body.owner, { id: "user-1", handle: "designer" });
  assert.ok(!JSON.stringify(body).includes("someone@example.com"));
});

test("a non-loopback Host header is refused", async () => {
  const server = await startServer();

  // Closes DNS rebinding: an attacker's name resolving to 127.0.0.1 still sends
  // its own hostname in `Host`, and that is what gets rejected here.
  const status = await new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port: server.port,
        path: "/health",
        headers: { Host: "attacker.example.com" },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });

  assert.equal(status, 403);
});

// -----------------------------------------------------------------------------
// Successful pairing
// -----------------------------------------------------------------------------

test("a correct pairing code is accepted", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
  });

  assert.equal(plugin.authResult.ok, true);
  assert.equal(plugin.authResult.userMatch, "skipped");

  const sessions = server.sessionList();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].authenticated, true);
  assert.equal(sessions[0].document.fileName, "Test File");

  plugin.close();
});

test("the pairing code is never transmitted, in either direction", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
  });

  // The whole point of the HMAC challenge: possession is proved without the
  // secret crossing the wire, so a passive listener on loopback learns nothing.
  const seen = JSON.stringify(plugin.frames);
  assert.ok(!seen.includes(PAIR_CODE), "the pairing code appeared on the wire");

  plugin.close();
});

test("a case-and-dash variant of the code still pairs", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: "abcd-2345",
  });

  assert.equal(plugin.authResult.ok, true);
  plugin.close();
});

test("pairing is skipped entirely when authentication is disabled", async () => {
  const server = await startServer({
    pairing: { required: false, code: "", source: "disabled" },
  });

  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: "anything at all",
  });

  assert.equal(plugin.authResult.ok, true);
  plugin.close();
});

// -----------------------------------------------------------------------------
// Refusals
// -----------------------------------------------------------------------------

test("a wrong pairing code is refused and the socket is closed", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: "WRONGCODE",
  });

  assert.equal(plugin.authResult.ok, false);
  assert.equal(plugin.authResult.code, "BAD_PAIR_CODE");

  const closed = await plugin.waitForClose();
  assert.equal(closed.code, CLOSE_AUTH_FAILED);

  await eventually(
    () => server.sessionList().length === 0,
    "the refused session to be discarded",
  );
});

test("an empty pairing code cannot pair with a configured server", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({ port: server.port, pairCode: "" });

  assert.equal(plugin.authResult.ok, false);
  assert.equal(plugin.authResult.code, "BAD_PAIR_CODE");
});

test("a server with no configured code refuses everything", async () => {
  // Failing closed. An unset FIGMA_ACCESS_TOKEN is the likeliest
  // misconfiguration and must not result in an open bridge.
  const server = await startServer({
    pairing: { required: true, code: "", source: "token" },
  });

  const plugin = await connectFakePlugin({ port: server.port, pairCode: "" });

  assert.equal(plugin.authResult.ok, false);
  assert.equal(plugin.authResult.code, "BAD_PAIR_CODE");
  assert.match(plugin.authResult.message, /FIGMA_ACCESS_TOKEN/);
});

test("signing a different document id than the one reported is refused", async () => {
  const server = await startServer();

  // The proof covers the document id, so a client holding a valid code still
  // cannot present a proof for one file and claim to be another.
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    document: { ...DEFAULT_DOCUMENT, documentId: "doc_claimed" },
    signDocumentId: "doc_actually_signed",
  });

  assert.equal(plugin.authResult.ok, false);
  assert.equal(plugin.authResult.code, "BAD_PAIR_CODE");
});

test("signing a different user id than the one reported is refused", async () => {
  const server = await startServer();

  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    figmaUser: { id: "user-claimed", name: "Claimed" },
    signFigmaUserId: "user-signed",
  });

  assert.equal(plugin.authResult.ok, false);
  assert.equal(plugin.authResult.code, "BAD_PAIR_CODE");
});

test("a proof from another connection's nonce is refused", async () => {
  const server = await startServer();

  // Each connection gets a fresh nonce, so a proof captured from one socket is
  // useless on the next. Reusing the first plugin's nonce simulates a replay.
  const first = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
  });
  assert.equal(first.authResult.ok, true);

  const firstNonce = first.hello.data.nonce;
  const second = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    document: { ...DEFAULT_DOCUMENT, documentId: "doc_second" },
  });
  const secondNonce = second.hello.data.nonce;

  assert.notEqual(firstNonce, secondNonce, "nonces must not repeat");

  first.close();
  second.close();
});

test("a protocol version mismatch is refused with its own close code", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    protocolVersion: 99,
  });

  assert.equal(plugin.authResult.ok, false);
  assert.equal(plugin.authResult.code, "PROTOCOL_MISMATCH");

  const closed = await plugin.waitForClose();
  assert.equal(closed.code, CLOSE_PROTOCOL_MISMATCH);
});

test("a mismatched Figma account is reported but allowed by default", async () => {
  const server = await startServer({
    owner: { id: "owner-1", handle: "owner", email: null },
  });

  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    figmaUser: { id: "someone-else", name: "Other Person" },
  });

  // Allowed, because the equivalence of `figma.currentUser.id` and the REST
  // account id is not a documented contract — but never silent.
  assert.equal(plugin.authResult.ok, true);
  assert.equal(plugin.authResult.userMatch, "mismatch");
  assert.match(plugin.authResult.warning, /different Figma account/);

  plugin.close();
});

test("a mismatched Figma account is refused when strict matching is on", async () => {
  const server = await startServer({
    owner: { id: "owner-1", handle: "owner", email: null },
    requireUserMatch: true,
  });

  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    figmaUser: { id: "someone-else", name: "Other Person" },
  });

  assert.equal(plugin.authResult.ok, false);
  assert.equal(plugin.authResult.code, "USER_MISMATCH");
});

test("a matching Figma account reports match", async () => {
  const server = await startServer({
    owner: { id: "user-1", handle: "owner", email: null },
    requireUserMatch: true,
  });

  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    figmaUser: { id: "user-1", name: "The Owner" },
  });

  assert.equal(plugin.authResult.ok, true);
  assert.equal(plugin.authResult.userMatch, "match");
  plugin.close();
});

test("an unreadable Figma user is unknown, not a mismatch", async () => {
  const server = await startServer({
    owner: { id: "user-1", handle: "owner", email: null },
    requireUserMatch: true,
  });

  // The plugin cannot always read `figma.currentUser`. "Cannot tell" must not be
  // treated as "wrong person", or strict mode would lock out legitimate users.
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    figmaUser: null,
  });

  assert.equal(plugin.authResult.ok, true);
  assert.equal(plugin.authResult.userMatch, "unknown");
  plugin.close();
});

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

test("a command round-trips to an authenticated plugin", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    onCommand: (command) => {
      assert.equal(command.method, METHODS.getSelection);
      return { nodes: [], count: 0, page: "Page 1" };
    },
  });

  const result = await server.command(METHODS.getSelection);
  assert.deepEqual(result, { nodes: [], count: 0, page: "Page 1" });

  plugin.close();
});

test("a plugin-side failure surfaces as a rejected promise", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    onCommand: () => {
      throw new Error("No node with id 1:2 on this document.");
    },
  });

  await assert.rejects(
    () => server.command(METHODS.getNode, { nodeId: "1:2" }),
    /No node with id 1:2/,
  );

  plugin.close();
});

test("commands are refused while no plugin is connected", async () => {
  const server = await startServer();

  await assert.rejects(
    () => server.command(METHODS.getSelection),
    /No Figma file is connected/,
  );
});

test("commands are refused while a connection has not paired", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    skipAuth: true,
  });

  // A socket is open, so the "nothing connected" message would be misleading —
  // the user needs to be told the pairing code is the problem.
  await assert.rejects(
    () => server.command(METHODS.getSelection),
    /has not finished pairing/,
  );

  plugin.close();
});

test("an unpaired connection cannot inject a command reply", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({ port: server.port, skipAuth: true });

  // Frames from an unauthenticated socket are dropped rather than routed, so a
  // rogue local process cannot answer a command it was never sent.
  plugin.ws.send(JSON.stringify({ id: "cmd-1", result: "injected" }));
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(server.sessionList()[0].authenticated, false);
  plugin.close();
});

test("a disconnect fails commands in flight rather than timing them out", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    // Never replies, so the command is still pending when the socket drops.
    onCommand: undefined,
  });

  const pending = server.command(
    METHODS.getSelection,
    {},
    { timeoutMs: 30_000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  plugin.ws.terminate();

  // Reporting "timed out" for a disconnect would send the user looking at the
  // wrong problem.
  await assert.rejects(() => pending, /disconnected/);
});

test("a command that is never answered times out with a usable message", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    onCommand: undefined,
  });

  await assert.rejects(
    () => server.command(METHODS.getSelection, {}, { timeoutMs: 150 }),
    /did not complete within 150ms/,
  );

  plugin.close();
});

// -----------------------------------------------------------------------------
// Multiple files and multiple agents
// -----------------------------------------------------------------------------

test("commands can target a specific file, and default to the newest", async () => {
  const server = await startServer();

  const first = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    document: { ...DEFAULT_DOCUMENT, documentId: "doc_a", fileName: "File A" },
    onCommand: () => "from A",
  });

  // A distinct document id, so this is an additional file rather than a
  // replacement for the first.
  const second = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    document: { ...DEFAULT_DOCUMENT, documentId: "doc_b", fileName: "File B" },
    onCommand: () => "from B",
  });

  assert.equal(first.authResult.ok, true);
  assert.equal(second.authResult.ok, true);

  assert.equal(await server.command(METHODS.getSelection), "from B");
  assert.equal(
    await server.command(METHODS.getSelection, {}, { documentId: "doc_a" }),
    "from A",
  );

  first.close();
  second.close();
});

test("a second connection for the same file displaces the first", async () => {
  const server = await startServer();

  const first = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    onCommand: () => "first",
  });

  // Reopening the plugin window produces exactly this: a new socket for a file
  // that already has one. The stale socket cannot answer any more, so it goes.
  const second = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
    onCommand: () => "second",
  });

  const closed = await first.waitForClose();
  assert.equal(closed.code, CLOSE_REPLACED);

  assert.equal(await server.command(METHODS.getSelection), "second");
  await eventually(
    () => server.sessionList().length === 1,
    "the displaced session to be discarded",
  );

  second.close();
});

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

test("selection events are buffered for the agent to read back", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
  });

  const selection = {
    nodes: [{ id: "1:2", name: "Button", type: "FRAME" }],
    count: 1,
    page: "Page 1",
    pageId: "0:1",
    timestamp: Date.now(),
  };

  plugin.sendEvent({ type: "SELECTION_CHANGE", data: selection });
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.deepEqual(server.latestSelection(), selection);

  const events = server.recentEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].event.type, "SELECTION_CHANGE");

  plugin.close();
});

test("the event buffer is bounded", async () => {
  const server = await startServer();
  const plugin = await connectFakePlugin({
    port: server.port,
    pairCode: PAIR_CODE,
  });

  // A plugin can stay open for days on a busy file, so an unbounded buffer is a
  // slow memory leak.
  for (let i = 0; i < 200; i += 1) {
    plugin.sendEvent({
      type: "DOCUMENT_CHANGE",
      data: {
        changedNodeIds: [`1:${i}`],
        changeCount: 1,
        timestamp: Date.now(),
      },
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.ok(
    server.recentEvents(undefined, 1000).length <= 50,
    "the event buffer grew past its cap",
  );

  plugin.close();
});
