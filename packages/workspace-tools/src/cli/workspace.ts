import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { hasErrorCode } from "../lib/errors.js";

/** The subset of a package manifest these tools care about. */
export interface Manifest {
  readonly name?: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly type?: string;
  readonly main?: string;
  readonly bin?: string | Record<string, string>;
  readonly workspaces?: string[];
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly engines?: Record<string, string>;
}

/** One discovered workspace. */
export interface Workspace {
  /** Package name from the manifest, or the directory name if absent. */
  readonly name: string;
  /** Absolute path to the package directory. */
  readonly dir: string;
  /** Path relative to the repo root, e.g. `packages/plugin-kit`. */
  readonly relativeDir: string;
  readonly manifest: Manifest;
  /** `"app"` for anything under `apps/`, otherwise `"package"`. */
  readonly kind: "app" | "package";
}

export interface Repo {
  /** Absolute path to the repo root. */
  readonly root: string;
  readonly manifest: Manifest;
  readonly workspaces: readonly Workspace[];
  /** Every workspace name, for resolving internal dependencies. */
  readonly names: ReadonlySet<string>;
}

/** Reads and parses a strict JSON file, returning `null` when it does not exist. */
export async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return null;
    // A malformed manifest is worth surfacing rather than treating as absent —
    // silently skipping it would make doctor report a clean repo.
    throw new Error(`Could not read ${file}: ${(error as Error).message}`, {
      cause: error,
    });
  }
}

/**
 * Strips comments and trailing commas from JSONC.
 *
 * TypeScript accepts both in `tsconfig.json`, and this repo uses comments there
 * heavily to record why each option is set. `JSON.parse` rejects them, so reading
 * a tsconfig strictly reports every commented config in the repo as corrupt —
 * which is exactly what the first run of `doctor` did.
 *
 * Tracks string state so a `//` inside a value, as in a URL, is left alone.
 */
export function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    const next = text[i + 1] ?? "";

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        out += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      out += char;
      // A backslash escapes the next character, including a quote.
      if (char === "\\") {
        out += next;
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    out += char;
  }

  // Trailing commas, which TypeScript also tolerates.
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Reads a JSONC file such as a tsconfig.
 *
 * Returns `null` when absent. Throws when the content is genuinely malformed,
 * which is worth reporting.
 */
export async function readJsonc<T>(file: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return null;
    throw new Error(`Could not read ${file}: ${(error as Error).message}`, {
      cause: error,
    });
  }

  try {
    return JSON.parse(stripJsonComments(raw)) as T;
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${(error as Error).message}`, {
      cause: error,
    });
  }
}

/**
 * Walks up from `start` looking for the repo root.
 *
 * Identified by a `package.json` carrying a `workspaces` field, not merely by the
 * presence of a `package.json` — every package has one of those, and picking the
 * wrong root would have `clean` deleting from the wrong place.
 */
export async function findRepoRoot(start: string): Promise<string> {
  let current = path.resolve(start);

  for (;;) {
    const manifest = await readJson<Manifest>(
      path.join(current, "package.json"),
    );

    if (manifest?.workspaces !== undefined) return current;

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `No monorepo root found above ${start}. Looked for a package.json with a "workspaces" field.`,
      );
    }
    current = parent;
  }
}

/**
 * Expands a workspaces glob into directories.
 *
 * Deliberately supports only the two forms this repo uses — `apps/*` and a
 * literal path — rather than pulling in a glob dependency for patterns nobody
 * writes. An unsupported pattern is reported instead of silently matching
 * nothing, which is the failure mode that would make `doctor` miss packages.
 */
async function expandWorkspaceGlob(
  root: string,
  pattern: string,
): Promise<string[]> {
  if (!pattern.includes("*")) {
    const dir = path.join(root, pattern);
    try {
      const info = await stat(dir);
      return info.isDirectory() ? [dir] : [];
    } catch {
      return [];
    }
  }

  const suffixIndex = pattern.indexOf("*");
  const prefix = pattern.slice(0, suffixIndex);
  const remainder = pattern.slice(suffixIndex);

  if (remainder !== "*") {
    throw new Error(
      `Unsupported workspaces pattern "${pattern}". Only a trailing "*" is handled.`,
    );
  }

  const parent = path.join(root, prefix);
  let entries;
  try {
    entries = await readdir(parent, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join(parent, entry.name));
}

/** Discovers the repo root and every workspace in it. */
export async function loadRepo(start = process.cwd()): Promise<Repo> {
  const root = await findRepoRoot(start);
  const manifest = await readJson<Manifest>(path.join(root, "package.json"));

  if (manifest === null) {
    throw new Error(`No package.json at ${root}`);
  }

  const patterns = manifest.workspaces ?? [];
  const dirs = new Set<string>();

  for (const pattern of patterns) {
    for (const dir of await expandWorkspaceGlob(root, pattern)) {
      dirs.add(dir);
    }
  }

  const workspaces: Workspace[] = [];

  for (const dir of [...dirs].sort()) {
    const packageManifest = await readJson<Manifest>(
      path.join(dir, "package.json"),
    );
    // A directory inside a workspaces glob with no manifest is not a workspace.
    // Common for stray folders, and npm ignores them too.
    if (packageManifest === null) continue;

    const relativeDir = path.relative(root, dir);

    workspaces.push({
      name: packageManifest.name ?? path.basename(dir),
      dir,
      relativeDir,
      manifest: packageManifest,
      kind: relativeDir.startsWith(`apps${path.sep}`) ? "app" : "package",
    });
  }

  return {
    root,
    manifest,
    workspaces,
    names: new Set(workspaces.map((workspace) => workspace.name)),
  };
}

/** Every dependency entry across the three dependency fields. */
export function allDependencies(
  manifest: Manifest,
): { field: string; name: string; range: string }[] {
  const fields = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ] as const;

  return fields.flatMap((field) =>
    Object.entries(manifest[field] ?? {}).map(([name, range]) => ({
      field,
      name,
      range,
    })),
  );
}
