/**
 * Build output integrity.
 *
 * These checks exist because the build can succeed while producing something
 * Figma cannot run, and the failure mode is silent. An early version of the HTML
 * template named its own placeholder tokens in a comment, so the injection landed
 * in the comment and shipped a plugin window with no styles and no behaviour —
 * with the build reporting success.
 *
 * The context checks matter for the same reason: referencing `figma` from the UI
 * or `document` from the sandbox compiles and bundles cleanly, then throws at
 * runtime inside Figma where it is awkward to debug.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { before, describe, it } from "node:test";

const run = promisify(execFile);
const pkgRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dist = path.join(pkgRoot, "dist");

let code = "";
let ui = "";
let manifest = {};

before(async () => {
  await run(process.execPath, ["build.mjs"], { cwd: pkgRoot });

  [code, ui] = await Promise.all([
    readFile(path.join(dist, "code.js"), "utf8"),
    readFile(path.join(dist, "ui.html"), "utf8"),
  ]);
  manifest = JSON.parse(
    await readFile(path.join(dist, "manifest.json"), "utf8"),
  );
});

describe("manifest", () => {
  it("points at the built files by bare name", () => {
    // Figma resolves both relative to the manifest, which sits beside them.
    assert.equal(manifest.main, "code.js");
    assert.equal(manifest.ui, "ui.html");
  });

  it("allows every port in the harness range over both schemes", () => {
    for (let port = 9223; port <= 9232; port += 1) {
      assert.ok(
        manifest.networkAccess.allowedDomains.includes(
          `http://localhost:${port}`,
        ),
        `missing http entry for ${port}`,
      );
      assert.ok(
        manifest.networkAccess.allowedDomains.includes(
          `ws://localhost:${port}`,
        ),
        `missing ws entry for ${port}`,
      );
    }
  });

  it("declares what the plugin needs from Figma", () => {
    // dynamic-page is what obliges the async node APIs used throughout.
    assert.equal(manifest.documentAccess, "dynamic-page");
    // Required for figma.fileKey, which the harness routes on.
    assert.equal(manifest.enablePrivatePluginApi, true);
    assert.ok(manifest.networkAccess.reasoning.length > 20);
  });
});

describe("ui.html", () => {
  it("has no unreplaced template tokens", () => {
    assert.doesNotMatch(ui, /BRIDGE_STYLES|BRIDGE_SCRIPT/);
  });

  it("actually inlined the stylesheet", () => {
    // A rule that only exists in styles.css, so its presence proves injection
    // rather than coincidence.
    assert.match(ui, /focus-visible/);
    assert.match(ui, /prefers-color-scheme/);
  });

  it("actually inlined the script", () => {
    assert.match(ui, /localhost:/);
    assert.ok(ui.length > 20_000, `ui.html is only ${ui.length} bytes`);
  });

  it("is self-contained", () => {
    // Figma loads this file directly with no server, so any external reference
    // would simply fail to resolve.
    assert.doesNotMatch(ui, /<script[^>]+\ssrc=/i);
    assert.doesNotMatch(ui, /<link[^>]+stylesheet/i);
  });

  it("does not reach for the Figma plugin API", () => {
    // The iframe has no `figma` global. These would be runtime-only failures.
    for (const forbidden of [
      "figma.currentPage",
      "figma.root",
      "figma.ui",
      "figma.getNodeByIdAsync",
      "figma.createRectangle",
      "figma.clientStorage",
    ]) {
      assert.ok(
        !ui.includes(forbidden),
        `ui.html must not use ${forbidden} — the UI context has no figma global`,
      );
    }
  });
});

describe("code.js", () => {
  it("does not reach for browser-only APIs", () => {
    // The sandbox has no DOM and no network. Property access survives
    // minification, so these patterns are reliable.
    for (const forbidden of [
      "document.createElement",
      "document.getElementById",
      "window.addEventListener",
      "new WebSocket",
      "localStorage",
    ]) {
      assert.ok(
        !code.includes(forbidden),
        `code.js must not use ${forbidden} — the sandbox has no DOM or network`,
      );
    }
  });

  it("uses the async node APIs that dynamic-page requires", () => {
    assert.match(code, /getNodeByIdAsync/);
    // The synchronous forms throw under documentAccess: dynamic-page.
    assert.ok(!/figma\.getNodeById\(/.test(code));
  });

  it("registers the lifecycle hooks the cleanup guarantees depend on", () => {
    for (const event of ["selectionchange", "currentpagechange", "close"]) {
      assert.ok(code.includes(event), `missing figma.on("${event}") handler`);
    }
  });

  it("uses the granular change events, not documentchange, by default", () => {
    // Figma recommends nodechange/stylechange precisely because
    // `documentchange` forces a full-document load under dynamic-page.
    assert.match(code, /nodechange/);
    assert.match(code, /stylechange/);
    // documentchange is still present for the opt-in full-document mode, but it
    // must be reachable only behind an explicit loadAllPagesAsync call.
    assert.match(code, /loadAllPagesAsync/);
  });

  it("is a single self-contained script", () => {
    assert.doesNotMatch(code, /\brequire\(/);
    assert.doesNotMatch(code, /^\s*import\s/m);
    assert.doesNotMatch(code, /^\s*export\s/m);
  });
});
