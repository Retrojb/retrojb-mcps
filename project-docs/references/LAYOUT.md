# Layout

How page layout works in `@retrojb/ui`: the breakpoints, the page grid,
`PageGrid` and `GridItem`, container queries, and the `min-width` patterns that
keep layouts from overflowing.

## Contents

- [The short version](#the-short-version)
- [Breakpoints](#breakpoints)
- [The page grid](#the-page-grid)
- [PageGrid and GridItem](#pagegrid-and-griditem)
- [A root layout](#a-root-layout)
- [Container queries](#container-queries)
- [min-width patterns](#min-width-patterns)
- [Edge cases](#edge-cases)

## The short version

- Breakpoints are Tailwind's: `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem,
  `2xl` 96rem. Mobile first.
- The page is a 12-column grid. Put one `PageGrid` per page region in the root
  layout, and place regions with `GridItem`.
- `GridItem` spans the full row unless you give it a `span`, so start full width
  and widen from `md` or `lg` up.
- Page layout follows the viewport. Components follow their container.
- Change the grid for the whole app by overriding the grid tokens. There is no
  provider and no JavaScript.

## Breakpoints

| Name  | Min width | px at a 16px root |
| ----- | --------- | ----------------- |
| base  | 0         | 0                 |
| `sm`  | 40rem     | 640               |
| `md`  | 48rem     | 768               |
| `lg`  | 64rem     | 1024              |
| `xl`  | 80rem     | 1280              |
| `2xl` | 96rem     | 1536              |

These are Tailwind's defaults, restated as `--breakpoint-*` in
`packages/ui/src/styles/theme.css` so the set is this library's decision and
does not move if Tailwind's does. They are rem, so a user who raises their
browser font size gets the narrower layout sooner, which is what WCAG 1.4.10
reflow needs.

`md` and `lg` also appear as literals in the grid media queries in
`packages/tokens/src/base.css`, because a custom property cannot be used in a
media query. Keep the two in step.

## The page grid

| Token              | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| `--grid-columns`   | `12`                                                      |
| `--grid-max-width` | `80rem` (1280px)                                          |
| `--grid-gutter`    | `--space-4`, `--space-5` from `md`, `--space-6` from `lg` |
| `--grid-margin`    | `--space-4`, `--space-6` from `md`, `--space-7` from `lg` |

Twelve columns at every width: it divides into halves, thirds, quarters and
sixths. On a 320px screen each column is about 9px, so in practice small screens
use spans of 12, 6 or 4.

The gutter and margin are spacing, so they follow density. They are declared on
`:root` and on every `[data-density]` element, so a `PageGrid` inside a
`data-density="compact"` section gets compact gutters.

## PageGrid and GridItem

`PageGrid` is the grid. `GridItem` is a region on it.

```tsx
<PageGrid as="main">
  <GridItem as="section" span={{ base: "full", lg: 8 }}>
    Article
  </GridItem>
  <GridItem as="aside" span={{ base: "full", lg: 4 }}>
    Related
  </GridItem>
</PageGrid>
```

| `GridItem` prop | Type                                             | Default | Meaning                              |
| --------------- | ------------------------------------------------ | ------- | ------------------------------------ |
| `span`          | `1`–`12`, `"full"`, or per breakpoint            | `full`  | Columns covered                      |
| `offset`        | `0`–`11`, or per breakpoint                      | none    | Empty columns before the item        |
| `subgrid`       | `boolean`                                        | `false` | Children use the page grid's columns |
| `as`            | `div section article aside nav header footer li` | `div`   | The element                          |

A per-breakpoint value is an object: `{ base: "full", md: 6, lg: 4 }`. A key you
leave out inherits from the next smaller key. `base` is below `sm`.

The names `span` and `offset` come from Ant Design. The breakpoint keys are
Tailwind's, so `span={{ md: 6 }}` reads like an `md:` class.

There is no `order` prop. Moving a region visually without moving it in the DOM
makes the reading and keyboard order disagree with the screen (WCAG 1.3.2,
2.4.3). Change the DOM order instead.

To place an element `GridItem` cannot render, use the two exports it is built
from:

```tsx
<NextLink
  href="/docs"
  className={gridItemStyles()}
  style={gridItemPlacement({ base: "full", md: 6 })}
/>
```

## A root layout

Set the grid once, in the app's root layout, and every page inherits it. Both
components are server components, so this works in a Next.js `app/layout.tsx`
without `"use client"`:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PageGrid as="header">
          <GridItem>Site header</GridItem>
        </PageGrid>
        <PageGrid as="main">{children}</PageGrid>
        <PageGrid as="footer">
          <GridItem>Site footer</GridItem>
        </PageGrid>
      </body>
    </html>
  );
}
```

Each page then renders `GridItem`s straight into `main`. One grid per region
keeps `header`, `main` and `footer` as real landmarks, and all three share the
same columns because they read the same tokens.

To change the grid for the whole app, override the tokens:

```css
:root {
  --grid-max-width: 90rem;
}
```

The Storybook page **Foundations / Page grid** has this layout as the "Root
layout template" story.

## Container queries

A media query asks how wide the viewport is. A container query asks how wide an
ancestor element is, so a component lays itself out for the space it was given
rather than for the screen.

1. **Mark the container.** `container-type: inline-size`, or Tailwind's
   `@container` class.
2. **Style its descendants by its width.** `@container (min-width: 28rem)`, or
   `@md:flex-row` in Tailwind.
3. **Name containers when they nest.** `@container/card` on the ancestor and
   `@md/card:flex-row` on the child. Unnamed queries match the nearest
   container.
4. **Size by the container.** `cqi` units are a percentage of the container's
   inline size, for example `font-size: clamp(1rem, 4cqi, 1.5rem)`.

Limits that matter in this library:

- An element cannot query itself, only an ancestor. That is why `Card`'s root is
  the container and its inner slots respond.
- A container's width can no longer depend on its content. Inside a
  shrink-to-fit parent, a container with no width of its own collapses to zero,
  which is why `Card`'s root is `w-full`.

**The rule:** media queries for page layout (`PageGrid`, navigation), container
queries for components (`Card`, `GraphicCard`, `DynamicContainer`). A card in an
8-column main area and the same card in a 4-column sidebar lay out differently
without the page telling them anything.

## min-width patterns

1. **Mobile first.** Base styles are for the smallest screen. `min-width`
   queries (`md:`) add layout as the screen grows. Use `max-*:` only for a
   bounded range.
2. **Queries in rem.** Media and container queries in rem respond to the user's
   font size. Tailwind's breakpoints and container sizes already are.
3. **`min-w-0` on flex and grid children.** A flex or grid item defaults to
   `min-width: auto`, so it refuses to shrink below its content and overflows.
   `GridItem`, `Card`, `Checkbox` and `Radio` already set `min-w-0`.
4. **`minmax(0, 1fr)`, not `1fr`.** `1fr` means `minmax(auto, 1fr)`, which lets
   content widen its column. `PageGrid` uses `minmax(0, 1fr)`.
5. **Intrinsic columns without overflow.**
   `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` lays out as many 16rem
   columns as fit, and the `min(100%, …)` stops the minimum overflowing a
   narrower container.
6. **Clamp width in one declaration.**
   `width: min(100% - 2 * var(--grid-margin), var(--grid-max-width))` replaces a
   `max-width` plus padding pair. `PageGrid` uses it.

## Edge cases

- **Span plus offset past the column count.** The page grid adds columns and the
  layout overflows. Keep `span + offset` at or below 12.
- **`"full"` ignores `offset`.** A full-width item always starts on a new row at
  the first column, at that breakpoint.
- **Inside a subgrid.** A child wider than the subgrid is clamped to it, so
  `span` without a value, or `"full"`, fills the subgrid.
- **Enlarged text on a small screen.** At 320px with text at 200%, eleven 32px
  gutters would be wider than the screen. The column gap is capped at
  `100% / (columns × 2)`, so gutters never take more than half the grid's width.
  Content inside a region can still overflow if it has a large minimum width of
  its own.
- **Grid items do not inherit placement.** A `GridItem` inside another one
  resets every placement property, so it never picks up its parent's span.

---

author: John Baltes

updated: 2026-11-06

---
