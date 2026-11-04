/**
 * Shared loader for the per-component spec files.
 *
 * A spec is `<Name>Spec.yaml`, kept in the component's own folder under
 * `src/components`. Both CI checks read specs through here so they agree on
 * where specs live and how they parse. Change the glob in one place if the
 * layout moves.
 */
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "node:fs/promises";
import { parse } from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = resolve(HERE, "..");
export const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");
export const COMPONENTS_ROOT = resolve(PACKAGE_ROOT, "src/components");
export const SCHEMA_FILE = resolve(PACKAGE_ROOT, "componentSpec.schema.json");
export const SPEC_SUFFIX = "Spec.yaml";

/** Repo-relative, forward-slashed. What specs store and what git prints. */
export function toRepoPath(absolutePath) {
  return relative(REPO_ROOT, absolutePath).split(sep).join("/");
}

/**
 * Every spec under `src/components`, parsed.
 *
 * A file that fails to parse is returned with `error` set rather than thrown,
 * so one broken file is reported alongside the rest instead of hiding them.
 */
export async function loadSpecs(root = COMPONENTS_ROOT) {
  const specs = [];
  for await (const entry of glob(`**/*${SPEC_SUFFIX}`, { cwd: root })) {
    const file = resolve(root, entry);
    const source = await readFile(file, "utf8");
    try {
      specs.push({ file, path: toRepoPath(file), data: parse(source) });
    } catch (error) {
      specs.push({ file, path: toRepoPath(file), data: null, error });
    }
  }
  return specs.sort((a, b) => a.path.localeCompare(b.path));
}
