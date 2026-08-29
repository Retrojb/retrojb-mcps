import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint base: plain JavaScript and TypeScript.
 *
 * Type-aware rules are on. They need a TypeScript program, which is slower than
 * syntax-only linting, but they are the rules that actually catch bugs — a
 * floating promise or a misused `await` is invisible without type information,
 * and this repo is full of async transport code where those matter.
 *
 * `eslint-config-prettier` is last so it can switch off the stylistic rules that
 * would otherwise fight the formatter. Formatting is Prettier's job; ESLint is
 * only asked about correctness here.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  {
    // Applies to every consumer. Build output and dependencies are never linted.
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  {
    // `projectService` lets typescript-eslint find the right tsconfig per file,
    // which matters for packages that legitimately have several — the Figma
    // bridge has one per execution context.
    languageOptions: {
      parserOptions: {
        projectService: {
          // Config files and scripts sit outside every tsconfig's `include`.
          // Without this they fail to lint at all rather than linting untyped.
          allowDefaultProject: ["*.js", "*.mjs", "*.cjs"],
        },
      },
    },
  },

  {
    plugins: { turbo: turboPlugin },
    rules: {
      // Reading an env var that turbo.json does not declare breaks caching:
      // turbo cannot know the input changed, so it serves a stale result.
      "turbo/no-undeclared-env-vars": "error",
    },
  },

  {
    rules: {
      // An unhandled rejection in a plugin sandbox or an MCP server surfaces as
      // a silent no-op, so these are errors rather than warnings.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // Allows the deliberate `void promise` idiom used for fire-and-forget work.
      "no-void": ["error", { allowAsStatement: true }],

      // `_`-prefixed names are the convention for intentionally unused bindings,
      // which destructuring-to-omit relies on.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Type-only imports carry no runtime cost and make the boundary explicit.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": "off",

      // Dynamic evaluation stays a reviewed exception rather than something that
      // can slip in unnoticed. The Figma bridge needs it in exactly one place —
      // the sandbox blocks the Function constructors — and disables it inline
      // with a justification.
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },

  {
    // Type-aware rules cannot run on files outside a TypeScript program, and
    // config files and build scripts are not in one. Spread rather than
    // `extends`, which flat config does not support. `files` comes after the
    // spread so it cannot be overwritten by the preset.
    ...tseslint.configs.disableTypeChecked,
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
  },

  eslintConfigPrettier,
];

/**
 * Node globals scoped to specific files.
 *
 * For packages that are mostly not Node but have Node-side tooling — a bundler
 * script, a mock server, tests. Keeps `process` and friends out of scope in the
 * source that ships.
 *
 * @param {string[]} files Glob patterns to apply Node globals to.
 * @returns {import("eslint").Linter.Config[]}
 */
export function nodeGlobalsFor(files) {
  return [
    {
      files,
      languageOptions: {
        globals: { ...globals.node },
      },
    },
  ];
}
