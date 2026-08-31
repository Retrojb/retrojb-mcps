/**
 * The pairing code that authorises a plugin to talk to this server.
 *
 * Why a derived code rather than the access token itself: `FIGMA_ACCESS_TOKEN` is
 * a real credential — it grants API access to the holder's whole Figma account —
 * and a Figma plugin is the last place it should end up. Plugin storage is not a
 * secret store, the local socket is plaintext, and any code the user pastes into a
 * plugin window is a code they might paste somewhere else. So the token never
 * leaves this process.
 *
 * Instead the server derives a short code from it with SHA-256. The derivation is
 * one-way, so the code cannot be turned back into the token, and it is
 * deterministic, so it stays the same until the token is rotated — the user types
 * it into the plugin once per machine rather than every session.
 *
 * The code is then used as an HMAC key, never sent over the wire. See
 * `authProof` in the shared protocol.
 */

import { sha256, utf8Bytes } from "../shared/hmac.js";
import { normalizePairCode } from "../shared/protocol.js";

/**
 * Crockford base32.
 *
 * `I`, `L`, `O` and `U` are absent: the first three are visually confusable with
 * `1`, `1` and `0` in most fonts, and this is a code a human reads off a terminal
 * and retypes into another window. `U` is dropped by the same convention to avoid
 * accidental words.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Characters in a derived code.
 *
 * Eight base32 characters is 40 bits. That is far too much to guess — a
 * trillion possibilities against a local server that logs every failure — while
 * still being short enough to retype without a copy-paste.
 */
const CODE_LENGTH = 8;

/** Domain separator, so this hash can never collide with another use of the token. */
const DERIVATION_PREFIX = "kiro-figma-bridge/pair-code/v1\n";

/** How the server obtained its pairing code. */
export type PairingSource = "token" | "explicit" | "disabled";

export interface PairingConfig {
  /** Whether a valid proof is demanded before a plugin may issue commands. */
  readonly required: boolean;
  /** The code, normalised. Empty when pairing is disabled. */
  readonly code: string;
  readonly source: PairingSource;
  /**
   * Variables whose value was still an unsubstituted placeholder — the literal
   * `${FIGMA_ACCESS_TOKEN}` rather than a token. Treated as unset, and reported
   * so the caller can name the culprit instead of describing a wrong code.
   */
  readonly unexpanded: readonly string[];
}

/**
 * Whether a value is a placeholder some other tool was supposed to substitute.
 *
 * MCP clients configure servers with `"env": {"FIGMA_ACCESS_TOKEN":
 * "${FIGMA_ACCESS_TOKEN}"}`, and when the referenced variable is missing from
 * the client's own environment — or not on its allow-list of variables it will
 * expand — some clients pass the placeholder through verbatim. The server then
 * receives a perfectly valid-looking 21-character "token".
 *
 * That is worth detecting because hashing is indiscriminate: `derivePairCode`
 * would happily turn `${FIGMA_ACCESS_TOKEN}` into a well-formed code, the
 * server would demand it, and no user could ever produce it. The plugin's only
 * symptom is `BAD_PAIR_CODE`, which sends the user hunting for a typo in a code
 * that was never the problem. Treating these as unset costs nothing — no real
 * token is shaped like this — and turns a dead end into a named cause.
 */
export function looksUnexpanded(value: string): boolean {
  return (
    /^\$\{[^}]*\}$/.test(value) || // ${VAR}   — POSIX shell, MCP configs
    /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(value) || // $VAR
    /^%[A-Za-z_][A-Za-z0-9_]*%$/.test(value) // %VAR%   — Windows
  );
}

/**
 * Derives the pairing code for an access token.
 *
 * Deterministic by design: the same token always yields the same code, on every
 * machine and after every restart, which is what lets the plugin remember it.
 */
export function derivePairCode(token: string): string {
  const digest = sha256(utf8Bytes(DERIVATION_PREFIX + token));

  // 5 bits per character, so 8 characters consume exactly 5 bytes with nothing
  // left over — no partial character to pad or discard.
  let bits = 0;
  let accumulator = 0;
  let out = "";

  for (let i = 0; out.length < CODE_LENGTH; i += 1) {
    accumulator = (accumulator << 8) | (digest[i] ?? 0);
    bits += 8;

    while (bits >= 5 && out.length < CODE_LENGTH) {
      bits -= 5;
      out += ALPHABET[(accumulator >>> bits) & 31] ?? "0";
    }
  }

  return out;
}

/** Groups a code for display: `ABCD2345` reads as `ABCD-2345`. */
export function formatPairCode(code: string): string {
  const normalized = normalizePairCode(code);
  if (normalized.length !== CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

/** Environment variables this module reads. Documented in the README. */
export interface PairingEnv {
  readonly FIGMA_ACCESS_TOKEN?: string | undefined;
  readonly KIRO_FIGMA_BRIDGE_PAIR_CODE?: string | undefined;
  readonly KIRO_FIGMA_BRIDGE_NO_AUTH?: string | undefined;
}

/**
 * Decides how this server will authenticate plugins.
 *
 * Precedence, highest first:
 *
 * 1. `KIRO_FIGMA_BRIDGE_NO_AUTH=1` — no authentication at all. Present because
 *    it is genuinely useful when developing the plugin itself, and refused
 *    loudly by the caller so it cannot be switched on unnoticed.
 * 2. `KIRO_FIGMA_BRIDGE_PAIR_CODE` — an explicit code. For sharing one bridge
 *    across two accounts, or for a code that must not change when the token is
 *    rotated.
 * 3. `FIGMA_ACCESS_TOKEN` — the normal path: derive from the token.
 *
 * With none of them set, pairing is still *required* and the code is empty, which
 * no plugin can produce a valid proof for. Failing closed matters here: an
 * unset environment variable is the most likely misconfiguration, and the safe
 * reading of it is "reject everything", not "let anything in".
 */
export function resolvePairing(env: PairingEnv): PairingConfig {
  if (env.KIRO_FIGMA_BRIDGE_NO_AUTH === "1") {
    return { required: false, code: "", source: "disabled", unexpanded: [] };
  }

  const unexpanded: string[] = [];

  // Reads a variable, discarding values that are placeholders rather than
  // values. Recording the name here is what lets the startup path say which
  // variable is wrong instead of just "no pairing code".
  const read = (name: keyof PairingEnv): string => {
    const value = env[name]?.trim() ?? "";
    if (value !== "" && looksUnexpanded(value)) {
      unexpanded.push(name);
      return "";
    }
    return value;
  };

  const explicit = read("KIRO_FIGMA_BRIDGE_PAIR_CODE");
  const token = read("FIGMA_ACCESS_TOKEN");

  if (explicit !== "") {
    return {
      required: true,
      code: normalizePairCode(explicit),
      source: "explicit",
      unexpanded,
    };
  }

  if (token !== "") {
    return {
      required: true,
      code: derivePairCode(token),
      source: "token",
      unexpanded,
    };
  }

  return { required: true, code: "", source: "token", unexpanded };
}
