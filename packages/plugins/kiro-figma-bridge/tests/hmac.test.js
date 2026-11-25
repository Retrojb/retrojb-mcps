/**
 * Checks the hand-rolled SHA-256 and HMAC against Node's own implementation.
 *
 * This is the test that justifies shipping hand-written crypto at all. The plugin
 * needs one synchronous implementation that runs in the Figma sandbox, in the
 * plugin iframe, and on Node, and `node:crypto` exists in only the last of those.
 * Divergence between this implementation and the reference would not show up as a
 * wrong hash anywhere visible — it would show up as a handshake that always fails,
 * which is a miserable thing to debug. So it is checked here instead, on published
 * vectors and on random input.
 */

import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { test } from "node:test";
import {
  hmacHex,
  hmacSha256,
  sha256,
  sha256Hex,
  timingSafeEqualHex,
  toHex,
  utf8Bytes,
} from "../dist/shared/hmac.js";

const reference = {
  sha256: (bytes) => createHash("sha256").update(bytes).digest("hex"),
  hmac: (key, message) =>
    createHmac("sha256", key).update(message).digest("hex"),
};

test("sha256 matches the published empty-string vector", () => {
  assert.equal(
    sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("sha256 matches the published 'abc' vector", () => {
  assert.equal(
    sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("hmac-sha256 matches RFC 4231 test case 2", () => {
  // Key "Jefe", data "what do ya want for nothing?".
  assert.equal(
    hmacHex("Jefe", "what do ya want for nothing?"),
    "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
  );
});

test("sha256 matches node:crypto across every block-boundary length", () => {
  // 0 through 130 bytes covers an empty message, the 55/56-byte padding
  // boundary where the length no longer fits in the first block, the exact
  // 64-byte block, and two full blocks. Those boundaries are where a padding bug
  // hides.
  for (let length = 0; length <= 130; length += 1) {
    const bytes = randomBytes(length);
    assert.equal(
      toHex(sha256(new Uint8Array(bytes))),
      reference.sha256(bytes),
      `sha256 diverged at length ${length}`,
    );
  }
});

test("hmac-sha256 matches node:crypto across key and message lengths", () => {
  // Keys shorter than, equal to, and longer than the 64-byte block exercise the
  // three separate paths RFC 2104 specifies for key normalisation.
  for (const keyLength of [1, 32, 63, 64, 65, 100, 200]) {
    for (const messageLength of [0, 1, 63, 64, 65, 200]) {
      const key = randomBytes(keyLength);
      const message = randomBytes(messageLength);

      assert.equal(
        toHex(hmacSha256(new Uint8Array(key), new Uint8Array(message))),
        reference.hmac(key, message),
        `hmac diverged at key ${keyLength} / message ${messageLength}`,
      );
    }
  }
});

test("utf8Bytes matches TextEncoder, including astral characters", () => {
  const encoder = new TextEncoder();
  const samples = [
    "",
    "plain ascii",
    "café",
    "日本語のレイヤー名",
    "emoji 🎨 in a layer name",
    "family 👩‍👩‍👦 with zero-width joiners",
    "mixed 𝄞 clef and ünïcödé",
  ];

  for (const sample of samples) {
    assert.deepEqual(
      [...utf8Bytes(sample)],
      [...encoder.encode(sample)],
      `utf8 encoding diverged for ${JSON.stringify(sample)}`,
    );
  }
});

test("utf8Bytes replaces a lone surrogate the way TextEncoder does", () => {
  const encoder = new TextEncoder();
  // A high surrogate with nothing following it is not a valid code point, and
  // both encoders must agree on the replacement rather than producing different
  // bytes for the same string.
  const lonely = "before \ud800 after";
  assert.deepEqual([...utf8Bytes(lonely)], [...encoder.encode(lonely)]);
});

test("hmac over non-ascii input matches node:crypto", () => {
  // The proof is computed over file and page names, which are frequently not
  // ascii. A mismatch here would break pairing only for those users.
  const key = "6KWKBYAS";
  const message = "kiro-figma-bridge/auth/v1\nnonce\ndoc_日本語_🎨\n12345";

  assert.equal(
    hmacHex(key, message),
    reference.hmac(Buffer.from(key, "utf8"), Buffer.from(message, "utf8")),
  );
});

test("timingSafeEqualHex accepts equal strings and rejects differences", () => {
  assert.equal(timingSafeEqualHex("abcdef", "abcdef"), true);
  assert.equal(timingSafeEqualHex("abcdef", "abcdeF"), false);
  assert.equal(timingSafeEqualHex("abcdef", "abcde"), false);
  assert.equal(timingSafeEqualHex("", ""), true);

  // Differing in the last position must be rejected just as reliably as
  // differing in the first — the whole point of the comparison.
  assert.equal(timingSafeEqualHex("0".repeat(64), `${"0".repeat(63)}1`), false);
  assert.equal(timingSafeEqualHex(`1${"0".repeat(63)}`, "0".repeat(64)), false);
});
