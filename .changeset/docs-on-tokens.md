---
"@retrojb/docs": patch
---

The docs site now uses the design tokens for spacing, type, radii, border
widths and fonts instead of literal values, and sets itself up the way
`packages/ui/README.md` documents for any app with its own Tailwind build.

- `globals.css` imports `@retrojb/tokens` after Tailwind's theme, so the
  tokens' `--radius-xs` and `--radius-sm` (4px and 8px) win over Tailwind's
  (2px and 4px). Radii on the site and in library components here were
  rendering at half size.
- Brand faces are set through `--font-family-sans` and `--font-family-mono`,
  with the Geist font classes moved to `<html>`, so library components use
  Geist too.
- Headings use the library's type roles, stepping up one role at `md`, instead
  of viewport-based `clamp()` sizes.
- The shell layout is mobile first and switches at the shared `lg` breakpoint
  (64rem) instead of a desktop-first `max-width: 60rem` query.
- At 320px with 200% text, long inline code and long headings now wrap and the
  colour swatches shrink, instead of widening the page.
