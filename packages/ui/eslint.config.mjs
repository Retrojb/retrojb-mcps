import { config } from "@retrojb/eslint-config/react-internal";
import tsdoc from "eslint-plugin-tsdoc";

/**
 * The shared React config, plus TSDoc syntax checking for the library source.
 *
 * `tsdoc/syntax` reads `tsdoc.json` in this package, which declares the custom
 * `@a11y` tag. Without that file the plugin reports `@a11y` as undefined. The
 * rules for what a doc block must contain are in `project-docs/TSDOC.md`; this
 * rule only catches malformed ones (an unescaped `{`, an unclosed code span, a
 * tag nobody defined).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...config,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { tsdoc },
    rules: { "tsdoc/syntax": "error" },
  },
];
