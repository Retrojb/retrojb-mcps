/**
 * Checks what actually gets loaded into Figma.
 *
 * These assertions exist because the build has failure modes that produce a
 * *successful* build and a broken plugin: a template token that was never
 * replaced leaves a window with no styles, a manifest missing a port silently
 * blocks the connection, and code compiled into the wrong context throws only
 * once a user opens the plugin. None of that is caught by type-checking.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { BRIDGE_PORTS } from "../dist/shared/protocol.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "figma-plugin");

const read = (file) => readFile(path.join(dist, file), "utf8");

test("the UI shell has no unreplaced template tokens", async () => {
  const html = await read("ui.html");

  // A surviving token means the injection silently missed, which produces a
  // plugin window with no styles or no behaviour and a build that reported
  // success.
  assert.ok(!html.includes("<<BRIDGE_STYLES>>"), "the styles token survived");
  assert.ok(!html.includes("<<BRIDGE_SCRIPT>>"), "the script token survived");
});

test("the UI shell inlines its stylesheet and script", async () => {
  const html = await read("ui.html");

  // Figma loads one self-contained file, so neither asset may be a separate
  // request.
  assert.ok(
    html.includes("--figma-color-bg"),
    "the stylesheet was not inlined",
  );
  assert.ok(
    html.includes("kiro-figma-bridge/auth/v1"),
    "the auth code was not bundled into the UI",
  );
  assert.ok(
    !html.includes("<link"),
    "the UI references an external stylesheet",
  );
  assert.ok(
    !/<script[^>]+src=/.test(html),
    "the UI references an external script",
  );
});

test("the sandbox bundle never reaches for the network", async () => {
  const code = await read("code.js");

  // The Figma sandbox has no `WebSocket` or `fetch`. Either one appearing here
  // means transport code was compiled into the wrong half, which throws at
  // runtime inside Figma with a message that does not say why.
  assert.ok(!code.includes("new WebSocket"), "the sandbox opens a WebSocket");
  assert.ok(!code.includes("fetch("), "the sandbox calls fetch");
});

test("the sandbox bundle contains the sandbox's own code", async () => {
  const code = await read("code.js");

  // A string literal, so it survives minification and proves the right entry
  // point was bundled rather than an empty file.
  assert.ok(
    code.includes("kiroFigmaBridge.documentId"),
    "the document id module is missing from the sandbox bundle",
  );
  assert.ok(code.length > 5000, "the sandbox bundle is suspiciously small");
});

test("the built manifest points at the files beside it", async () => {
  const manifest = JSON.parse(await read("manifest.json"));

  // Figma resolves these relative to the manifest, so the source manifest's
  // `./dist/...` paths must be rewritten to bare filenames.
  assert.equal(manifest.main, "code.js");
  assert.equal(manifest.ui, "ui.html");
});

test("the manifest allows every port the plugin will scan", async () => {
  const manifest = JSON.parse(await read("manifest.json"));
  const allowed = manifest.networkAccess.allowedDomains;

  // Figma blocks any address not listed, and the failure is a silent connection
  // refusal — so a port added to the protocol without being added here would look
  // like a broken bridge.
  for (const port of BRIDGE_PORTS) {
    assert.ok(
      allowed.includes(`ws://localhost:${port}`),
      `ws://localhost:${port} is missing from allowedDomains`,
    );
    assert.ok(
      allowed.includes(`http://localhost:${port}`),
      `http://localhost:${port} is missing from allowedDomains`,
    );
  }
});

test("the manifest requests no remote network access", async () => {
  const manifest = JSON.parse(await read("manifest.json"));

  // The plugin talks only to the user's own machine. A non-localhost entry would
  // change that claim, and it is the first thing Figma shows on a plugin's
  // Community page.
  for (const domain of manifest.networkAccess.allowedDomains) {
    assert.match(
      domain,
      /^(https?|wss?):\/\/localhost(:\d+)?$/,
      `${domain} is not a localhost address`,
    );
  }
});

test("the manifest stays publishable to Figma Community", async () => {
  const manifest = JSON.parse(await read("manifest.json"));

  // `enablePrivatePluginApi` is only honoured for private organisation plugins.
  // Setting it would make this plugin unpublishable, and the code deliberately
  // does not depend on `figma.fileKey` so that it never needs to.
  assert.equal(
    manifest.enablePrivatePluginApi,
    undefined,
    "enablePrivatePluginApi blocks Community publishing",
  );

  // Needed for the identity check against the access token's owner.
  assert.ok(
    manifest.permissions.includes("currentuser"),
    "the currentuser permission is required to read figma.currentUser",
  );
});
