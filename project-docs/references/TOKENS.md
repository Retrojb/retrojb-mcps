# Design tokens

How the design tokens in `@retrojb/tokens` are organised and named, and how to
add or change one. Read this before adding a token or a token-based utility.

## Contents

- [Where tokens live](#where-tokens-live)
- [The three layers](#the-three-layers)
- [Naming rules](#naming-rules)
- [Token families](#token-families)
- [Surfaces](#surfaces)
- [Density](#density)
- [Themes](#themes)
- [Adding or changing a token](#adding-or-changing-a-token)

## Where tokens live

Tokens are CSS custom properties in [`packages/tokens`][tokens-pkg]. The sources
are three files, and `npm run build` generates the stylesheets apps import.

| Source            | Holds                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| `src/base.css`    | Tokens that do not change by theme: space, control heights, radii, borders, type  |
| `src/density.css` | Compact and spacious values for `--space-*`. Comfort is generated from `base.css` |
| `src/light.css`   | Every colour token, with its light value                                          |
| `src/dark.css`    | Only the colour values that differ in dark mode                                   |

| Import                      | Contents                                |
| --------------------------- | --------------------------------------- |
| `@retrojb/tokens`           | Both themes, switched by `color-scheme` |
| `@retrojb/tokens/light.css` | Light theme only                        |
| `@retrojb/tokens/dark.css`  | Dark theme only                         |

`@retrojb/ui/styles.css` bundles `@retrojb/tokens`, so an app using the
components does not import the tokens separately.

## The three layers

A component never reads a raw value. Each value passes through up to three
layers:

| Layer     | Example                       | Defined in                         | Used by                |
| --------- | ----------------------------- | ---------------------------------- | ---------------------- |
| Primitive | `--primary-8`                 | `@retrojb/tokens`                  | Semantic tokens only   |
| Semantic  | `--accent`                    | `@retrojb/tokens`                  | Theme mapping, app CSS |
| Utility   | `--color-accent`, `bg-accent` | `packages/ui/src/styles/theme.css` | Component `styles.ts`  |

Override a primitive to change everything built on it. Override a semantic token
to change one role. Both work from an unlayered `:root` rule in an app, because
every token is declared inside `@layer theme`.

## Naming rules

1. **Scales use an integer index from 0.** Spacing, shadow levels and similar
   ordered sets use `0` to `10`, with `0` meaning none. Use only as many steps
   as the family needs: shadows use `0` to `6`.
2. **The colour ramps are the exception and stay at 0 to 9.** Each step is a
   role with a contrast contract (see the table in `src/light.css`), not a
   lightness. Adding a step would mean re-solving every ramp in both themes.
3. **Small sets use t-shirt sizes.** When a 0-10 scale would be excessive, use
   `none`, `xs`, `sm`, `md`, `lg`, `xl`. Border weights, radii, scrims, bevels
   and control heights follow this.
4. **Roles are named by use, not by value.** `--accent`, `--surface-raised`,
   `--elevation-overlay`. A role points at a primitive, and components use
   roles.
5. **No token shares a name with a Tailwind theme namespace.** Tailwind reads
   `--color-*`, `--spacing-*`, `--text-*`, `--font-*`, `--radius-*`,
   `--shadow-*`, `--inset-shadow-*`, `--breakpoint-*`, `--container-*` and
   others as its own. A token in one of those namespaces either collides with a
   Tailwind default or references itself when `theme.css` maps it. See
   [TAILWIND.md][tailwind-doc] for the collisions that exist today.
6. **Units are rem**, so values follow the user's font size (WCAG 1.4.4). Border
   widths, outline widths and shadow offsets stay px, because a fraction of a
   rem renders as a fractional pixel and browsers round it inconsistently.
7. **Only colours may differ by theme.** The build writes each themed token as
   `light-dark(light, dark)`, and `light-dark()` accepts colours only. The build
   fails on anything else.

## Token families

"Planned" families are agreed in the [foundations implementation
plan][foundations-plan] and not built yet.

| Family          | Names                                                             | Scale                                 | Status                                                       |
| --------------- | ----------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Colour ramps    | `--primary-*`, `--secondary-*`, `--neutral-*`                     | 0 to 9                                | Shipped                                                      |
| Semantic colour | `--background`, `--foreground`, `--accent`, `--border`…           | Roles                                 | Shipped                                                      |
| Status colour   | `--danger`, `--success`, `--information`                          | Roles                                 | Shipped                                                      |
| Surfaces (old)  | `--surface`, `--surface-raised`                                   | Roles                                 | Deprecated aliases of `--surface-base`, `--surface-raised-1` |
| Surfaces        | `--surface-sunken`, `-base`, `-raised-1`, `-raised-2`, `-overlay` | Roles, six levels with `--background` | Shipped                                                      |
| Scrim           | `--scrim-sm`, `--scrim-md`                                        | T-shirt                               | Shipped                                                      |
| Spacing (old)   | `--spacing-0`, `--spacing-10` to `--spacing-1000`                 | Irregular                             | Deprecated aliases, see [SPACING.md][spacing-doc]            |
| Space           | `--space-0` to `--space-10`, three densities                      | 0 to 10                               | Shipped                                                      |
| Control height  | `--control-height-xs`, `-sm`, `-md`, `-lg`                        | T-shirt                               | Shipped                                                      |
| Border weight   | `--border-weight-none`, `-sm`, `-md`, `-lg`                       | T-shirt                               | Shipped                                                      |
| Radius          | `--radius-none`, `-xs`, `-sm`, `-md`, `-lg`, `-circle`            | T-shirt                               | Shipped, collides with Tailwind                              |
| Font family     | `--font-family-sans`, `--font-family-mono`                        | Roles                                 | Shipped                                                      |
| Font size       | `--font-size-100` to `--font-size-900`                            | Hundreds                              | Shipped                                                      |
| Font weight     | `--font-weight-400` to `--font-weight-700`                        | CSS value                             | Shipped                                                      |
| Line height     | `--line-height-tight`, `-snug`, `-normal`, `-relaxed`             | Named                                 | Shipped                                                      |
| Letter spacing  | `--letter-spacing-tight`, `-normal`, `-wide`                      | Named                                 | Shipped                                                      |
| Type roles      | `--type-<role>-size`, `-line-height`, `-weight`, `-tracking`      | Roles                                 | Shipped                                                      |
| Shadow colour   | `--shadow-color`, `--shadow-alpha-0` to `-6`                      | 0 to 6                                | Planned                                                      |
| Elevation       | `--elevation-0` to `--elevation-6`, plus roles                    | 0 to 6                                | Planned                                                      |
| Bevel           | `--bevel-sm`, `-md`, `-lg`, `-pressed`                            | T-shirt                               | Planned                                                      |

Font sizes use hundreds (`100` to `900`), which predates rule 1. They are left
as they are until type is revisited.

## Surfaces

Six levels, lowest first: `--background` (the page), `--surface-sunken`,
`--surface-base`, `--surface-raised-1`, `--surface-raised-2` and
`--surface-overlay`. Use the level for the role, not for a colour you want.

| Token                | Use                                                     |
| -------------------- | ------------------------------------------------------- |
| `--background`       | The page                                                |
| `--surface-sunken`   | A well set into a surface: a code block, an inset panel |
| `--surface-base`     | Default content surface: cards, alerts, panels          |
| `--surface-raised-1` | One step up: fields, a card on a surface                |
| `--surface-raised-2` | A raised element inside a raised one                    |
| `--surface-overlay`  | Floating UI: menus, popovers, toasts, dialogs           |

In light mode raised-1, raised-2 and overlay are all white, because nothing is
lighter. They are told apart by border and shadow. In dark mode each level is a
step lighter. Sunken is a step darker than base in both themes.

`--scrim-sm` and `--scrim-md` tint the page behind an overlay. Use
`backdrop:bg-scrim-md` on a modal `<dialog>`. A scrim never separates an overlay
from the page; the overlay's border does, so scrims carry no contrast contract.

## Density

`--space-*` has three densities, set with `data-density` on any element. Spacing
is the only family density changes. The scale, the rules and the edge cases are
in [SPACING.md][spacing-doc].

## Themes

`@retrojb/tokens` follows the OS setting. `data-theme` on `<html>` forces one:

```html
<html>
  <!-- follows the OS -->
  <html data-theme="light">
    <!-- light, even on a dark OS -->
    <html data-theme="dark">
      <!-- dark, even on a light OS -->
    </html>
  </html>
</html>
```

Every themed colour is one declaration, for example
`--primary-0: light-dark(#fefdff, #200230)`. `color-scheme` on `:root` decides
which branch applies: `light dark` by default, or one value when `data-theme` is
set. There is no dark block to keep in step with a media query.

Semantic tokens are declared once in `src/light.css`
(`--accent: var(--primary-8)`) and are never restated for dark. They resolve
through the ramp, so they follow the theme automatically.

`light-dark()` is Baseline since May 2024. The Next.js build of `apps/docs`
transpiles it for older browsers with Lightning CSS, which rewrites each pair
into `var(--lightningcss-light, …) var(--lightningcss-dark, …)`. Both forms were
checked to resolve to the same values in all six combinations of OS setting and
`data-theme`.

## Adding or changing a token

1. Decide the layer. A new value on a scale is a primitive. A new use of an
   existing value is a semantic token pointing at it.
2. Name it by the rules above, and check the name is not in a Tailwind
   namespace.
3. Add it to `src/base.css` if it is the same in both themes. Otherwise add it
   to `src/light.css` with its light value, and to `src/dark.css` only if the
   dark value differs.
4. Run `npm run build --workspace=@retrojb/tokens`. The build fails if a dark
   value has no light counterpart, or is not a literal colour.
5. If components need a utility for it, map it in
   `packages/ui/src/styles/theme.css` as
   `--<namespace>-<name>: var(--token, fallback)`. The fallback is the light
   value, so `dist/styles.css` still renders without the token layer.
6. For any colour change, run
   `npm run check:contrast --workspace=@retrojb/docs`. It reads `src/light.css`
   and `src/dark.css` and fails on any pairing below WCAG AA.
7. Add a changeset for `@retrojb/tokens`, and for `@retrojb/ui` if `theme.css`
   changed.

---

author: John Baltes

updated: 2026-11-06

---

[tokens-pkg]: ../../packages/tokens
[tailwind-doc]: ./TAILWIND.md
[spacing-doc]: ./SPACING.md
[foundations-plan]:
  ../research/foundations/foundations-06-implementation-plan.md
