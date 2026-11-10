---
"@retrojb/tokens": minor
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Add the page grid: `PageGrid`, `GridItem` and the grid tokens.

`@retrojb/tokens` gains `--grid-columns` (12), `--grid-max-width` (80rem),
`--grid-gutter` and `--grid-margin`. The gutter and margin widen at `md`
(48rem) and `lg` (64rem) and follow `data-density`, including on nested
density regions.

`@retrojb/ui` adds `PageGrid`, the page's twelve-column grid, and `GridItem`,
which places a region on it with Ant-style `span` and `offset` props, each a
number or a per-breakpoint object (`{ base: "full", md: 6, lg: 4 }`), plus
`subgrid`. `GridItem` spans the full row by default and has no `order` prop,
so visual order is always DOM order. Both are server components.
`gridItemPlacement`, `gridItemStyles`, `pageGridStyles`, `GRID_BREAKPOINTS`
and the types are exported. Tailwind's breakpoints are restated as
`--breakpoint-*` in `theme.css`. The component spec schema accepts the
`foundations` category.

Storybook gains a Foundations / Page grid page with a root layout template.
See `project-docs/references/LAYOUT.md`.
