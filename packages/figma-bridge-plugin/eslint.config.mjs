import { config, nodeGlobalsFor } from "@retrojb/eslint-config/base";
import globals from "globals";

const NODE_FILES = ["build.mjs", "tools/**/*.mjs", "tests/**/*.mjs"];

/**
 * Three execution contexts in one package, so three scopes.
 *
 * The point of separating them is that a global available in one context is a
 * runtime crash in another: `document` does not exist in the Figma sandbox, and
 * `figma` does not exist in the plugin iframe. Scoping globals per directory
 * turns that class of mistake into a lint error at the offending line.
 *
 * This package also has no root `tsconfig.json` — it has one per context — so
 * the base config's `projectService` has nothing to discover. Each scope names
 * its project explicitly instead, which additionally means the type information
 * ESLint sees is the same as the one that context compiles against.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...config,

  {
    // The Figma sandbox: the `figma` API, no DOM, no Node.
    files: ["src/sandbox/**/*.ts", "src/shared/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./tsconfig.sandbox.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { figma: "readonly", __html__: "readonly" },
    },
  },

  {
    // The plugin iframe: a real DOM, no `figma`.
    files: ["src/ui/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./tsconfig.ui.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
  },

  // Build script, mock harness, and tests run on Node.
  ...nodeGlobalsFor(NODE_FILES),

  {
    ignores: ["dist/**"],
  },
];
