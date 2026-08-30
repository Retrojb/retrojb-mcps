import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  camelCase,
  clamp,
  collapseWhitespace,
  errorMessage,
  formatBytes,
  hasErrorCode,
  kebabCase,
  pascalCase,
  pluralize,
  roundTo,
  sum,
  toError,
  truncate,
} from "../dist/index.js";

describe("truncate", () => {
  it("leaves short text alone", () => {
    assert.equal(truncate("hello", 10), "hello");
    assert.equal(truncate("hello", 5), "hello");
  });

  it("never exceeds max, counting the ellipsis", () => {
    // The length guarantee is the whole point: callers use this to fit fixed-width
    // output and protocol limits.
    for (const max of [1, 2, 3, 5, 10, 20]) {
      assert.ok(
        truncate("x".repeat(100), max).length <= max,
        `exceeded max ${max}`,
      );
    }
  });

  it("appends an ellipsis when it truncates", () => {
    assert.equal(truncate("abcdefghij", 5), "abcd…");
  });

  it("matches the behaviour of the helpers it replaced", () => {
    // The three copies in wcag-a11y-scanner all did slice(0, max - 1) + "…".
    const text = "abcdefghij";
    assert.equal(truncate(text, 5), `${text.slice(0, 4)}…`);
  });

  it("collapses whitespace only when asked", () => {
    const messy = "a\n\n   b\tc";
    assert.equal(truncate(messy, 50), messy);
    assert.equal(truncate(messy, 50, { collapse: true }), "a b c");
  });

  it("handles a degenerate max", () => {
    assert.equal(truncate("abc", 0), "");
    assert.equal(truncate("abc", -1), "");
    // No room for content beside the ellipsis, so return raw characters.
    assert.equal(truncate("abcdef", 1).length, 1);
  });

  it("supports a custom ellipsis", () => {
    assert.equal(truncate("abcdefgh", 6, { ellipsis: "..." }), "abc...");
  });
});

describe("collapseWhitespace", () => {
  it("collapses runs and trims", () => {
    assert.equal(collapseWhitespace("  a \n\t b  "), "a b");
    assert.equal(collapseWhitespace(""), "");
  });
});

describe("case conversion", () => {
  it("kebab-cases assorted input", () => {
    assert.equal(kebabCase("My Test Lib"), "my-test-lib");
    assert.equal(kebabCase("someCamelCase"), "some-camel-case");
    assert.equal(kebabCase("already-kebab"), "already-kebab");
    assert.equal(kebabCase("snake_case_name"), "snake-case-name");
    assert.equal(kebabCase("dots.in.name"), "dots-in-name");
  });

  it("strips characters illegal in a package name or path", () => {
    // Scaffolding turns user input into a directory name, so this has to be safe.
    assert.equal(kebabCase("bad/../name"), "badname");
    assert.equal(kebabCase("weird!@#$name"), "weirdname");
    assert.equal(kebabCase("..."), "");
    assert.equal(kebabCase("  "), "");
  });

  it("pascal- and camel-cases", () => {
    assert.equal(pascalCase("my test lib"), "MyTestLib");
    assert.equal(pascalCase("token-lint"), "TokenLint");
    assert.equal(camelCase("token-lint"), "tokenLint");
  });
});

describe("pluralize", () => {
  it("agrees with the count", () => {
    assert.equal(pluralize(0, "file"), "0 files");
    assert.equal(pluralize(1, "file"), "1 file");
    assert.equal(pluralize(2, "file"), "2 files");
  });

  it("accepts an irregular plural", () => {
    assert.equal(pluralize(2, "entry", "entries"), "2 entries");
  });
});

describe("formatBytes", () => {
  it("scales through the units", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(1024), "1.0 KB");
    assert.equal(formatBytes(1024 * 1024), "1.0 MB");
    assert.equal(formatBytes(1024 * 1024 * 1024), "1.0 GB");
  });

  it("drops the decimal once the number is large enough to not need it", () => {
    assert.equal(formatBytes(1024 * 20), "20 KB");
  });

  it("does not pretend to know about nonsense", () => {
    assert.equal(formatBytes(Number.NaN), "unknown");
    assert.equal(formatBytes(-1), "unknown");
  });
});

describe("errorMessage", () => {
  it("reads an Error", () => {
    assert.equal(errorMessage(new Error("boom")), "boom");
  });

  it("falls back to the name for a message-less Error", () => {
    const error = new Error("");
    assert.equal(errorMessage(error), "Error");
  });

  it("passes a string through", () => {
    assert.equal(errorMessage("plain"), "plain");
  });

  it("reads message or code off a plain object", () => {
    // Node system errors are plain objects, so this is the common case.
    assert.equal(errorMessage({ message: "from object" }), "from object");
    assert.equal(errorMessage({ code: "ENOENT" }), "ENOENT");
  });

  it("never produces [object Object]", () => {
    // The failure this function exists to prevent.
    for (const value of [{}, { a: 1 }, [], 42, null, undefined, true]) {
      assert.notEqual(errorMessage(value), "[object Object]");
    }
  });

  it("survives an unserialisable object", () => {
    const cyclic = {};
    cyclic.self = cyclic;
    assert.equal(errorMessage(cyclic), "[unserialisable error]");
  });
});

describe("toError", () => {
  it("passes an Error through unchanged", () => {
    const original = new Error("keep me");
    assert.equal(toError(original), original);
  });

  it("wraps a non-Error and preserves the original as cause", () => {
    const wrapped = toError({ message: "wrapped" });
    assert.ok(wrapped instanceof Error);
    assert.equal(wrapped.message, "wrapped");
    assert.deepEqual(wrapped.cause, { message: "wrapped" });
  });
});

describe("hasErrorCode", () => {
  it("identifies a Node system error", () => {
    assert.equal(hasErrorCode({ code: "ENOENT" }, "ENOENT"), true);
    assert.equal(hasErrorCode({ code: "EACCES" }, "ENOENT"), false);
    assert.equal(hasErrorCode(new Error("x"), "ENOENT"), false);
    assert.equal(hasErrorCode(null, "ENOENT"), false);
  });
});

describe("numbers", () => {
  it("clamps", () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-1, 0, 10), 0);
    assert.equal(clamp(11, 0, 10), 10);
  });

  it("rounds to a given precision", () => {
    assert.equal(roundTo(1.2345), 1.23);
    assert.equal(roundTo(1.2345, 3), 1.235);
    assert.equal(roundTo(10), 10);
  });

  it("sums", () => {
    assert.equal(sum([]), 0);
    assert.equal(sum([1, 2, 3]), 6);
  });
});
