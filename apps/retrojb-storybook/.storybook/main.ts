import type { StorybookConfig } from "@storybook/react-vite";

import { dirname, join } from "path";

import { fileURLToPath } from "url";

import remarkGfm from "remark-gfm";
import { mergeConfig } from "vite";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
/*
 * The `@retrojb/ui` source entry. Docgen only reads source files, and the
 * package's `main` points at `dist`, so without the alias below the docs pages
 * would have no component descriptions and no prop table. See the `viteFinal`
 * note.
 */
const uiSource = fileURLToPath(
  new URL("../../../packages/ui/src/index.ts", import.meta.url),
);

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
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    getAbsolutePath("@storybook/addon-mcp"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  docs: {
    defaultName: "Documentation",
  },
  /*
   * DOCGEN
   *
   * `react-docgen-typescript` rather than the default `react-docgen`. The
   * default reads one file and cannot follow `ButtonVariants["intent"]` to the
   * union behind it, so every variant would show as an opaque type name. This
   * one asks the TypeScript compiler, so the prop table shows
   * `"primary" | "secondary" | ...` and the descriptions written as TSDoc in
   * `types.ts` (see `project-docs/TSDOC.md`).
   *
   * The filter drops props declared in `node_modules`, which is every native
   * attribute the components inherit (`onClick`, `aria-*`, ...). What remains
   * is what the library adds or redeclares.
   */
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      tsconfigPath: fileURLToPath(
        new URL("./tsconfig.docgen.json", import.meta.url),
      ),
      // Globs resolve against the working directory, so source in a sibling
      // workspace package is skipped unless it is named.
      include: [join(dirname(uiSource), "components/**/*.tsx")],
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  /*
   * STORIES RUN AGAINST SOURCE
   *
   * Docgen only processes source files, and `@retrojb/ui` resolves to `dist`
   * through its `main` field. Pointing the bare specifier at `src/index.ts`
   * gives the docs pages the TSDoc. The subpaths (`@retrojb/ui/styles.css`,
   * `@retrojb/ui/icons`) are untouched and still resolve to `dist`, so the
   * stylesheet must be built (`npm run build -w @retrojb/ui`) before Storybook
   * starts, as before.
   */
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        alias: [{ find: /^@retrojb\/ui$/, replacement: uiSource }],
      },
    }),
};
export default config;
