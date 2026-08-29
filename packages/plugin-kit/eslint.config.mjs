import { config } from "@retrojb/eslint-config/base";

/**
 * Base config only, no Node rules.
 *
 * This package runs inside a Figma plugin sandbox and a plugin iframe, neither of
 * which is Node. Applying the Node config would hand it `process` and friends as
 * valid globals, which is exactly the mistake the package is built to avoid.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default config;
