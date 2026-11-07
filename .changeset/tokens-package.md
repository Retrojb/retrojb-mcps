---
"@retrojb/tokens": minor
"@retrojb/ui": patch
"@retrojb/docs": patch
"@retrojb/retrojb-storybook": patch
---

Add `@retrojb/tokens`, a new package holding the design tokens that used to
live in `packages/ui/src/styles/tokens.css`. No token value changed.

The sources are `src/base.css`, `src/light.css` and `src/dark.css`. The build
writes `dist/index.css`, which has both themes with each themed colour declared
once as `light-dark(light, dark)`, plus `dist/light.css` and `dist/dark.css`
for apps that ship a single theme. The theme follows the OS, and
`data-theme="light"` or `data-theme="dark"` on `<html>` still forces one. The
dark values are no longer written twice.

`@retrojb/ui` now depends on `@retrojb/tokens` and bundles it into
`styles.css`, so consumers change nothing. `src/styles/tokens.css` is removed;
it was not in the package exports. Comments in `InlineAlert` and
`DynamicContainer` styles now point at the new package.

`check:contrast` in `@retrojb/docs` reads the two token source files. Storybook
accessibility docs point at the new file locations.
