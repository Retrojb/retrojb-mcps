import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { kebabCase } from "../lib/strings.js";
import { style } from "./report.js";
import {
  renderTemplate,
  TEMPLATE_NAMES,
  type TemplateContext,
  type TemplateName,
} from "./templates.js";
import type { Repo } from "./workspace.js";

export interface ScaffoldOptions {
  readonly repo: Repo;
  readonly template: TemplateName;
  /** Name as typed by the user. Normalised before use. */
  readonly rawName: string;
  /** `"apps"` or `"packages"`. */
  readonly location: "apps" | "packages";
  readonly description: string;
  readonly dryRun: boolean;
}

export interface ScaffoldResult {
  readonly packageName: string;
  readonly dir: string;
  readonly relativeDir: string;
  readonly files: readonly string[];
  readonly dryRun: boolean;
}

/** Raised for a bad request, as distinct from a filesystem failure. */
export class ScaffoldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaffoldError";
  }
}

/**
 * Derives the package name and directory from what the user typed.
 *
 * Accepts a bare name (`thing`), a scoped name (`@retrojb/thing`), or something
 * messy (`My Thing`). Normalising rather than rejecting keeps the command usable
 * without the user having to remember the scope.
 */
export function resolveNames(
  rawName: string,
  scope: string,
): { packageName: string; dirName: string } {
  const trimmed = rawName.trim();
  if (trimmed === "") throw new ScaffoldError("A package name is required.");

  const withoutScope = trimmed.startsWith("@")
    ? (trimmed.split("/")[1] ?? "")
    : trimmed;

  const dirName = kebabCase(withoutScope);
  if (dirName === "") {
    throw new ScaffoldError(
      `"${rawName}" does not contain any characters usable in a package name.`,
    );
  }

  return { packageName: `${scope}/${dirName}`, dirName };
}

/** Infers the repo scope from the root manifest, e.g. `@retrojb`. */
export function repoScope(repo: Repo): string {
  const name = repo.manifest.name ?? "";
  if (name.startsWith("@")) {
    const scope = name.split("/")[0];
    if (scope !== undefined) return scope;
  }

  // Fall back to the scope the existing workspaces use, so a root manifest
  // without one does not produce unscoped packages that break convention.
  for (const workspace of repo.workspaces) {
    if (workspace.name.startsWith("@")) {
      const scope = workspace.name.split("/")[0];
      if (scope !== undefined) return scope;
    }
  }

  throw new ScaffoldError(
    "Could not determine the package scope from the root manifest or existing workspaces.",
  );
}

/** Generates a new workspace from a template. */
export async function scaffold(
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  const { repo, template } = options;

  if (!TEMPLATE_NAMES.includes(template)) {
    throw new ScaffoldError(
      `Unknown template "${template}". Available: ${TEMPLATE_NAMES.join(", ")}.`,
    );
  }

  const scope = repoScope(repo);
  const { packageName, dirName } = resolveNames(options.rawName, scope);

  if (repo.names.has(packageName)) {
    throw new ScaffoldError(
      `A workspace named "${packageName}" already exists.`,
    );
  }

  const dir = path.join(repo.root, options.location, dirName);
  const relativeDir = path.relative(repo.root, dir);

  // Refuse a non-empty directory rather than merging into it. Overwriting a
  // package.json someone is mid-way through writing is not recoverable.
  let existing: string[] = [];
  try {
    existing = await readdir(dir);
  } catch {
    existing = [];
  }
  if (existing.length > 0) {
    throw new ScaffoldError(
      `${relativeDir} already exists and is not empty. Remove it or choose another name.`,
    );
  }

  const context: TemplateContext = {
    packageName,
    dirName,
    description: options.description,
    scope,
  };

  const files = renderTemplate(template, context);

  if (!options.dryRun) {
    for (const file of files) {
      const target = path.join(dir, file.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.contents, "utf8");
    }
  }

  return {
    packageName,
    dir,
    relativeDir,
    files: files.map((file) => path.join(relativeDir, file.path)),
    dryRun: options.dryRun,
  };
}

/** Prints the result and the follow-up steps the tool cannot do itself. */
export function reportScaffold(result: ScaffoldResult): number {
  if (result.dryRun) {
    process.stdout.write(
      `${style.yellow("Dry run")} — would create ${result.packageName} at ${result.relativeDir}:\n`,
    );
  } else {
    process.stdout.write(
      `${style.green("Created")} ${style.bold(result.packageName)} at ${result.relativeDir}\n`,
    );
  }

  for (const file of result.files) {
    process.stdout.write(`  ${file}\n`);
  }

  if (result.dryRun) return 0;

  process.stdout.write(`\n${style.bold("Next steps")}\n`);
  process.stdout.write(
    "  1. npm install            — link the new workspace and its dependencies\n",
  );
  process.stdout.write(
    "  2. npm run build          — confirm it compiles\n",
  );
  process.stdout.write(
    "  3. npm run changeset      — record the addition for the next release\n",
  );

  return 0;
}
