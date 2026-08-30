/**
 * @type {import("prettier").Config}
 */
const config = {
  printWidth: 80,
  proseWrap: "always",
  useTabs: false,
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  bracketSpacing: true,
  arrowParens: "always",
  endOfLine: "lf",
  overrides: [
    {
      files: ["*.md", "*.mdx"],
      options: {
        proseWrap: "always",
        embeddedLanguageFormatting: "auto",
      },
    },
    {
      files: ["*.json", "*.jsonc", ".prettierrc", "tsconfig*.json"],
      options: { printWidth: 100, trailingComma: "none" },
    },
    {
      files: "package.json",
      options: { printWidth: 100, trailingComma: "none", tabWidth: 2 },
    },
    {
      files: ["*.yml", "*.yaml"],
      options: { singleQuote: false },
    },
    {
      files: "*.html",
      options: { printWidth: 100 },
    },
  ],
};

export default config;
