/**
 * A stand-in for the Figma plugin, speaking the real protocol over a real socket.
 *
 * Deliberately not a mock of the server. The tests drive an actual
 * `BridgeServer` over an actual WebSocket, because the handshake is the thing most
 * worth testing and a mocked transport would test the test instead. This helper is
 * only the client half — the part that in production lives in the plugin iframe.
 *
 * It can also misbehave on purpose: sign the wrong document, use the wrong pairing
 * code, or claim the wrong protocol version, so the server's refusals can be
 * checked rather than assumed.
 */

import { WebSocket } from "ws";
import { authProof, PROTOCOL_VERSION } from "../../dist/shared/protocol.js";

const DEFAULT_DOCUMENT = {
  documentId: "doc_test_0001",
  fileName: "Test File",
  currentPage: "Page 1",
  currentPageId: "0:1",
  selectionCount: 0,
  editorType: "figma",
  documentIdPersisted: true,
};

/**
 * Connects and completes (or deliberately fails) the handshake.
 *
 * @param {object} options
 * @param {number} options.port Server port.
 * @param {string} [options.pairCode] Code used to compute the proof.
 * @param {object} [options.document] Document identity to report.
 * @param {object|null} [options.figmaUser] Figma user to report.
 * @param {string} [options.signDocumentId] Sign a different document id than the
 *   one reported, to check the server binds the two together.
 * @param {string} [options.signFigmaUserId] Same, for the user id.
 * @param {number} [options.protocolVersion] Claim a different protocol version.
 * @param {boolean} [options.skipAuth] Connect but never send `CLIENT_AUTH`.
 * @param {(command: object) => unknown} [options.onCommand] Handles commands. The
 *   returned value is sent as the result; throwing sends the error.
 */
export async function connectFakePlugin(options) {
  const document = options.document ?? DEFAULT_DOCUMENT;
  const figmaUser =
    options.figmaUser === undefined
      ? { id: "user-1", name: "Test User" }
      : options.figmaUser;

  const ws = new WebSocket(`ws://127.0.0.1:${options.port}`);

  /** Every frame received, in arrival order. */
  const frames = [];
  const waiters = [];
  /** Resolved when the socket closes, with the close code and reason. */
  let closeInfo = null;
  const closeWaiters = [];

  const deliver = (frame) => {
    frames.push(frame);
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      if (waiters[i].predicate(frame)) {
        waiters[i].resolve(frame);
        waiters.splice(i, 1);
      }
    }
  };

  ws.on("message", (raw) => {
    let frame;
    try {
      frame = JSON.parse(raw.toString());
    } catch {
      return;
    }

    deliver(frame);

    // Auto-reply to commands, which is what the real UI relay does.
    if (typeof frame.id === "string" && typeof frame.method === "string") {
      if (options.onCommand === undefined) return;
      try {
        const result = options.onCommand(frame);
        ws.send(JSON.stringify({ id: frame.id, result }));
      } catch (error) {
        ws.send(JSON.stringify({ id: frame.id, error: error.message }));
      }
    }
  });

  ws.on("close", (code, reason) => {
    closeInfo = { code, reason: reason.toString() };
    for (const resolve of closeWaiters.splice(0)) resolve(closeInfo);
  });

  const waitFor = (predicate, timeoutMs = 5000) => {
    const existing = frames.find(predicate);
    if (existing !== undefined) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = waiters.findIndex((entry) => entry.resolve === wrapped);
        if (index !== -1) waiters.splice(index, 1);
        reject(new Error("Timed out waiting for a matching frame"));
      }, timeoutMs);

      const wrapped = (value) => {
        clearTimeout(timer);
        resolve(value);
      };

      waiters.push({ predicate, resolve: wrapped });
    });
  };

  const waitForType = (type, timeoutMs) =>
    waitFor((frame) => frame.type === type, timeoutMs);

  const waitForClose = (timeoutMs = 5000) => {
    if (closeInfo !== null) return Promise.resolve(closeInfo);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Timed out waiting for the socket to close"));
      }, timeoutMs);
      closeWaiters.push((info) => {
        clearTimeout(timer);
        resolve(info);
      });
    });
  };

  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  const hello = await waitForType("SERVER_HELLO");

  if (options.skipAuth === true) {
    return {
      ws,
      hello,
      frames,
      waitFor,
      waitForType,
      waitForClose,
      close: () => {
        ws.close();
      },
    };
  }

  const proof = authProof(options.pairCode ?? "", {
    nonce: hello.data.nonce,
    // Signing a different id than the one reported is how a tampering client is
    // simulated.
    documentId: options.signDocumentId ?? document.documentId,
    figmaUserId:
      options.signFigmaUserId === undefined
        ? (figmaUser?.id ?? null)
        : options.signFigmaUserId,
  });

  ws.send(
    JSON.stringify({
      type: "CLIENT_AUTH",
      data: {
        protocolVersion: options.protocolVersion ?? PROTOCOL_VERSION,
        pluginVersion: "0.1.0-test",
        proof,
        document,
        figmaUser,
      },
    }),
  );

  const authResult = await waitForType("AUTH_RESULT");

  return {
    ws,
    hello,
    authResult,
    frames,
    waitFor,
    waitForType,
    waitForClose,
    /** Sends a plugin event, as the real UI does on selection change. */
    sendEvent: (event) => {
      ws.send(JSON.stringify(event));
    },
    close: () => {
      ws.close();
    },
  };
}

export { DEFAULT_DOCUMENT };
