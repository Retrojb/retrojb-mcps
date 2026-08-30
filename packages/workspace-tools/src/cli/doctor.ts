import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { errorMessage } from "../lib/errors.js";
import type { Finding } from "./report.js";
import {
  allDependencies,
  readJsonc,
  type Repo,
  type Workspace,
} from "./workspace.js";

/**
 * Dependencies allowed to use a range instead of an exact pin.
 *
 * The repo convention is exact pins so every machine and CI run resolves the same
 * tree. `turbo` is the deliberate exception, pinned to a minor.
 */
const RANGE_ALLOWLIST = new Set(["turbo"]);

/** Scripts every workspace is expected to expose, so `turbo run` covers it. */
const REQUIRED_SCRIPTS = ["lint", "check-types"];

/**
 * Validates the workspace graph and repo conventions.
 *
 * Every check here corresponds to something that has actually gone wrong in this
 * repo: a rename left dangling `@repo/*` references, a deleted `nextjs.json` broke
 * the docs build, an unused dependency lingered after a rewrite, and a TypeScript
 * version mismatch took ESLint down repo-wide. The point is to make that class of
 * problem fail in milliseconds with a precise message instead of surfacing later
 * as a confusing build error.
 */
export async function runDoctor(repo: Repo): Promise<Finding[]> {
  const findings: Finding[] = [];

  findings.push(...checkWorkspaceDependencies(repo));
  findings.push(...(await checkTsconfigExtends(repo)));
  findings.push(...(await checkUnusedWorkspaceDependencies(repo)));
  findings.push(...checkDependencyDrift(repo));
  findings.push(...checkRangeSpecifiers(repo));
  findings.push(...(await checkScripts(repo)));
  findings.push(...checkMetadata(repo));
  findings.push(...(await checkEslintConfigPresence(repo)));
  findings.push(...checkOrphanedPackages(repo));

  return findings;
}

// -----------------------------------------------------------------------------

/** Every internal dependency must name a workspace that exists. */
function checkWorkspaceDependencies(repo: Repo): Finding[] {
  const findings: Finding[] = [];
  const scope = inferScope(repo);

  for (const workspace of repo.workspaces) {
    for (const dep of allDependencies(workspace.manifest)) {
      const looksInternal =
        repo.names.has(dep.name) ||
        (scope !== null && dep.name.startsWith(`${scope}/`));

      if (!looksInternal) continue;

      if (!repo.names.has(dep.name)) {
        findings.push({
          severity: "error",
          rule: "dangling-workspace-dep",
          workspace: workspace.name,
          message: `depends on "${dep.name}", which is not a workspace in this repo`,
          remedy:
            "Correct the name or remove the dependency. This usually means a package was renamed and a reference was missed.",
          file: path.join(workspace.relativeDir, "package.json"),
        });
        continue;
      }

      // An internal dependency pinned to a version cannot resolve to the local
      // copy once versions move, which is exactly what changesets does.
      if (dep.range !== "*" && !dep.range.startsWith("workspace:")) {
        findings.push({
          severity: "warning",
          rule: "pinned-workspace-dep",
          workspace: workspace.name,
          message: `depends on "${dep.name}" at "${dep.range}" rather than "*"`,
          remedy:
            'Use "*" for internal dependencies so they always resolve to the local copy, which matters once changesets starts bumping versions.',
          file: path.join(workspace.relativeDir, "package.json"),
        });
      }
    }
  }

  return findings;
}

/**
 * Infers the repo's package scope from the root manifest name.
 *
 * Used to catch a dependency that *looks* internal but names no real workspace —
 * the signature of a half-finished rename.
 */
function inferScope(repo: Repo): string | null {
  const name = repo.manifest.name ?? "";
  return name.startsWith("@") ? (name.split("/")[0] ?? null) : null;
}

/** Every `extends` in a tsconfig must resolve to a file that exists. */
async function checkTsconfigExtends(repo: Repo): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const workspace of repo.workspaces) {
    let entries;
    try {
      entries = await readdir(workspace.dir);
    } catch {
      continue;
    }

    const configs = entries.filter(
      (entry) => entry.startsWith("tsconfig") && entry.endsWith(".json"),
    );

    for (const configName of configs) {
      const configPath = path.join(workspace.dir, configName);

      let config: { extends?: string } | null;
      try {
        config = await readJsonc<{ extends?: string }>(configPath);
      } catch (error) {
        findings.push({
          severity: "error",
          rule: "tsconfig-unparseable",
          workspace: workspace.name,
          message: `${configName} could not be parsed: ${errorMessage(error)}`,
          remedy: "Fix the JSON syntax.",
          file: path.join(workspace.relativeDir, configName),
        });
        continue;
      }

      const target = config?.extends;
      if (target === undefined) continue;

      const resolved = await resolveExtends(workspace, target);
      if (resolved === null) {
        findings.push({
          severity: "error",
          rule: "tsconfig-extends-missing",
          workspace: workspace.name,
          message: `${configName} extends "${target}", which does not resolve`,
          remedy:
            "Point it at a file that exists. A deleted or renamed shared config is the usual cause, and the resulting build error does not name this file.",
          file: path.join(workspace.relativeDir, configName),
        });
      }
    }
  }

  return findings;
}

/**
 * Resolves a tsconfig `extends` target.
 *
 * Handles the two forms in use: a relative path, and a package subpath such as
 * `@retrojb/typescript-config/base.json`. Resolved against the workspace's own
 * `node_modules` chain rather than assumed, because that is what TypeScript does.
 */
async function resolveExtends(
  workspace: Workspace,
  target: string,
): Promise<string | null> {
  if (target.startsWith(".") || path.isAbsolute(target)) {
    const file = path.resolve(workspace.dir, target);
    return (await readJsonc(file)) === null ? null : file;
  }

  // Package reference. Walk up node_modules looking for the file.
  let dir = workspace.dir;
  for (;;) {
    const candidate = path.join(dir, "node_modules", target);
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // Keep walking.
    }

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Internal dependencies that are declared but never imported. */
async function checkUnusedWorkspaceDependencies(
  repo: Repo,
): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const workspace of repo.workspaces) {
    const internal = allDependencies(workspace.manifest).filter(
      (dep) => repo.names.has(dep.name) && dep.field === "dependencies",
    );

    if (internal.length === 0) continue;

    const sources = await collectSourceText(workspace.dir);

    for (const dep of internal) {
      if (!sources.includes(dep.name)) {
        findings.push({
          severity: "warning",
          rule: "unused-workspace-dep",
          workspace: workspace.name,
          message: `declares "${dep.name}" as a dependency but never imports it`,
          remedy:
            "Remove it. A stale dependency makes the workspace graph misleading and slows turbo down by adding a build edge that is not real.",
          file: path.join(workspace.relativeDir, "package.json"),
        });
      }
    }
  }

  return findings;
}

/**
 * Concatenates the source text of a workspace.
 *
 * A substring search over the whole tree, not real import parsing. That is
 * adequate for this check and cheap; the consequence is that a dependency
 * mentioned only in a comment counts as used, which errs toward not nagging.
 */
async function collectSourceText(dir: string): Promise<string> {
  const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  const skip = new Set(["node_modules", "dist", "build", ".next", ".turbo"]);
  const chunks: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".changeset") continue;
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        await walk(full);
        continue;
      }

      if (!extensions.has(path.extname(entry.name))) continue;
      try {
        chunks.push(await readFile(full, "utf8"));
      } catch {
        // Unreadable file; nothing useful to do.
      }
    }
  }

  await walk(dir);
  return chunks.join("\n");
}

/** External dependencies pinned at more than one version across the repo. */
function checkDependencyDrift(repo: Repo): Finding[] {
  const seen = new Map<string, Map<string, string[]>>();

  for (const workspace of [
    { name: "(root)", manifest: repo.manifest },
    ...repo.workspaces,
  ]) {
    for (const dep of allDependencies(workspace.manifest)) {
      if (dep.range === "*" || repo.names.has(dep.name)) continue;

      const versions = seen.get(dep.name) ?? new Map<string, string[]>();
      const holders = versions.get(dep.range) ?? [];
      holders.push(workspace.name);
      versions.set(dep.range, holders);
      seen.set(dep.name, versions);
    }
  }

  const findings: Finding[] = [];

  for (const [name, versions] of seen) {
    if (versions.size < 2) continue;

    const detail = [...versions]
      .map(([range, holders]) => `${range} (${holders.join(", ")})`)
      .join(" vs ");

    findings.push({
      severity: "error",
      rule: "dependency-drift",
      workspace: null,
      message: `"${name}" is pinned at ${versions.size} different versions: ${detail}`,
      remedy:
        "Align them. Two versions of a build-critical dependency is how the repo ended up with an ESLint that crashed on every workspace.",
    });
  }

  return findings;
}

/** Range specifiers where the convention is an exact pin. */
function checkRangeSpecifiers(repo: Repo): Finding[] {
  const findings: Finding[] = [];

  for (const workspace of [
    { name: "(root)", manifest: repo.manifest, relativeDir: "" },
    ...repo.workspaces,
  ]) {
    for (const dep of allDependencies(workspace.manifest)) {
      if (dep.range === "*" || repo.names.has(dep.name)) continue;
      if (RANGE_ALLOWLIST.has(dep.name)) continue;
      if (!/^[\^~>=<]/.test(dep.range)) continue;

      findings.push({
        severity: "warning",
        rule: "range-specifier",
        workspace: workspace.name,
        message: `"${dep.name}" uses the range "${dep.range}" rather than an exact version`,
        remedy: `Pin it exactly so every install resolves identically. Add it to the allowlist in doctor.ts if the range is deliberate, as it is for ${[...RANGE_ALLOWLIST].join(", ")}.`,
        file: path.join(workspace.relativeDir, "package.json"),
      });
    }
  }

  return findings;
}

/** Scripts turbo expects, absent which a workspace is silently skipped. */
async function checkScripts(repo: Repo): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const workspace of repo.workspaces) {
    const scripts = workspace.manifest.scripts ?? {};

    // `check-types` is only meaningful where there is TypeScript to check.
    // Demanding it from a JSON-only config package is noise, and noise is how a
    // report stops being read.
    const hasTypeScript =
      (await readJsonc(path.join(workspace.dir, "tsconfig.json"))) !== null;

    for (const required of REQUIRED_SCRIPTS) {
      if (required === "check-types" && !hasTypeScript) continue;

      if (scripts[required] === undefined) {
        findings.push({
          severity: "warning",
          rule: "missing-script",
          workspace: workspace.name,
          message: `has no "${required}" script`,
          remedy: `"turbo run ${required}" skips workspaces without the script and still reports success, so the gap is invisible in CI.`,
          file: path.join(workspace.relativeDir, "package.json"),
        });
      }
    }

    // A lint script that does not fail on warnings is a lint script that never
    // fails, since most rules report as warnings by default.
    const lint = scripts.lint;
    if (lint !== undefined && !lint.includes("--max-warnings")) {
      findings.push({
        severity: "warning",
        rule: "lint-allows-warnings",
        workspace: workspace.name,
        message: 'the "lint" script does not pass --max-warnings',
        remedy:
          "Add --max-warnings 0. Without it ESLint exits 0 with warnings, so CI passes while problems accumulate.",
        file: path.join(workspace.relativeDir, "package.json"),
      });
    }
  }

  return findings;
}

/** Version, privacy, and module-type consistency. */
function checkMetadata(repo: Repo): Finding[] {
  const findings: Finding[] = [];

  for (const workspace of repo.workspaces) {
    const { manifest } = workspace;

    if (manifest.name === undefined) {
      findings.push({
        severity: "error",
        rule: "missing-name",
        workspace: workspace.relativeDir,
        message: "package.json has no name",
        remedy: "Add a name so the workspace can be referenced and filtered.",
        file: path.join(workspace.relativeDir, "package.json"),
      });
    }

    if (manifest.private !== true) {
      findings.push({
        severity: "warning",
        rule: "not-private",
        workspace: workspace.name,
        message: "is not marked private",
        remedy:
          'Add "private": true unless this package is meant to be published. Nothing here is published today.',
        file: path.join(workspace.relativeDir, "package.json"),
      });
    }

    if (manifest.version === undefined) {
      findings.push({
        severity: "warning",
        rule: "missing-version",
        workspace: workspace.name,
        message: "has no version field",
        remedy: "Changesets needs a version to bump. Start at 0.0.0.",
        file: path.join(workspace.relativeDir, "package.json"),
      });
    }
  }

  return findings;
}

/** A workspace with a lint script needs a config for ESLint to find. */
async function checkEslintConfigPresence(repo: Repo): Promise<Finding[]> {
  const findings: Finding[] = [];
  const candidates = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    "eslint.config.ts",
  ];

  for (const workspace of repo.workspaces) {
    if (workspace.manifest.scripts?.lint === undefined) continue;

    let entries: string[];
    try {
      entries = await readdir(workspace.dir);
    } catch {
      continue;
    }

    if (!candidates.some((candidate) => entries.includes(candidate))) {
      findings.push({
        severity: "error",
        rule: "missing-eslint-config",
        workspace: workspace.name,
        message: "has a lint script but no eslint.config.*",
        remedy:
          "Add one. ESLint fails outright when it cannot find a config, so the lint script cannot succeed.",
        file: workspace.relativeDir,
      });
    }
  }

  return findings;
}

/**
 * Packages nothing depends on.
 *
 * Informational rather than a warning: a CLI or an app is legitimately a leaf.
 * Worth surfacing because an orphan is also what a package looks like just after
 * its last consumer stopped importing it.
 */
function checkOrphanedPackages(repo: Repo): Finding[] {
  const referenced = new Set<string>();

  for (const workspace of repo.workspaces) {
    for (const dep of allDependencies(workspace.manifest)) {
      if (repo.names.has(dep.name)) referenced.add(dep.name);
    }
  }

  return repo.workspaces
    .filter(
      (workspace) =>
        workspace.kind === "package" &&
        !referenced.has(workspace.name) &&
        workspace.manifest.bin === undefined,
    )
    .map((workspace) => ({
      severity: "info" as const,
      rule: "orphaned-package",
      workspace: workspace.name,
      message: "no other workspace depends on this package",
      remedy:
        "Expected for an app or a CLI. Otherwise it may be dead code left behind when its last consumer changed.",
      file: workspace.relativeDir,
    }));
}
