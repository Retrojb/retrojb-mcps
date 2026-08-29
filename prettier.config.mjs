/**
 * Prettier configuration for the whole repo.
 *
 * Values are set explicitly rather than left to defaults, including the ones that
 * happen to match the default. Two reasons: the defaults have changed between
 * major Prettier versions, and `.editorconfig` silently feeds into Prettier when
 * a key is absent here. Being explicit means the formatting is decided in one
 * place and cannot drift because someone edited a different file.
 *
 * @type {import("prettier").Config}
 */
const config = {
  // --- Wrapping ---------------------------------------------------------------
  // 80 columns. Every file in the repo is already written to roughly this, and it
  // keeps side-by-side diffs readable on a laptop.
  printWidth: 80,

  // Reflows prose in Markdown to printWidth. Without this, Prettier leaves
  // paragraphs exactly as typed, so a doc edited in a wide editor ends up with
  // 400-character lines and every later change shows as a whole-paragraph diff.
  proseWrap: "always",

  // --- Indentation ------------------------------------------------------------
  // Spaces, two of them. Set here on purpose: whatever `.editorconfig` says,
  // this wins, so the formatter and the repo cannot disagree.
  useTabs: false,
  tabWidth: 2,

  // --- Syntax -----------------------------------------------------------------
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  bracketSpacing: true,
  arrowParens: "always",

  // LF everywhere, matching `.editorconfig`. Avoids a whole-file diff when
  // someone commits from Windows.
  endOfLine: "lf",

  overrides: [
    {
      // Prose files: wrapping is the point.
      files: ["*.md", "*.mdx"],
      options: {
        proseWrap: "always",
        // Trailing double-space line breaks are invisible and easy to destroy.
        // Prettier preserves them, but flagging the intent here is cheap.
        embeddedLanguageFormatting: "auto",
      },
    },
    {
      // JSON has no line-length pressure worth honouring; long dependency
      // specifiers and URLs read better unwrapped.
      files: ["*.json", "*.jsonc", ".prettierrc", "tsconfig*.json"],
      options: { printWidth: 100, trailingComma: "none" },
    },
    {
      // package.json is written by npm, which uses its own formatting. Matching
      // it here stops `npm install` and `prettier --write` from fighting.
      files: "package.json",
      options: { printWidth: 100, trailingComma: "none", tabWidth: 2 },
    },
    {
      files: ["*.yml", "*.yaml"],
      options: { singleQuote: false },
    },
    {
      // Generated or externally-authored HTML: leave attribute wrapping alone.
      files: "*.html",
      options: { printWidth: 100 },
    },
  ],
};

export default config;
