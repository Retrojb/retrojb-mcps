import type { StorybookConfig } from "@storybook/react-vite";

import { dirname } from "path";

import { fileURLToPath } from "url";

import remarkGfm from "remark-gfm";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-a11y"),
    {
      name: getAbsolutePath("@storybook/addon-docs"),
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            /*
             * MDX parses CommonMark, where tables are not included — they are a
             * GitHub-flavoured extension. Without this plugin a pipe table
             * renders as a paragraph of literal `|` characters instead of a
             * `<table>`. The per-component `accessibilityDocs` pages are
             * largely contrast-ratio tables, so this is what makes them
             * legible.
             */
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    getAbsolutePath("@storybook/addon-mcp"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
};
export default config;
