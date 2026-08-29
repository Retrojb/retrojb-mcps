import nodePlugin from "eslint-plugin-n";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * For packages that run on Node: MCP servers, build scripts, CLIs.
 *
 * `eslint-plugin-n` is the part that earns its place. It checks imports against
 * the package's own declared dependencies and engines, so it catches the two
 * failure modes that only show up after publish or on someone else's machine:
 * importing a package that is not in `dependencies`, and using a Node API newer
 * than the `engines` range promises.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nodeConfig = [
  ...baseConfig,

  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  nodePlugin.configs["flat/recommended-module"],

  {
    rules: {
      // Extensionless relative imports break at runtime under NodeNext
      // resolution, and TypeScript will not tell you — it resolves them happily.
      "n/no-missing-import": "off",

      // The check that matters: importing something absent from package.json.
      "n/no-extraneous-import": "error",
      "n/no-unpublished-import": "off",

      // Flags APIs newer than the declared `engines.node` range.
      "n/no-unsupported-features/node-builtins": "error",

      // `process.exit()` in a library skips cleanup; a CLI entry point is fine,
      // so this is a warning rather than an error.
      "n/no-process-exit": "warn",

      // The rule checks a file against package.json `bin`, but `bin` points at
      // build output (`dist/bin.js`) while the shebang lives in the source
      // (`src/bin.ts`). It cannot see through the build step, so it reports every
      // compiled entry point as not needing one.
      "n/hashbang": "off",
    },
  },

  {
    // Test files and tooling legitimately reach for devDependencies.
    files: [
      "**/*.test.{ts,mts,js,mjs}",
      "**/tests/**",
      "**/tools/**",
      "**/scripts/**",
      "*.config.{ts,js,mjs}",
      "build.mjs",
    ],
    rules: {
      "n/no-extraneous-import": "off",
      "n/no-process-exit": "off",
    },
  },
];
