/**
 * Requires a changeset for component changes, and requires it to name the
 * component.
 *
 * Run with `npm run check:spec-changesets -- --base origin/main`. The base
 * defaults to `origin/main`. Exits non-zero on failure so it can gate CI.
 *
 *
 * WHY CHANGESETS AND NOT A HISTORY FIELD IN THE SPEC
 *
 * Changesets already write `packages/ui/CHANGELOG.md`, with the version and the
 * commit attached. A hand-kept `changes:` list in each spec would be a second
 * copy, and the second copy is the one that goes stale. So the spec keeps only
 * lifecycle markers (`introducedIn`, `deprecatedIn`), and this check makes the
 * changelog reliable enough to stand in for the rest: a component's history is
 * every changelog entry that names it.
 *
 *
 * THE RULES
 *
 *   1. A PR that changes a file under `packages/ui/src/components` adds a
 *      changeset that lists `@retrojb/ui`. Edits to `*Spec.yaml` files alone are
 *      documentation and are exempt.
 *   2. That changeset's summary names each changed component by its exported
 *      name (`Button`, `GraphicCard`). The component is found through the
 *      `files` map of the spec that lists the changed file, or every spec in the
 *      folder when none lists it. A folder with no spec yet only needs rule 1.
 *   3. A change that needs no release (a comment, a refactor with no behaviour
 *      change) says so explicitly with `npx changeset --empty`, which satisfies
 *      both rules.
 *
 * `major` is the bump for a breaking change. While the package is 0.x, use
 * `minor` and start the summary with "BREAKING:" so it can still be found.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
// Imported rather than global: this package's ESLint config is browser-only.
import process from "node:process";
import { REPO_ROOT, SPEC_SUFFIX, loadSpecs } from "./component-specs.mjs";

const PACKAGE = "@retrojb/ui";
const COMPONENTS_PREFIX = "packages/ui/src/components/";

const baseFlag = process.argv.indexOf("--base");
const base = baseFlag === -1 ? "origin/main" : process.argv[baseFlag + 1];
if (!base) {
  console.error("--base needs a git ref, e.g. --base origin/main");
  process.exit(1);
}

const git = (...args) =>
  execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

/*
 * Diff against the merge base rather than the tip of `base`, so commits that
 * landed on main after this branch was cut are not counted as this branch's.
 * Comparing to the working tree (no `HEAD`) and adding untracked files lets the
 * same check run locally before anything is committed.
 */
let mergeBase;
try {
  [mergeBase] = git("merge-base", base, "HEAD");
} catch {
  console.error(
    `Could not find a merge base with ${base}. In CI, check out with fetch-depth: 0.`,
  );
  process.exit(1);
}
const changed = [
  ...git("diff", "--name-only", mergeBase),
  ...git("ls-files", "--others", "--exclude-standard"),
];

const componentFiles = changed.filter(
  (path) => path.startsWith(COMPONENTS_PREFIX) && !path.endsWith(SPEC_SUFFIX),
);
if (componentFiles.length === 0) {
  console.log("No component source changes. Nothing to check.");
  process.exit(0);
}

/** `{ packages: Set, summary }` from a changeset's frontmatter and body. */
function readChangeset(path) {
  const source = readFileSync(resolve(REPO_ROOT, path), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n?---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) return { packages: new Set(), summary: source };
  const packages = new Set(
    [...match[1].matchAll(/^\s*["']?([^"':\s]+)["']?\s*:/gm)].map((m) => m[1]),
  );
  return { packages, summary: match[2] };
}

const changesets = changed
  .filter(
    (path) =>
      /^\.changeset\/[^/]+\.md$/.test(path) &&
      path !== ".changeset/README.md" &&
      existsSync(resolve(REPO_ROOT, path)),
  )
  .map((path) => ({ path, ...readChangeset(path) }));

if (changesets.some((changeset) => changeset.packages.size === 0)) {
  console.log("An empty changeset marks this change as needing no release.");
  process.exit(0);
}

const relevant = changesets.filter((changeset) =>
  changeset.packages.has(PACKAGE),
);
if (relevant.length === 0) {
  console.error(
    [
      `Component files changed but no changeset lists ${PACKAGE}:`,
      ...componentFiles.map((path) => `  ${path}`),
      "",
      "Run `npm run changeset`, pick @retrojb/ui, and name the component in the",
      "summary. If nothing needs releasing, run `npx changeset --empty`.",
    ].join("\n"),
  );
  process.exit(1);
}

// Which component names each changed file belongs to.
const specs = (await loadSpecs()).filter((spec) => spec.data?.name);
const required = new Map();
for (const path of componentFiles) {
  const folder = dirname(resolve(REPO_ROOT, path));
  const inFolder = specs.filter((spec) => dirname(spec.file) === folder);
  const owners = inFolder.filter((spec) =>
    Object.values(spec.data.files ?? {}).includes(path),
  );
  for (const spec of owners.length > 0 ? owners : inFolder) {
    required.set(spec.data.name, [
      ...(required.get(spec.data.name) ?? []),
      path,
    ]);
  }
}

const summaries = relevant.map((changeset) => changeset.summary).join("\n");
const missing = [...required].filter(
  ([name]) => !new RegExp(`\\b${name}\\b`).test(summaries),
);

if (missing.length > 0) {
  console.error(
    [
      `The ${PACKAGE} changeset does not name every changed component:`,
      ...missing.map(([name, paths]) => `  ${name} (${paths.join(", ")})`),
      "",
      'Mention each by its exported name, e.g. "Button: add an icon slot."',
      `Checked: ${relevant.map((changeset) => changeset.path).join(", ")}`,
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  `Changeset covers ${componentFiles.length} changed component file(s)` +
    (required.size > 0 ? `: ${[...required.keys()].join(", ")}.` : "."),
);
