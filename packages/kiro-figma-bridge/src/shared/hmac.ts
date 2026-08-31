/**
 * SHA-256 and HMAC-SHA256, implemented from the spec with no dependencies.
 *
 * Hand-rolled crypto normally deserves suspicion, so the reasoning matters. The
 * bridge handshake has to compute the same HMAC in three places:
 *
 * - the **plugin iframe**, where `crypto.subtle` exists but is only guaranteed in
 *   a secure context, and a Figma plugin iframe is a `null`-origin sandbox whose
 *   secure-context inheritance is not something worth betting the handshake on;
 * - the **Figma sandbox**, which has no Web Crypto at all;
 * - **Node**, in the tests and on the server.
 *
 * A single synchronous implementation compiled into all three removes an entire
 * class of "works in tests, silently fails in Figma" bug, and lets the proof be
 * computed without an `await` in the socket's `onopen` path.
 *
 * This is a well-specified, fixed-size hash with a public test-vector suite —
 * `tests/hmac.test.mjs` checks it against `node:crypto` on random inputs, so a
 * divergence fails the build rather than the handshake. It is used only to prove
 * possession of a pairing code, never to encrypt anything.
 */

/** SHA-256 round constants: the first 32 bits of the cube roots of the first 64 primes. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** Initial hash state: the first 32 bits of the square roots of the first 8 primes. */
const H0 = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
]);

const BLOCK_BYTES = 64;
const DIGEST_BYTES = 32;

/**
 * Reads a word from the message schedule.
 *
 * `noUncheckedIndexedAccess` widens every typed-array read to
 * `number | undefined`. Each index below is proven in range by its loop bounds,
 * so the fallback is unreachable — it exists so the arithmetic stays total
 * without scattering non-null assertions through the round function.
 */
function word(words: Uint32Array, index: number): number {
  return words[index] ?? 0;
}

/** Rotates a 32-bit word right by `bits`. */
function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

/** SHA-256 over `message`, returning the 32-byte digest. */
export function sha256(message: Uint8Array): Uint8Array {
  // Padding: a single 0x80 byte, then zeros, then the message length in bits as
  // a 64-bit big-endian integer, to the next whole 64-byte block.
  const paddedLength = ((message.length + 9 + (BLOCK_BYTES - 1)) >>> 6) << 6;
  const block = new Uint8Array(paddedLength);
  block.set(message);
  block[message.length] = 0x80;

  const view = new DataView(block.buffer, block.byteOffset, block.byteLength);

  // The high word of the 64-bit length. Every message this is used on is a few
  // hundred bytes, so it is always zero, but writing both halves keeps the
  // padding spec-exact rather than accidentally-correct.
  const bitLength = message.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const h = H0.slice();
  const schedule = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += BLOCK_BYTES) {
    for (let i = 0; i < 16; i += 1) {
      schedule[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const a = word(schedule, i - 15);
      const b = word(schedule, i - 2);
      const s0 = (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) >>> 0;
      const s1 = (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) >>> 0;
      schedule[i] =
        (word(schedule, i - 16) + s0 + word(schedule, i - 7) + s1) >>> 0;
    }

    let a = word(h, 0);
    let b = word(h, 1);
    let c = word(h, 2);
    let d = word(h, 3);
    let e = word(h, 4);
    let f = word(h, 5);
    let g = word(h, 6);
    let hh = word(h, 7);

    for (let i = 0; i < 64; i += 1) {
      const sigma1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const choose = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (hh + sigma1 + choose + word(K, i) + word(schedule, i)) >>> 0;
      const sigma0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (sigma0 + majority) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h[0] = (word(h, 0) + a) >>> 0;
    h[1] = (word(h, 1) + b) >>> 0;
    h[2] = (word(h, 2) + c) >>> 0;
    h[3] = (word(h, 3) + d) >>> 0;
    h[4] = (word(h, 4) + e) >>> 0;
    h[5] = (word(h, 5) + f) >>> 0;
    h[6] = (word(h, 6) + g) >>> 0;
    h[7] = (word(h, 7) + hh) >>> 0;
  }

  const digest = new Uint8Array(DIGEST_BYTES);
  const out = new DataView(digest.buffer);
  for (let i = 0; i < 8; i += 1) out.setUint32(i * 4, word(h, i), false);
  return digest;
}

/** HMAC-SHA256 of `message` under `key`, per RFC 2104. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  // Keys longer than the block size are hashed down first; shorter keys are
  // zero-padded up. Both are required by the spec, not optimisations.
  const normalized = new Uint8Array(BLOCK_BYTES);
  normalized.set(key.length > BLOCK_BYTES ? sha256(key) : key);

  const inner = new Uint8Array(BLOCK_BYTES + message.length);
  const outer = new Uint8Array(BLOCK_BYTES + DIGEST_BYTES);

  for (let i = 0; i < BLOCK_BYTES; i += 1) {
    const byte = normalized[i] ?? 0;
    inner[i] = byte ^ 0x36;
    outer[i] = byte ^ 0x5c;
  }

  inner.set(message, BLOCK_BYTES);
  outer.set(sha256(inner), BLOCK_BYTES);

  return sha256(outer);
}

// -----------------------------------------------------------------------------
// Encoding helpers
// -----------------------------------------------------------------------------

/**
 * UTF-8 encodes a string without `TextEncoder`.
 *
 * `TextEncoder` is absent from the Figma sandbox realm, and this runs there.
 * Surrogate pairs are combined into one code point; a lone surrogate becomes
 * U+FFFD, which is what `TextEncoder` does too.
 */
export function utf8Bytes(input: string): Uint8Array {
  const bytes: number[] = [];

  for (let i = 0; i < input.length; i += 1) {
    let code = input.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      } else {
        code = 0xfffd;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = 0xfffd;
    }

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  return new Uint8Array(bytes);
}

const HEX = "0123456789abcdef";

/** Lowercase hex for `bytes`. */
export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0;
    out += HEX[byte >> 4] ?? "0";
    out += HEX[byte & 0x0f] ?? "0";
  }
  return out;
}

/**
 * Compares two strings in time independent of where they first differ.
 *
 * The handshake compares an attacker-supplied proof against the expected one. A
 * plain `===` leaks the length of the matching prefix through timing, which over
 * enough attempts recovers the value a byte at a time. Local-only traffic makes
 * that hard to exploit, but the mitigation is three lines.
 *
 * Length is compared up front — unavoidable, and both sides are fixed-length
 * hex digests, so it reveals nothing.
 */
export function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let i = 0; i < left.length; i += 1) {
    difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return difference === 0;
}

/** HMAC-SHA256 of a string message under a string key, as lowercase hex. */
export function hmacHex(key: string, message: string): string {
  return toHex(hmacSha256(utf8Bytes(key), utf8Bytes(message)));
}

/** SHA-256 of a string, as lowercase hex. */
export function sha256Hex(input: string): string {
  return toHex(sha256(utf8Bytes(input)));
}
