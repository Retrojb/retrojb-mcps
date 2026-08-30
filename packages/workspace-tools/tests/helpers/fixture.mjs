/**
 * Builds throwaway repo trees in the OS temp directory.
 *
 * The clean command deletes directories, so its tests must never run against the
 * real repo. Everything here is created under `mkdtemp` and removed afterwards.
 */
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Creates a temp directory tree from a flat description.
 *
 * @param {Record<string, string | null>} entries Path relative to the root mapped
 *   to file contents, or `null` to create a directory.
 * @returns {Promise<{root: string, cleanup: () => Promise<void>, join: (p: string) => string}>}
 */
export async function makeTree(entries) {
  const root = await mkdtemp(path.join(tmpdir(), "workspace-tools-test-"));

  for (const [relative, contents] of Object.entries(entries)) {
    const target = path.join(root, relative);

    if (contents === null) {
      await mkdir(target, { recursive: true });
      continue;
    }

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
  }

  return {
    root,
    join: (relative) => path.join(root, relative),
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

/** Serialises a package manifest the way the tools expect to read it. */
export function manifest(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** A minimal but valid monorepo root manifest. */
export function rootManifest(overrides = {}) {
  return manifest({
    name: "@fixture/root",
    version: "0.0.0",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    ...overrides,
  });
}

/** A workspace manifest with the fields doctor checks already satisfied. */
export function packageManifest(name, overrides = {}) {
  return manifest({
    name,
    version: "0.0.0",
    private: true,
    scripts: { lint: "eslint . --max-warnings 0" },
    ...overrides,
  });
}

/** Creates a symlink, skipping on platforms that refuse without privileges. */
export async function trySymlink(target, linkPath) {
  try {
    await symlink(target, linkPath, "dir");
    return true;
  } catch {
    return false;
  }
}
