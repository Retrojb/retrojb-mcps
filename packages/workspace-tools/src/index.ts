/**
 * Shared utilities for the monorepo.
 *
 * Host-agnostic by construction: no Node imports, no DOM. ESLint enforces that
 * for everything under `src/lib`, because these are imported by packages that run
 * in a Figma plugin sandbox where `fs` and `process` do not exist.
 *
 * The CLI half of this package lives in `src/cli` and is reached through the
 * `retro` binary, not through this entry point.
 *
 * Scope note: these are extractions, not a wish list. Each one either removed
 * real duplication or was needed by the CLI in this same package.
 */

export {
  collapseWhitespace,
  truncate,
  kebabCase,
  pascalCase,
  camelCase,
  pluralize,
  formatBytes,
  type TruncateOptions,
} from "./lib/strings.js";

export { errorMessage, toError, hasErrorCode } from "./lib/errors.js";

export { clamp, roundTo, sum } from "./lib/numbers.js";
