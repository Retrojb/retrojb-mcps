# Spacing and density

How spacing works in `@retrojb/ui`: the `--space-*` scale, the three density
modes, what density changes and what it never changes, and the edge cases to
know before you use it.

## Contents

- [The short version](#the-short-version)
- [The scale](#the-scale)
- [Setting a density](#setting-a-density)
- [What density changes](#what-density-changes)
- [Spacing, size or geometry](#spacing-size-or-geometry)
- [Edge cases and restrictions](#edge-cases-and-restrictions)
- [Migrating from `--spacing-*`](#migrating-from---spacing-)

## The short version

- Use `--space-0` to `--space-10` for padding, gaps and margins:
  `p-(--space-4)`, `gap-(--space-2)`.
- Set `data-density="compact"` or `data-density="spacious"` on `<html>`, or on
  any element, to change those values inside it. Comfort is the default.
- Density changes spacing only. Control heights, icon sizes, borders and type
  stay the same, so a compact control is still at least 24 × 24px.
- A step number is a position on the scale, not a size. `--space-4` is 16px in
  comfort, 12px in compact and 24px in spacious.

## The scale

Values in px at a 16px root. They ship as rem, so they grow when a user raises
their browser's font size.

| Token        | Compact | Comfort (default) | Spacious |
| ------------ | ------: | ----------------: | -------: |
| `--space-0`  |       0 |                 0 |        0 |
| `--space-1`  |       2 |                 4 |        4 |
| `--space-2`  |       6 |                 8 |        8 |
| `--space-3`  |       8 |                12 |       16 |
| `--space-4`  |      12 |                16 |       24 |
| `--space-5`  |      16 |                20 |       32 |
| `--space-6`  |      18 |                24 |       40 |
| `--space-7`  |      24 |                32 |       48 |
| `--space-8`  |      32 |                40 |       56 |
| `--space-9`  |      36 |                48 |       64 |
| `--space-10` |      48 |                64 |       80 |

- **Compact** steps are multiples of 2px.
- **Comfort** steps are multiples of 4px.
- **Spacious** steps are multiples of 8px from `--space-2` up. Steps 1 and 2
  stay at 4px and 8px, the same as comfort. Doubling the smallest gaps (an icon
  beside its label, a label above its field) would visually separate things that
  belong together, so spacious grows the medium and large gaps and leaves the
  smallest alone.

The Storybook page **Foundations / Spacing** renders this table live in all
three densities, measured from the page.

## Setting a density

```html
<!-- The whole app -->
<html data-density="compact">
  <!-- One region inside it -->
  <section data-density="comfort">…</section>
</html>
```

| Value      | Effect                                               |
| ---------- | ---------------------------------------------------- |
| (none)     | Comfort                                              |
| `compact`  | The compact column                                   |
| `comfort`  | Comfort, explicitly. Use it to opt a region back out |
| `spacious` | The spacious column                                  |

Density nests. The nearest ancestor with `data-density` wins, so a dense data
table can sit inside a comfortable page, and a comfortable dialog can sit inside
a compact app. Theme does not work this way: `data-theme` only works on
`<html>`.

## What density changes

| Changes with density                                                       | Never changes with density                           |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| Padding inside buttons, inputs, chips, tabs, table cells, alerts, cards    | Control heights (`--control-height-*`)               |
| Gaps between a control and its label, between items in a group or list     | Icon sizes, checkbox and radio boxes, toggle tracks  |
| The indent that lines helper text up with a label                          | Border widths, radii, focus outline width and offset |
| Margins between stacked items (for example the popup offset of a combobox) | Type sizes and line heights                          |
|                                                                            | List marker gutters                                  |

Because control heights are fixed, every library control keeps the target height
it has in comfort, and the smallest (`--control-height-xs`) is the 24px minimum
of WCAG 2.5.8. Measured across all 211 Storybook stories in compact: nothing
that was at least 24 × 24px in comfort falls below it.

## Spacing, size or geometry

Every length in a component is one of three kinds, and each kind has one way to
write it. When you add a component, decide which kind each length is.

| Kind     | What it is                          | Write it as                                                                                    | Follows density     |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------- |
| Spacing  | Space between or around things      | `p-(--space-3)`, `gap-(--space-2)`                                                             | Yes                 |
| Size     | How big a thing is                  | `h-(--control-height-md)` for controls; Tailwind's scale (`size-5`, `h-2`) for graphical parts | No                  |
| Geometry | A length derived from other lengths | `calc()` of its parts                                                                          | Only if a part does |

Examples of geometry in the library:

- **Helper-text indent.** A checkbox's description lines up with the label text,
  so its indent is the box plus the gap:
  `ps-[calc(--spacing(6)+var(--space-2))]`. When density shrinks the gap, the
  indent shrinks with it and stays aligned.
- **Combobox affordance inset.** The clear and toggle buttons sit centred in the
  field, so their inset is `(height - button) / 2`: 4, 6 or 8px. It is written
  as a fixed `pr-*` because neither part changes with density.
- **Toggle thumb inset.** `ms-1`, fixed, because it pairs with the fixed
  `translate-x-*` that moves the thumb along the track.

## Edge cases and restrictions

**Step numbers do not mean the same size in every density.** `--space-4` is 12,
16 or 24px. Do not use a space token where you need an exact size, such as the
width of an icon or the height of a control. Use a size instead.

**Steps can collide.** In spacious, `--space-1` and `--space-2` equal comfort.
In compact, `--space-5` (16px) and `--space-6` (18px) are only 2px apart. Two
elements spaced by adjacent steps can look the same in one density and different
in another. Pick steps for their role, not to hit a pixel value.

**Spacious grows layouts by up to 50%.** `--space-4` and above are 1.5 to 2
times their comfort value. A layout that fits a container exactly in comfort can
wrap or overflow in spacious. Test fixed-width layouts in all three.

**Compact is not always smaller.** Controls keep their height, so a compact
toolbar is narrower (less inline padding) but not shorter. Expect compact to
save space mostly between and around controls, not inside them.

**Density does not reach values resolved at `:root`.** A custom property that
holds `var()` is resolved on the element that declares it. If your app declares
`:root { --gutter: var(--space-4); }` and a section sets
`data-density="compact"`, `--gutter` inside that section is still the comfort
16px. Either read `--space-*` directly in your styles, or redeclare your alias
inside your own `[data-density]` selectors. The deprecated `--spacing-*` aliases
have the same limit.

**An unlayered override beats density.** The density values are declared in
`@layer theme`. If your app sets `:root { --space-3: 10px; }` without a layer,
that value wins in every density. Override density values inside
`[data-density="…"]` selectors instead.

**Off-scale values are not available.** Comfort has no 6px or 10px step, and
compact has no 4px or 10px step. Moving to the scale changed a few component
dimensions at the default density by 2px. See the Phase 2 notes in the
[foundations plan][foundations-plan].

**Text spacing overrides still apply.** Density does not change line height or
letter spacing, and controls set heights with `h-` or `min-h-` as before, so
WCAG 1.4.12 text spacing overrides behave the same in every density. No story
clips at 200% text size in compact.

## Migrating from `--spacing-*`

The old tokens still exist as deprecated aliases and will be removed in a future
breaking release. Nothing in `@retrojb/ui` reads them.

| Old                                                      | New                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `--spacing-0`                                            | `--space-0`                                                                    |
| `--spacing-10`                                           | `--space-1`                                                                    |
| `--spacing-20`                                           | `--space-2`                                                                    |
| `--spacing-30`                                           | `--space-3`                                                                    |
| `--spacing-40`                                           | `--space-4`                                                                    |
| `--spacing-50`                                           | `--space-5`                                                                    |
| `--spacing-60`                                           | `--space-6`                                                                    |
| `--spacing-80`                                           | `--space-7`                                                                    |
| `--spacing-100`                                          | `--space-8`                                                                    |
| `--spacing-300`                                          | `--space-9`                                                                    |
| `--spacing-700`                                          | `--space-10`                                                                   |
| `--spacing-70`, `-90`, `-200`, `-400` to `-900`, `-1000` | No equivalent. These were sizes in practice; use a size utility or a `calc()`. |

Old aliases that map to a new step follow the density set on `<html>`, but not a
density set on a nested element. Old aliases with no equivalent keep their old
value, now in rem.

---

author: John Baltes

updated: 2026-11-06

---

[foundations-plan]:
  ../research/foundations/foundations-06-implementation-plan.md
