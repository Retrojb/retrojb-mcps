/**
 * Tailwind CSS v4 for the docs site, through PostCSS.
 *
 * The library next door builds its stylesheet with `@tailwindcss/cli` because it
 * emits a standalone artifact. A Next.js app has a PostCSS step already, so the
 * plugin is the shorter route: Next picks this file up automatically and runs it
 * over `app/globals.css`, including in `next dev`.
 *
 * No `tailwind.config.*` on purpose. Tailwind v4 is configured in CSS — the theme,
 * the source globs, and the layer order all live in `app/globals.css`, which keeps
 * the palette and the build that consumes it in one place.
 *
 * @type {import("postcss-load-config").Config}
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
