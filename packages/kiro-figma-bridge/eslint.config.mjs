import { config, nodeGlobalsFor } from "@retrojb/eslint-config/base";
import globals from "globals";

const NODE_FILES = ["build.mjs", "tests/**/*.mjs"];

/**
 * Four execution contexts in one package, so four scopes.
 *
 * The point of separating them is that a global available in one context is a
 * runtime crash in another: `document` does not exist in the Figma sandbox,
 * `figma` does not exist in the plugin iframe, and neither exists on the server.
 * Scoping globals per directory turns that class of mistake into a lint error at
 * the offending line rather than a blank plugin window.
 *
 * Each scope names its tsconfig explicitly instead of relying on the base
 * config's `projectService`, because the root `tsconfig.json` covers only the
 * server half. That also means the type information ESLint sees is the same one
 * each context actually compiles against.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...config,

  {
    // The Figma sandbox: the `figma` API, no DOM, no Node.
    //
    // `bridge-messages.ts` is checked here rather than with the other shared
    // modules because it is the sandbox-to-UI contract and is not part of the
    // server's TypeScript program at all.
    files: ["src/sandbox/**/*.ts", "src/shared/bridge-messages.ts"],
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

  {
    // The bridge server, plus the two shared modules that compile in every
    // context and so are part of the server's program.
    files: [
      "src/index.ts",
      "src/server/**/*.ts",
      "src/shared/protocol.ts",
      "src/shared/hmac.ts",
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      /*
       * These variables configure the bridge server at run time and are never
       * read while anything is compiled, so they must not become part of turbo's
       * build cache key — rotating a Figma token should not invalidate every
       * cached build in the repo.
       *
       * `turbo/no-undeclared-env-vars` exists to catch the opposite mistake: a
       * build-time variable turbo cannot see, which makes it serve a stale
       * result. That risk does not apply here, so the exemption is scoped to
       * this package's server sources rather than turned off repo-wide.
       */
      "turbo/no-undeclared-env-vars": [
        "error",
        { allowList: ["^FIGMA_ACCESS_TOKEN$", "^KIRO_FIGMA_BRIDGE_"] },
      ],
    },
  },

  // Build script and tests run on Node.
  ...nodeGlobalsFor(NODE_FILES),

  {
    ignores: ["dist/**"],
  },
];
