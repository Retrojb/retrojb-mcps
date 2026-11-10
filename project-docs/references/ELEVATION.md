# Elevation and bevels

How depth works in `@retrojb/ui`: the `--elevation-*` shadow levels and roles,
the `--bevel-*` inset edges, how they pair with surfaces, and the rules that
keep them accessible.

## Contents

- [The short version](#the-short-version)
- [Levels](#levels)
- [Roles](#roles)
- [Bevels](#bevels)
- [Where the library uses them](#where-the-library-uses-them)
- [Inside an overlay](#inside-an-overlay)
- [Light and dark](#light-and-dark)
- [Rules](#rules)
- [Tailwind behaviour](#tailwind-behaviour)

## The short version

- Components use roles: `shadow-control`, `shadow-raised-1`, `shadow-overlay`
  and so on. Never a numbered level.
- A role pairs with the surface of the same name: `shadow-raised-1` goes on
  `bg-surface-raised-1`. The `control` roles go on the control's own fill.
- Bevels are inset edges: `inset-shadow-bevel-sm`, `-md`, `-lg`, `-pressed`.
  They stack with a role on the same element.
- A shadow is never what identifies a control. Forced-colors mode removes every
  shadow, so the element needs a real border.

## Levels

`--elevation-0` to `--elevation-6`, defined in `packages/tokens/src/base.css`.
Each level is two layers: a tight contact shadow over a soft ambient one.

| Level | Contact layer        | Ambient layer          |
| ----- | -------------------- | ---------------------- |
| 0     | none                 | none                   |
| 1     | `0 1px 2px` shade-md | `0 1px 3px` shade-sm   |
| 2     | `0 1px 2px` shade-md | `0 3px 6px` shade-sm   |
| 3     | `0 2px 4px` shade-md | `0 6px 12px` shade-md  |
| 4     | `0 2px 4px` shade-md | `0 10px 20px` shade-md |
| 5     | `0 4px 8px` shade-md | `0 16px 32px` shade-lg |
| 6     | `0 4px 8px` shade-md | `0 24px 48px` shade-lg |

Offsets and blur are px. A shadow is decoration, and scaling it with the font
size gains nothing.

Level 0 is a transparent zero shadow (`0 0 #0000`), not `none`. Tailwind places
the value inside a comma-separated `box-shadow` list, where `none` is invalid
and would drop every other shadow on the element.

## Roles

| Role            | Level | Utility                | Pairs with         | Use                                  |
| --------------- | ----- | ---------------------- | ------------------ | ------------------------------------ |
| `control`       | 1     | `shadow-control`       | its own fill       | A button or chip at rest             |
| `control-hover` | 2     | `shadow-control-hover` | its own fill       | The same, hovered                    |
| `raised-1`      | 2     | `shadow-raised-1`      | `surface-raised-1` | A card on a surface                  |
| `raised-2`      | 3     | `shadow-raised-2`      | `surface-raised-2` | A raised element inside a raised one |
| `overlay`       | 4     | `shadow-overlay`       | `surface-overlay`  | Menus, popovers, listboxes, toasts   |
| `modal`         | 5     | `shadow-modal`         | `surface-overlay`  | Dialogs                              |

Level 6 has no role. It is kept for something lifted above a modal, such as a
dragged item.

There is no `control-active` role. A pressed control either drops its shadow
(`active:shadow-none`) or switches to `active:inset-shadow-bevel-pressed`.

Retuning a role is one edit in `base.css`, for example
`--elevation-overlay: var(--elevation-5)`. Every component using
`shadow-overlay` follows.

## Bevels

A bevel is an inset edge, lit on the top and left and shaded on the bottom and
right, as if lit from the top left. It suggests a raised or pressed surface
without lifting the element off the page.

| Token             | Utility                      | Edge                         |
| ----------------- | ---------------------------- | ---------------------------- |
| `--bevel-sm`      | `inset-shadow-bevel-sm`      | 1px                          |
| `--bevel-md`      | `inset-shadow-bevel-md`      | 2px                          |
| `--bevel-lg`      | `inset-shadow-bevel-lg`      | 3px                          |
| `--bevel-pressed` | `inset-shadow-bevel-pressed` | 2px, inverted (shade on top) |

**Why t-shirt sizes and not a 0 to 10 scale.** A bevel has a few useful widths,
not a continuous range. Past 3px it stops reading as an edge and starts covering
the content. The project rule is to use t-shirt sizes wherever a full scale
would be excessive, and four bevels is the whole set.

**Why bevels are inset shadows.** Tailwind writes `inset-shadow-*` to
`--tw-inset-shadow` and `shadow-*` to `--tw-shadow`, and combines both in one
`box-shadow`. A bevel registered there stacks with an elevation role:
`shadow-raised-1 inset-shadow-bevel-md` keeps both, which is verified in the
Storybook **Foundations / Elevation** page.

**Bevels do not mirror in right-to-left pages.** Box shadows are physical. The
light stays at the top left, which is how a real raised edge behaves.

**On a white fill the highlight is invisible.** In light mode
`--surface-raised-1` and above are white, so a bevel on them shows only its
shaded edge. A bevel reads fully on a mid-tone fill such as `--surface-base` or
`--surface-sunken`.

## Where the library uses them

| Component                                | Utility                                                              | When                                   |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `Button`                                 | `shadow-control`, `hover:shadow-control-hover`, `active:shadow-none` | `elevated`; not on `ghost` or disabled |
| `Card`, `GraphicCard`, `InteractiveCard` | `shadow-raised-1` on `bg-surface-raised-1`                           | `elevated`                             |
| `ComboBox`, `SearchBox` popup            | `shadow-overlay` on `bg-surface-overlay`                             | Always                                 |
| `ToastAlert`                             | `shadow-overlay` on `bg-surface-overlay`                             | Always                                 |
| `BrowserAlert`                           | `shadow-modal` on `bg-surface-overlay`                               | Always                                 |

Overlays always have their shadow, because without it they read as part of the
page. Each overlay sets `data-surface="overlay"`.

## Inside an overlay

An overlay is the top surface, so a card inside one has no higher level to lift
to. An elevated card drops its shadow inside any ancestor with
`data-surface="overlay"`, and keeps its border and `--surface-raised-1` fill. In
dark mode that fill is darker than the overlay's, so the card reads as a panel
set into the overlay rather than one floating above it.

Mark your own floating containers the same way, so library cards inside them
behave:

```html
<div class="bg-surface-overlay shadow-overlay" data-surface="overlay">…</div>
```

## Light and dark

The geometry is written once. Only the colours differ by theme, and they are
colour tokens so each can be a single `light-dark()` pair:

| Token                  | Light                    | Dark                      |
| ---------------------- | ------------------------ | ------------------------- |
| `--elevation-shade-sm` | `rgb(7 5 7 / 0.08)`      | `rgb(0 0 0 / 0.32)`       |
| `--elevation-shade-md` | `rgb(7 5 7 / 0.12)`      | `rgb(0 0 0 / 0.44)`       |
| `--elevation-shade-lg` | `rgb(7 5 7 / 0.18)`      | `rgb(0 0 0 / 0.56)`       |
| `--bevel-highlight`    | `rgb(255 255 255 / 0.7)` | `rgb(255 255 255 / 0.12)` |
| `--bevel-shade`        | `rgb(7 5 7 / 0.16)`      | `rgb(0 0 0 / 0.5)`        |

Light mode tints the shadow with `--neutral-9`, a near-black, rather than pure
black. Dark mode uses black at three to four times the alpha, because a shadow
on a near-black surface is otherwise invisible.

Even so, shadows are faint in dark mode. Height in dark mode is carried mainly
by the surface steps, which get lighter as they rise (see Surfaces in
[TOKENS.md][tokens-doc]). That is why a role always pairs with its surface.

## Rules

1. **Use a role, not a level.** `shadow-overlay`, never `--elevation-4`.
2. **Pair the role with its surface.** A shadow without the matching surface
   shows height in light mode and almost nothing in dark mode.
3. **Keep the border.** Forced-colors mode sets `box-shadow` to `none`. Every
   element with a shadow must have a border that identifies it on its own, and
   that border is what WCAG 1.4.11 measures. Verified in Chromium with forced
   colors active: every shadow computes to `none` and every border stays.
4. **A shadow is never a contrast fix.** `check:contrast` does not measure
   shadows, and nothing may rely on one to be seen.
5. **No hairline shadows.** Edges are drawn with `border`, not with a
   `0 0 0 1px` shadow, for the forced-colors reason above.
6. **Focus stays an outline.** Never use a shadow or ring as the focus
   indicator.
7. **Animate with care.** If a shadow changes on hover, transition it with
   `motion-reduce:transition-none`, as the colour transitions already do.

## Tailwind behaviour

- The theme variables are `var()` references, so Tailwind cannot see the colours
  inside them. `shadow-accent` and `shadow-overlay/50` have no effect on the
  role utilities. Change `--elevation-shade-*` instead.
- tailwind-merge reads an unknown `shadow-<name>` as a shadow colour. The roles
  and bevels are registered in `packages/ui/src/lib/tv.ts` (`SHADOW_ROLES`,
  `BEVELS`), so `cn("shadow-overlay", "shadow-md")` keeps only `shadow-md`, and
  `cn("shadow-overlay", "shadow-accent")` keeps both.
- `dist/styles.css` always contains the role and bevel utilities, plus
  `hover:shadow-*` and `active:inset-shadow-bevel-*`, through `@source inline`
  in `packages/ui/src/styles/index.css`. An app that only imports the stylesheet
  can use them before any component does.

---

author: John Baltes

updated: 2026-11-06

---

[tokens-doc]: ./TOKENS.md
