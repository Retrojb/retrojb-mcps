/**
 * Bundles plugin TypeScript into a module Node can import.
 *
 * The plugin ships as two IIFE bundles for Figma, neither of which is importable.
 * Rather than test a reimplementation, these helpers run the real source through
 * esbuild to ESM so the tests exercise exactly what ships.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..", "..");

/**
 * Bundles `entry` (relative to the package root) and returns the loaded module.
 *
 * @param {string} entry e.g. `"src/ui/harness-pool.ts"`
 */
export async function importFromSource(entry) {
  const result = await esbuild.build({
    entryPoints: [path.join(pkgRoot, entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
    logLevel: "silent",
    resolveExtensions: [".ts", ".js"],
    alias: {
      "@retrojb/plugin-kit": path.join(
        pkgRoot,
        "..",
        "plugin-kit",
        "src",
        "index.ts",
      ),
    },
  });

  return load(result, path.basename(entry, ".ts"));
}

/**
 * Bundles several modules into a **single** module graph and returns the merged
 * exports.
 *
 * Use this when the modules under test share mutable module-level state. Separate
 * `importFromSource` calls produce independent bundles with independent state, so
 * a reset applied to one would not be visible to the other — which quietly makes
 * tests pass without exercising anything.
 *
 * @param {string[]} entries Paths relative to the package root.
 */
export async function importTogether(entries) {
  const contents = entries
    .map((entry) => `export * from ${JSON.stringify(`./${entry}`)};`)
    .join("\n");

  const result = await esbuild.build({
    stdin: {
      contents,
      resolveDir: pkgRoot,
      sourcefile: "test-barrel.ts",
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
    logLevel: "silent",
    resolveExtensions: [".ts", ".js"],
    alias: {
      "@retrojb/plugin-kit": path.join(
        pkgRoot,
        "..",
        "plugin-kit",
        "src",
        "index.ts",
      ),
    },
  });

  return load(result, "barrel");
}

async function load(result, name) {
  const code = result.outputFiles[0]?.text;
  if (code === undefined) throw new Error(`No output produced for ${name}`);

  // Written to a real file rather than a data: URL so relative imports and stack
  // traces behave normally.
  const dir = await mkdtemp(path.join(tmpdir(), "figma-bridge-test-"));
  const file = path.join(dir, `${name}.mjs`);
  await writeFile(file, code, "utf8");

  return import(file);
}
