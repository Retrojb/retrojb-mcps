---
"@retrojb/retrojb-storybook": patch
---

Declare `@retrojb/ui` as a dependency and import its stylesheet.

The stories imported the package without depending on it, which resolved only
through the hoisted workspace symlink. Turbo therefore had no edge from this app
to the library and would not build it first, so the stories could run against a
stale or missing `dist` — which is how a resolution failure in the library
surfaced here rather than in its own build.

`.storybook/preview.tsx` now imports `@retrojb/ui/styles.css`, so components
render with their rules attached and the a11y addon checks contrast against the
palette the package actually ships.
