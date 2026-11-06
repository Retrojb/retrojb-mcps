# Grid, breakpoints, layout primitives and layers: ten systems compared

See `foundations-00-README.md` for method and caveats. Atlassian grid and Primer
breakpoints were not researched. Material 3 breakpoints come from the Android
window size class docs, which describe the same classes. M3 column counts and
margins were not verified.

## Grid and breakpoints

| System     | Grid                                                  | Columns          | Gutter and margins                                                              | Breakpoints (min width, px)                           | Mobile-first              |
| ---------- | ----------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------- |
| Material 3 | Window size classes                                   | Not verified     | Not verified                                                                    | 0, 600, 840, 1200, 1600                               | n/a (classes)             |
| Carbon     | 2x Grid, 8px mini unit                                | 4, 8, 16, 16, 16 | 16px padding per box, 32px total gutter or gutterless; margin 0, 16, 16, 16, 24 | 320, 672, 1056, 1312, 1584                            | Not stated                |
| Polaris    | Grid component                                        | 12               | Via `gap`                                                                       | 0, 490, 768, 1040, 1440                               | Up, down and only queries |
| Atlassian  | Not researched                                        |                  |                                                                                 | Not researched                                        |                           |
| Fluent 2   | Guidance only (column, baseline, manuscript, modular) | 12 recommended   | Gutter is a multiple of the 4px unit; margins change per breakpoint             | 320, 480, 640, 1024, 1366, 1920                       | Not stated                |
| Primer     | Not researched                                        |                  |                                                                                 | Not researched                                        |                           |
| Ant Design | Row and Col                                           | 24               | `gutter` prop, recommended 16 + 8n px, responsive object allowed                | 0, 576, 768, 992, 1200, 1600, 1920 (plus a 480 token) | Yes                       |
| Bootstrap  | Container, row, col                                   | 12               | 1.5rem gutter (.75rem each side), `g-*`, `gx-*`, `gy-*`                         | 0, 576, 768, 992, 1200, 1400                          | Yes                       |
| Tailwind 4 | None built in; CSS grid utilities                     | n/a              | `gap-*`                                                                         | 640, 768, 1024, 1280, 1536                            | Yes                       |
| Chakra 3   | `Grid`, `SimpleGrid`                                  | n/a              | `gap`                                                                           | 480, 768, 1024, 1280, 1536                            | Yes                       |

### Container max widths

Bootstrap: none, 540, 720, 960, 1140, 1320 at its six breakpoints. Carbon's
table gives the maximum layout at 1584px.

### Patterns in the breakpoints

- **768 appears in five of ten systems** (Bootstrap, Ant, Chakra, Tailwind,
  Polaris). 1024 or its neighbours (992, 1040, 1056) appear in seven. 480 to 490
  appears in four (Polaris, Chakra, Ant's token, Fluent).
- **Five or six breakpoints is typical.** Ant has seven, Fluent six.
- **Mobile-first `min-width` queries dominate** in the code-first libraries
  (Bootstrap, Tailwind, Chakra, Ant).
- **Carbon and Material define breakpoints by column count or window class**,
  not by device. Android's docs say window size classes are not determined by
  device screen size.
- **Units differ.** Tailwind, Polaris and Chakra (its `2xl` is `96rem`) publish
  rem, so the layout switches later when a user raises their browser font size.
  Bootstrap and Ant publish px. Carbon's table gives both.

### Columns

- **12 is the shared default** (Bootstrap, Polaris, Fluent). Fluent's reason is
  that 12 divides into halves, thirds, fourths and sixths.
- **Ant uses 24** because it halves a 12-column system for finer control.
- **Carbon grows with the viewport:** 4, then 8, then 16.
- **Tailwind and Chakra ship no column grid.** You write `grid-cols-12` or set
  `columns` on `SimpleGrid`.
- **Margins widen with the viewport** in Carbon (0, then 16, then 24) and Fluent
  advises varying them per breakpoint.

## Layout primitives

The trend is from a column framework toward small composable primitives that use
`gap`.

| System     | Primitives                                                                            | Notes                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Polaris    | Web components `s-stack` (replaces `BlockStack` and `InlineStack`), `s-grid`, `s-box` | `s-stack` and `s-grid` have no gap by default. `direction="inline"` wraps. Layout values can take `@container` conditions.          |
| Carbon     | `Stack`, grid components                                                              | Stack uses the spacing scale and supports a custom `gap`. Docs say components should leave positioning to parents and avoid margin. |
| Atlassian  | `Bleed` (confirmed)                                                                   | Other primitives were not researched.                                                                                               |
| Ant Design | `Flex`, `Space`, `Grid`, `Layout`, `Splitter`, `Masonry`                              | `Space` and `Flex` are the common routes. Grid is for page-scale columns.                                                           |
| Chakra     | `Stack`, `Grid`, `SimpleGrid`                                                         | `SimpleGrid` takes `columns` and a gap shorthand.                                                                                   |
| Primer     | Stack and control token families                                                      | The tokens (`--stack-gap-*`, `--controlStack-*`) are the layout contract. Components were not reviewed.                             |
| Bootstrap  | Container, row, col, `gap-*` utilities                                                | Gutters use padding with negative row margin. `gap` utilities are the newer route.                                                  |
| Tailwind   | Flex, grid, `gap-*`, container utilities                                              | No components.                                                                                                                      |
| Fluent 2   | None documented                                                                       | Guidance and tokens only.                                                                                                           |
| Material 3 | Not verified                                                                          |                                                                                                                                     |

## Responsive technique

- **Container queries are arriving.** Polaris web components accept `@container`
  conditions (for example, switch when the container's inline size exceeds
  500px) and give a mobile-first fallback. Tailwind generates `@sm:` through
  `@7xl:` variants from `--container-*` (16rem to 80rem).
- **Fluent names six responsive techniques:** reposition, resize, reflow,
  show/hide, re-architect (and adaptive vs responsive).
- **Breakpoint-per-step spacing.** Carbon and Fluent both recommend changing
  which spacing token is used at a breakpoint rather than having the token
  itself change.

## Layering and z-index

| System      | Layers                                                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atlassian   | 100 none · 200 navigation · 300 inline dialog · 400 popup · 500 blanket · 510 modal · 600 flag · 700 spotlight · 800 tooltip. Each is also assigned an elevation level (none, default, overlay).                                                |
| Chakra      | hide -1 · base 0 · docked 10 · dropdown 1000 · sticky 1100 · banner 1200 · overlay 1300 · modal 1400 · popover 1500 · skipNav 1600 · toast 1700 · tooltip 1800                                                                                  |
| Primer      | Semantic names: behind, default, sticky, dropdown, overlay, modal, popover, skipLink. Base sizes 0 to 600 in steps of 100. Rules: use tokens, never raw numbers; pair with a shadow level; prefer a new stacking context over a higher z-index. |
| Polaris     | 0 auto · 1 = 100 · 2 = 400 · 3 = 510 · 4 to 12 = 512 to 520                                                                                                                                                                                     |
| Retro today | Raw values: `z-10` (Table sticky header, ComboBox listbox, Card raised link), `z-50` (Toast region). ComboBox uses `isolate` to contain its `z-10`. `BrowserAlert` uses the native `<dialog>` top layer.                                        |

Patterns:

- All four systems with z-index tokens leave gaps (steps of 100, or 1000-based)
  so layers can be inserted.
- Atlassian and Primer tie z-index to shadow level, so one decision picks both.
- Primer's rule to prefer `isolation: isolate` over escalating z-index matches
  what `ComboBox/styles.ts` already does.
- Chakra orders dropdown, sticky, banner, overlay, modal, popover, skip
  navigation, toast, tooltip from low to high, so a tooltip can still show above
  a toast.

## How `@retrojb/ui` compares

- **Breakpoints are Tailwind defaults** (`sm:` is used in `DynamicContainer`).
  `theme.css` defines no `--breakpoint-*`, so the set is implicit.
- **Container queries are already the primary technique for components.** `Card`
  is an `@container` that switches at `@md`. `DynamicContainer` has
  `responsiveTo="container"` that switches at `@sm`. `GraphicCard` states the
  reason: a card does not know where it will be placed. This matches the
  direction Polaris and Tailwind are heading.
- **Layout primitives exist in minimal form.** `containers/` has `card` and
  `dynamicContainer`. `components/foundations/` is empty.
- **No grid component, page container, or margin or gutter tokens that I
  found.**
- **Layers are raw numbers**, and there is no shadow-to-layer pairing.

## Sources

- Android window size classes (the M3 classes):
  https://developer.android.com/develop/ui/views/layout/use-window-size-classes
- Material 3 adaptive overview:
  https://m3.material.io/foundations/adaptive-design/overview
- Carbon 2x Grid: https://www.carbondesignsystem.com/elements/2x-grid/overview/
- Polaris Grid: https://polaris.shopify.com/components/layout-and-structure/grid
- Polaris web components (stack, grid, container queries):
  https://shopify.dev/docs/api/polaris/using-polaris-web-components
- Polaris tokens (breakpoints, z-index):
  https://www.npmjs.com/package/@shopify/polaris-tokens
- Atlassian elevation (z-index table):
  https://atlassian.design/foundations/elevation
- Atlassian Bleed:
  https://developer.atlassian.com/platform/forge/ui-kit/components/bleed/
- Fluent 2 layout: https://fluent2.microsoft.design/layout
- Primer tokens guide (z-index, stack):
  https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md
- Ant Design Grid: https://ant.design/components/grid
- Ant Design breakpoint tokens:
  https://github.com/ant-design/ant-design/tree/master/components/theme
- Bootstrap grid: https://getbootstrap.com/docs/5.3/layout/grid/
- Bootstrap gutters: https://getbootstrap.com/docs/5.3/layout/gutters/
- Tailwind responsive design: https://tailwindcss.com/docs/responsive-design
- Tailwind theme (`--container-*`):
  https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css
- Chakra breakpoints: https://chakra-ui.com/docs/theming/breakpoints
- Chakra z-indices: `@chakra-ui/react` 3.38.0 `theme/tokens/z-indices`
