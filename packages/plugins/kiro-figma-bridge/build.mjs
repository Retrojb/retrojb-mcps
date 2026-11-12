/**
 * Builds the Figma plugin half.
 *
 * Figma loads three files directly, with no module resolution and no network
 * fetch at load time:
 *
 *   dist/figma-plugin/manifest.json  — copied, entry paths rewritten
 *   dist/figma-plugin/code.js        — the sandbox bundle, one IIFE
 *   dist/figma-plugin/ui.html        — the UI, with CSS and JS inlined
 *
 * Two separate bundles because the contexts differ: the sandbox has the `figma`
 * global and no DOM, the UI has a DOM and no `figma`.
 *
 * Output goes to a `figma-plugin` subdirectory rather than `dist` itself because
 * `tsc` also emits into `dist` for the server half. Only this subtree is cleaned,
 * so the two builds are order-independent and neither deletes the other's output.
 *
 * Run with `--watch` to rebuild on change.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "src");
const dist = path.join(root, "dist", "figma-plugin");

const watch = process.argv.includes("--watch");

const STYLES_TOKEN = "/*<<BRIDGE_STYLES>>*/";
const SCRIPT_TOKEN = "/*<<BRIDGE_SCRIPT>>*/";

/**
 * Shared esbuild settings.
 *
 * `es2017` because Figma's sandbox is a JavaScript realm that has historically
 * lagged a full browser engine on newer syntax. Targeting down costs nothing here
 * and rules out a class of failure that only shows up at runtime inside Figma.
 *
 * `format: "iife"` because neither context supports ES modules: the sandbox
 * evaluates `code.js` as a plain script, and the UI script is inlined into HTML.
 */
const shared = {
  bundle: true,
  format: "iife",
  target: "es2017",
  logLevel: "silent",
  legalComments: "none",
  resolveExtensions: [".ts", ".js"],
  // Bundled from TypeScript source rather than from the package's built output,
  // which keeps this build independent of build order and rules out shipping a
  // stale dist. Mirrors the `paths` entry in tsconfig.base.json, so the compiler
  // and the bundler agree on what they are looking at.
  alias: {
    "@retrojb/plugin-kit": path.join(
      root,
      "..",
      "plugin-kit",
      "src",
      "index.ts",
    ),
  },
};

/** Bundles the sandbox half to a standalone script. */
async function buildSandbox(minify) {
  const result = await esbuild.build({
    ...shared,
    entryPoints: [path.join(src, "sandbox", "main.ts")],
    outfile: path.join(dist, "code.js"),
    minify,
    // The sandbox has no DOM. Naming the platform as neutral stops esbuild from
    // injecting browser-specific helper shims.
    platform: "neutral",
    mainFields: ["module", "main"],
    metafile: true,
  });

  return byteSize(result.metafile, path.join(dist, "code.js"));
}

/**
 * Bundles the UI half and inlines it into the HTML shell.
 *
 * Written to memory rather than disk first, because the output is a fragment of a
 * larger file rather than a file in its own right.
 */
async function buildUi(minify) {
  const [bundle, template, styles] = await Promise.all([
    esbuild.build({
      ...shared,
      entryPoints: [path.join(src, "ui", "main.ts")],
      write: false,
      minify,
      platform: "browser",
      metafile: true,
    }),
    readFile(path.join(src, "ui", "index.html"), "utf8"),
    readFile(path.join(src, "ui", "styles.css"), "utf8"),
  ]);

  const script = bundle.outputFiles[0]?.text ?? "";
  if (script === "") throw new Error("UI bundle produced no output");

  const css = minify
    ? (await esbuild.transform(styles, { loader: "css", minify: true })).code
    : styles;

  const html = injectAt(
    injectAt(template, STYLES_TOKEN, css),
    SCRIPT_TOKEN,
    script,
  );

  const outfile = path.join(dist, "ui.html");
  await writeFile(outfile, html, "utf8");

  return Buffer.byteLength(html, "utf8");
}

/**
 * Replaces `marker` with `value` literally, requiring exactly one occurrence.
 *
 * A literal replacement rather than a regex because the bundled script contains
 * `$&` and backtick sequences that a regex replacement would interpret, silently
 * corrupting the output.
 *
 * The uniqueness check is not defensive padding. If a marker appears twice —
 * because the template names its own markers in a comment, say — `indexOf` matches
 * the wrong one, injects there, and leaves the real marker untouched. The result
 * is a plugin window with no styles or no behaviour while the build reports
 * success. Ambiguity has to be an error, not a coin flip.
 */
function injectAt(source, marker, value) {
  const first = source.indexOf(marker);
  if (first === -1) throw new Error(`Template marker ${marker} not found`);

  const second = source.indexOf(marker, first + marker.length);
  if (second !== -1) {
    throw new Error(
      `Template marker ${marker} appears more than once; it must be unique`,
    );
  }

  return source.slice(0, first) + value + source.slice(first + marker.length);
}

/**
 * Copies the manifest, pointing `main` and `ui` at the built files.
 *
 * Figma resolves both relative to the manifest, so a manifest sitting alongside
 * `code.js` and `ui.html` needs bare filenames rather than the `./dist/...` paths
 * the source manifest carries for editing convenience.
 */
async function copyManifest() {
  const manifest = JSON.parse(
    await readFile(path.join(root, "manifest.json"), "utf8"),
  );

  manifest.main = "code.js";
  manifest.ui = "ui.html";

  const outfile = path.join(dist, "manifest.json");
  await writeFile(outfile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return outfile;
}

function byteSize(metafile, outfile) {
  const key = path.relative(process.cwd(), outfile);
  const entry =
    metafile.outputs[key] ??
    metafile.outputs[outfile] ??
    Object.values(metafile.outputs)[0];
  return entry?.bytes ?? 0;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function buildOnce({ minify }) {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const [codeBytes, uiBytes] = await Promise.all([
    buildSandbox(minify),
    buildUi(minify),
  ]);
  await copyManifest();

  return { codeBytes, uiBytes };
}

async function main() {
  // Unminified in watch mode: a readable stack trace in Figma's plugin console is
  // worth far more during development than a smaller bundle.
  const minify = !watch;

  try {
    const { codeBytes, uiBytes } = await buildOnce({ minify });

    console.log(
      `built code.js (${kb(codeBytes)}), ui.html (${kb(uiBytes)}), manifest.json`,
    );
    console.log(
      `import ${path.relative(process.cwd(), path.join(dist, "manifest.json"))} in Figma → Plugins → Development`,
    );
  } catch (error) {
    reportFailure(error);
    if (!watch) process.exitCode = 1;
    return;
  }

  if (!watch) return;

  // Polling rather than a watcher library: the source tree is small, and this
  // keeps the plugin free of a dev-only dependency.
  console.log("watching src/ for changes…");
  let lastRun = Date.now();

  setInterval(() => {
    void (async () => {
      const changed = await hasChangesSince(src, lastRun);
      if (!changed) return;

      lastRun = Date.now();
      try {
        const { codeBytes, uiBytes } = await buildOnce({ minify });
        console.log(
          `[${new Date().toLocaleTimeString()}] rebuilt code.js (${kb(codeBytes)}), ui.html (${kb(uiBytes)})`,
        );
      } catch (error) {
        reportFailure(error);
      }
    })();
  }, 500);
}

/** Whether any file under `dir` was modified after `since`. */
async function hasChangesSince(dir, since) {
  const { readdir, stat } = await import("node:fs/promises");

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (await hasChangesSince(full, since)) return true;
      continue;
    }
    const info = await stat(full);
    if (info.mtimeMs > since) return true;
  }
  return false;
}

function reportFailure(error) {
  if (error && Array.isArray(error.errors) && error.errors.length > 0) {
    for (const message of error.errors) {
      const where = message.location
        ? ` (${message.location.file}:${message.location.line})`
        : "";
      console.error(`build error: ${message.text}${where}`);
    }
    return;
  }
  console.error(`build failed: ${error?.message ?? String(error)}`);
}

if (!existsSync(path.join(root, "manifest.json"))) {
  console.error("manifest.json is missing from the package root");
  process.exitCode = 1;
} else {
  await main();
}
