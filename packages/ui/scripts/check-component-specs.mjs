/**
 * Validates every `<Name>Spec.yaml` under `src/components`.
 *
 * Run with `npm run check:specs`. Exits non-zero on any error so it can gate CI.
 *
 * The JSON Schema covers shape. This script covers what a schema cannot see:
 *
 *   1. Every non-null path in `files` exists. A spec that points at a file that
 *      was moved or deleted is worse than no spec, because agents trust it.
 *   2. The file name matches `name`, and `category` / `subcategory` match the
 *      folder the spec sits in.
 *   3. `id` and `name` are unique, and every id in `usage.composes`,
 *      `usage.alternatives` and `versioning.replacedBy` belongs to a real spec.
 *   4. A component marked experimental, shipped or deprecated is exported from
 *      `src/index.ts`, and a planned or stub one is not.
 *
 * Folders that hold a `.tsx` component but no spec are listed as warnings.
 * Pass `--strict` to make them errors once every component has a spec.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
// Imported rather than global: this package's ESLint config is browser-only.
import process from "node:process";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  COMPONENTS_ROOT,
  PACKAGE_ROOT,
  REPO_ROOT,
  SCHEMA_FILE,
  SPEC_SUFFIX,
  loadSpecs,
  toRepoPath,
} from "./component-specs.mjs";

const strict = process.argv.includes("--strict");
const errors = [];
const warnings = [];
const fail = (path, message) => errors.push(`${path}: ${message}`);

const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
// `allowUnionTypes`: paths are `["string", "null"]`, which strict mode
// otherwise rejects.
const validate = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
}).compile(schema);
const specs = await loadSpecs();

/*
 * Names exported from the package entry point. A word match on the source is
 * enough: the barrel is a list of `export { … }` blocks, and the check only
 * needs to know whether a component name appears in one.
 */
const indexSource = readFileSync(resolve(PACKAGE_ROOT, "src/index.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
const isExported = (name) => new RegExp(`\\b${name}\\b`).test(indexSource);

const byId = new Map();
const byName = new Map();

for (const spec of specs) {
  if (spec.error) {
    fail(spec.path, `YAML does not parse: ${spec.error.message}`);
    continue;
  }
  if (!validate(spec.data)) {
    for (const issue of validate.errors) {
      fail(spec.path, `${issue.instancePath || "(root)"} ${issue.message}`);
    }
    continue;
  }

  const { id, name, category, subcategory, status, files, usage } = spec.data;

  if (basename(spec.file) !== `${name}${SPEC_SUFFIX}`) {
    fail(spec.path, `file name should be ${name}${SPEC_SUFFIX}`);
  }

  // components/<category>[/<subcategory>]/<folder>/<Name>Spec.yaml
  const segments = relative(COMPONENTS_ROOT, dirname(spec.file)).split(sep);
  if (segments[0] !== category) {
    fail(
      spec.path,
      `category is "${category}" but the folder is "${segments[0]}"`,
    );
  }
  if (segments.length > 2 && segments[1] !== subcategory) {
    fail(spec.path, `subcategory should be "${segments[1]}"`);
  }

  for (const [key, path] of Object.entries(files)) {
    if (path !== null && !existsSync(resolve(REPO_ROOT, path))) {
      fail(spec.path, `files.${key} points at ${path}, which does not exist`);
    }
  }

  for (const symbol of spec.data.exports ?? []) {
    if (symbol.internal !== true && !isExported(symbol.name)) {
      fail(
        spec.path,
        `exports lists ${symbol.name}, which src/index.ts does not export (mark it internal: true if that is intended)`,
      );
    }
  }

  const exported = isExported(name);
  const shouldExport = ["experimental", "shipped", "deprecated"].includes(
    status,
  );
  if (shouldExport && !exported) {
    fail(
      spec.path,
      `status is ${status} but ${name} is not exported from src/index.ts`,
    );
  }
  if (!shouldExport && exported) {
    fail(
      spec.path,
      `status is ${status} but ${name} is exported from src/index.ts`,
    );
  }

  if (byId.has(id))
    fail(spec.path, `id "${id}" is also used by ${byId.get(id).path}`);
  if (byName.has(name))
    fail(spec.path, `name "${name}" is also used by ${byName.get(name).path}`);
  byId.set(id, spec);
  byName.set(name, spec);

  spec.references = [
    ...(usage?.composes ?? []),
    ...(usage?.alternatives ?? []).map((alternative) => alternative.id),
    ...(spec.data.versioning?.replacedBy
      ? [spec.data.versioning.replacedBy]
      : []),
  ];
}

// References are checked after every id is known, so order does not matter.
for (const spec of specs) {
  for (const reference of spec.references ?? []) {
    if (!byId.has(reference))
      fail(spec.path, `references unknown id "${reference}"`);
  }
}

/*
 * Coverage. A component folder is one holding a `.tsx` file named after
 * something `src/index.ts` exports, so a folder of shared internals
 * (`typography/headings`, with `HeadingBase.tsx`) is not one.
 *
 *   - A component folder with no spec at all is a gap in the index: a warning
 *     until the migration is done, an error under `--strict`.
 *   - A folder that has specs must account for every exported component in it,
 *     as a spec of its own or in another spec's `exports` (`CardTitle` is a
 *     part listed by `CardSpec.yaml`). That is always an error: it means a
 *     component was added or renamed and its spec was not.
 */
function componentFolders(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const components = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => basename(entry.name, ".tsx"))
    .filter(isExported);
  const found = components.length > 0 ? [{ dir, components }] : [];
  for (const entry of entries) {
    if (entry.isDirectory())
      found.push(...componentFolders(resolve(dir, entry.name)));
  }
  return found;
}
for (const { dir, components } of componentFolders(COMPONENTS_ROOT)) {
  const local = specs.filter((spec) => spec.data && dirname(spec.file) === dir);
  if (local.length === 0) {
    (strict ? errors : warnings).push(
      `${toRepoPath(dir)}: no spec for ${components.join(", ")}`,
    );
    continue;
  }
  const covered = new Set(
    local.flatMap((spec) => [
      spec.data.name,
      ...(spec.data.exports ?? []).map((symbol) => symbol.name),
    ]),
  );
  for (const component of components) {
    if (!covered.has(component)) {
      fail(
        toRepoPath(dir),
        `${component} is exported but no spec in this folder covers it`,
      );
    }
  }
}

for (const warning of warnings) console.warn(`warn   ${warning}`);
for (const error of errors) console.error(`error  ${error}`);
console.log(
  `\n${specs.length} spec(s) checked, ${errors.length} error(s), ${warnings.length} warning(s).`,
);
process.exitCode = errors.length > 0 ? 1 : 0;
