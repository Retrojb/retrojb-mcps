/**
 * The pairing code: derivation, formatting, and how configuration is resolved.
 *
 * The properties tested here are the ones the security model rests on. The code
 * must be stable for a token (or the user retypes it constantly), must not be
 * reversible to the token, must not collide across tokens, and an unconfigured
 * server must fail closed rather than open.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  derivePairCode,
  formatPairCode,
  resolvePairing,
} from "../dist/server/pair-code.js";
import { normalizePairCode } from "../dist/shared/protocol.js";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

test("a derived code is 8 characters from the unambiguous alphabet", () => {
  const code = derivePairCode("figd_example");

  assert.equal(code.length, 8);
  for (const character of code) {
    assert.ok(
      ALPHABET.includes(character),
      `${character} is not in the pairing alphabet`,
    );
  }
});

test("the alphabet excludes visually confusable characters", () => {
  // I/L/O are confusable with 1/1/0 when read off a terminal and retyped, which
  // is exactly how this code is used.
  for (const excluded of ["I", "L", "O", "U"]) {
    assert.ok(
      !ALPHABET.includes(excluded),
      `${excluded} should not be in the alphabet`,
    );
  }
});

test("derivation is deterministic for the same token", () => {
  // This is what lets the plugin store the code once instead of prompting every
  // time the server restarts.
  assert.equal(derivePairCode("figd_abc"), derivePairCode("figd_abc"));
});

test("different tokens derive different codes", () => {
  const codes = new Set();
  for (let i = 0; i < 500; i += 1) codes.add(derivePairCode(`figd_token_${i}`));

  // 40 bits of output over 500 samples: a collision here would mean the
  // derivation is not spreading input across the digest.
  assert.equal(codes.size, 500);
});

test("a one-character token change changes the code", () => {
  assert.notEqual(derivePairCode("figd_abc"), derivePairCode("figd_abd"));
});

test("the code does not leak the token", () => {
  const token = "figd_super_secret_value";
  const code = derivePairCode(token);

  assert.ok(!token.toUpperCase().includes(code));
  assert.ok(!code.includes("SECRET"));
});

test("formatting groups the code and normalising reverses it", () => {
  const code = derivePairCode("figd_abc");
  const formatted = formatPairCode(code);

  assert.match(formatted, /^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.equal(normalizePairCode(formatted), code);
});

test("normalising is forgiving about case, dashes, and spaces", () => {
  // Users retype these, so all of these have to mean the same code — otherwise a
  // correct code looks wrong.
  for (const variant of [
    "abcd2345",
    "ABCD-2345",
    "abcd-2345",
    " ABCD 2345 ",
    "AB-CD-23-45",
  ]) {
    assert.equal(
      normalizePairCode(variant),
      "ABCD2345",
      `failed for ${variant}`,
    );
  }
});

test("an access token is the normal source of the code", () => {
  const config = resolvePairing({ FIGMA_ACCESS_TOKEN: "figd_abc" });

  assert.equal(config.required, true);
  assert.equal(config.source, "token");
  assert.equal(config.code, derivePairCode("figd_abc"));
});

test("an explicit code takes precedence over the token", () => {
  const config = resolvePairing({
    FIGMA_ACCESS_TOKEN: "figd_abc",
    KIRO_FIGMA_BRIDGE_PAIR_CODE: "manual-code",
  });

  assert.equal(config.source, "explicit");
  assert.equal(config.code, "MANUALCODE");
});

test("an empty environment still requires pairing, with no usable code", () => {
  // Failing closed is the point: an unset variable is the likeliest
  // misconfiguration, and it must reject every plugin rather than accept any.
  const config = resolvePairing({});

  assert.equal(config.required, true);
  assert.equal(config.code, "");
});

test("whitespace-only configuration is treated as unset", () => {
  const config = resolvePairing({
    FIGMA_ACCESS_TOKEN: "   ",
    KIRO_FIGMA_BRIDGE_PAIR_CODE: "  ",
  });

  assert.equal(config.required, true);
  assert.equal(config.code, "");
});

test("authentication is only disabled by the exact opt-out value", () => {
  assert.equal(
    resolvePairing({ KIRO_FIGMA_BRIDGE_NO_AUTH: "1" }).required,
    false,
  );

  // Anything else must not disable it. "true" and "0" are both plausible things
  // for someone to set while guessing, and neither should open the server up.
  for (const value of ["0", "true", "yes", "", "01"]) {
    assert.equal(
      resolvePairing({
        FIGMA_ACCESS_TOKEN: "figd_abc",
        KIRO_FIGMA_BRIDGE_NO_AUTH: value,
      }).required,
      true,
      `NO_AUTH=${JSON.stringify(value)} should not disable pairing`,
    );
  }
});
