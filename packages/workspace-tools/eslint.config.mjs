import { nodeConfig } from "@retrojb/eslint-config/node";

/**
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...nodeConfig,

  {
    files: ["src/index.ts", "src/lib/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fs", "path", "os", "child_process", "url"],
              message:
                "src/lib must stay host-agnostic so it can be imported from the Figma sandbox. Put Node-specific code in src/cli.",
            },
          ],
        },
      ],
    },
  },

  {
    ignores: ["dist/**", "src/cli/templates/**"],
  },
];
