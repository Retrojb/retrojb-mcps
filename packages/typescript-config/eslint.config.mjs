import { config } from "@retrojb/eslint-config/base";

/**
 * This package is only JSON today, so there is nothing for ESLint to check.
 *
 * The config exists anyway so `turbo run lint` covers this workspace rather than
 * skipping it — a package with no lint script is invisible to the pipeline, and
 * the first `.js` file added here would go unchecked indefinitely.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default config;
