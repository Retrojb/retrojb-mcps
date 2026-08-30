import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { errorMessage } from "../lib/errors.js";
import { formatBytes, pluralize } from "../lib/strings.js";
import { style } from "./report.js";

/**
 * Directory names removed as build output.
 *
 * An explicit allowlist, never a pattern. `dist` and `build` are also plausible
 * names for a source directory, and a glob that happened to match one would
 * delete work with no way to recover it. Adding a name here is a deliberate act.
 */
const ARTIFACT_DIRS = new Set([
  "dist",
  "build",
  ".next",
  ".turbo",
  "out",
  "coverage",
  ".nyc_output",
  ".cache",
  "storybook-static",
]);

/** Dependency directories, removed only when explicitly requested. */
const DEPENDENCY_DIRS = new Set(["node_modules"]);

/** Individual files removed alongside the directories. */
const ARTIFACT_FILE_SUFFIXES = [".tsbuildinfo"];

/**
 * Never descended into, whatever else is true.
 *
 * `.git` is the one that genuinely matters: it can contain a directory called
 * `build` in its object store, and deleting from inside it corrupts the repo.
 */
const NEVER_DESCEND = new Set([".git", ".hg", ".svn"]);

export interface CleanOptions {
  /** Repo root. Nothing outside this is touched. */
  readonly root: string;
  /** Report what would be removed without removing it. */
  readonly dryRun: boolean;
  /** Include `node_modules`. */
  readonly includeDependencies: boolean;
  /** Print every path rather than a per-kind summary. */
  readonly verbose: boolean;
}

export interface CleanTarget {
  readonly absolute: string;
  readonly relative: string;
  readonly kind: "artifact" | "dependencies" | "file";
  readonly bytes: number;
}

export interface CleanResult {
  readonly targets: readonly CleanTarget[];
  readonly removed: number;
  readonly failed: readonly { path: string; reason: string }[];
  readonly bytes: number;
  readonly dryRun: boolean;
}

/**
 * Finds removable artifacts under `root`.
 *
 * Does not descend into a directory it has already marked for removal — walking
 * the inside of a `node_modules` tree to look for more `node_modules` is both
 * pointless and where most of the runtime would go.
 *
 * Symlinks are never followed, so a link pointing outside the repo cannot be used
 * to delete anything beyond it.
 */
export async function findCleanTargets(
  options: CleanOptions,
): Promise<CleanTarget[]> {
  const targets: CleanTarget[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      // A directory that vanished mid-walk, or one we cannot read. Neither is
      // worth aborting the whole sweep for.
      void error;
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);

      // Symlinks are reported by readdir as symlinks, not as directories, so
      // this both skips them and prevents escaping the root.
      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (NEVER_DESCEND.has(entry.name)) continue;

        const isDependencies = DEPENDENCY_DIRS.has(entry.name);
        const isArtifact = ARTIFACT_DIRS.has(entry.name);

        if (isDependencies && !options.includeDependencies) {
          // Skip it entirely rather than descending. Dependency trees contain
          // thousands of `dist` directories belonging to other people's packages,
          // and none of them are ours to delete.
          continue;
        }

        if (isArtifact || isDependencies) {
          targets.push({
            absolute,
            relative: path.relative(options.root, absolute),
            kind: isDependencies ? "dependencies" : "artifact",
            bytes: await directorySize(absolute),
          });
          // Do not descend into something already marked for deletion.
          continue;
        }

        await walk(absolute);
        continue;
      }

      if (
        entry.isFile() &&
        ARTIFACT_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))
      ) {
        let bytes = 0;
        try {
          bytes = (await stat(absolute)).size;
        } catch {
          bytes = 0;
        }

        targets.push({
          absolute,
          relative: path.relative(options.root, absolute),
          kind: "file",
          bytes,
        });
      }
    }
  }

  await walk(options.root);
  return targets;
}

/**
 * Sums the size of a directory tree.
 *
 * Best-effort: unreadable entries count as zero rather than failing. The number
 * exists to tell the user roughly how much they are reclaiming, so an
 * approximation is fine and an exception would not be.
 */
async function directorySize(dir: string): Promise<number> {
  let total = 0;

  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }

      try {
        total += (await stat(full)).size;
      } catch {
        // Skip.
      }
    }
  }

  await walk(dir);
  return total;
}

/** Removes the given targets, or reports them when `dryRun` is set. */
export async function clean(options: CleanOptions): Promise<CleanResult> {
  const targets = await findCleanTargets(options);
  const failed: { path: string; reason: string }[] = [];
  let removed = 0;

  if (!options.dryRun) {
    for (const target of targets) {
      // Belt and braces: refuse anything that resolved outside the root, which
      // should be impossible given symlinks are skipped, but the cost of being
      // wrong here is someone's home directory.
      const resolved = path.resolve(target.absolute);
      if (
        !resolved.startsWith(path.resolve(options.root) + path.sep) ||
        resolved === path.resolve(options.root)
      ) {
        failed.push({
          path: target.relative,
          reason: "resolved outside the repo root",
        });
        continue;
      }

      try {
        await rm(resolved, { recursive: true, force: true });
        removed += 1;
      } catch (error) {
        failed.push({ path: target.relative, reason: errorMessage(error) });
      }
    }
  }

  return {
    targets,
    removed,
    failed,
    bytes: targets.reduce((total, target) => total + target.bytes, 0),
    dryRun: options.dryRun,
  };
}

/** Prints a clean result and returns the process exit code. */
export function reportClean(
  result: CleanResult,
  options: CleanOptions,
): number {
  if (result.targets.length === 0) {
    process.stdout.write(`${style.green("Nothing to clean")}\n`);
    return 0;
  }

  const byKind = new Map<CleanTarget["kind"], CleanTarget[]>();
  for (const target of result.targets) {
    const bucket = byKind.get(target.kind) ?? [];
    bucket.push(target);
    byKind.set(target.kind, bucket);
  }

  const labels: Record<CleanTarget["kind"], string> = {
    artifact: "build output",
    dependencies: "dependencies",
    file: "build metadata",
  };

  for (const [kind, group] of byKind) {
    const bytes = group.reduce((total, target) => total + target.bytes, 0);
    process.stdout.write(
      `\n${style.bold(labels[kind])}  ${style.dim(`${pluralize(group.length, "path")}, ${formatBytes(bytes)}`)}\n`,
    );

    if (options.verbose) {
      for (const target of group) {
        process.stdout.write(
          `  ${target.relative} ${style.dim(formatBytes(target.bytes))}\n`,
        );
      }
    }
  }

  process.stdout.write("\n");

  if (result.dryRun) {
    process.stdout.write(
      `${style.yellow("Dry run")} — would remove ${pluralize(result.targets.length, "path")}, reclaiming ${formatBytes(result.bytes)}.\n`,
    );
    process.stdout.write(
      `${style.dim("Run again without --dry-run to delete.")}\n`,
    );
    return 0;
  }

  process.stdout.write(
    `${style.green(`Removed ${pluralize(result.removed, "path")}`)}, reclaiming ${formatBytes(result.bytes)}.\n`,
  );

  if (result.failed.length > 0) {
    process.stdout.write(
      `${style.red(`${pluralize(result.failed.length, "path")} could not be removed:`)}\n`,
    );
    for (const failure of result.failed) {
      process.stdout.write(`  ${failure.path} — ${failure.reason}\n`);
    }
    return 1;
  }

  if (options.includeDependencies) {
    process.stdout.write(
      `${style.dim("node_modules was removed; run npm install before building.")}\n`,
    );
  }

  return 0;
}
