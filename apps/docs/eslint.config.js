import { nodeGlobalsFor } from "@retrojb/eslint-config/base";
import { nextJsConfig } from "@retrojb/eslint-config/next-js";

/**
 * Next app, plus the Node-side scripts it ships.
 *
 * `scripts/` runs under Node rather than in a browser, so it needs Node globals.
 * Without this scope, `process` reads as undefined and the palette contrast check
 * fails to lint.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...nextJsConfig,
  ...nodeGlobalsFor(["scripts/**/*.mjs", "next.config.js"]),
];
