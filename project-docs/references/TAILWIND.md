# Tailwind decisions

Where this repo follows Tailwind CSS 4 as it ships, where it deliberately does
something else, and why. Check here before adding a Tailwind customisation, so
the exceptions stay few and recorded.

## Contents

- [Setup](#setup)
- [Where we follow Tailwind](#where-we-follow-tailwind)
- [Where we diverge](#where-we-diverge)
- [Known collisions](#known-collisions)
- [Rules for new customisations](#rules-for-new-customisations)

## Setup

- Tailwind `4.3.3`, pinned exactly like every external dependency.
- CSS-first configuration. There is no `tailwind.config.js`. Customisation lives
  in `@theme` blocks in [`packages/ui/src/styles/theme.css`][theme-css].
- `@retrojb/ui` compiles its own `dist/styles.css` with the Tailwind CLI from
  [`src/styles/index.css`][ui-index-css]. Apps that write Tailwind classes in
  their own markup run their own build and import `@retrojb/ui/theme.css` for
  the same utilities. `apps/docs` does this in
  [`app/globals.css`][docs-globals].

## Where we follow Tailwind

| Area                  | What we use                                                                                | Notes                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Breakpoints           | Default names and values: `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl` 96rem      | Decided in the foundations plan (L1). Not renamed to Ant's `xs`/`xxl`.                                                                                           |
| Container queries     | `@container`, `@sm:`, `@md:` and the default `--container-*` sizes                         | `Card`, `GraphicCard` and `DynamicContainer` use them.                                                                                                           |
| Layout utilities      | `flex`, `grid`, `gap-*`, `min-w-0`, `inset-*` and so on                                    | Used as shipped.                                                                                                                                                 |
| Numeric spacing scale | `--spacing: 0.25rem`, so `size-5` is 1.25rem                                               | Used for fixed sizes of graphical parts only: icons, checkbox and radio boxes, toggle tracks, progress tracks. Never for padding or gaps, which use `--space-*`. |
| Variants              | `hover:`, `focus-visible:`, `motion-reduce:`, `forced-colors:`, `rtl:`, `aria-*`, `data-*` | Used as shipped.                                                                                                                                                 |
| Arbitrary values      | `p-(--token)` shorthand for `p-[var(--token)]`                                             | The standard way components read a token Tailwind has no utility for.                                                                                            |

## Where we diverge

| Area                 | What we do instead                                                                                                                                                                  | Why                                                                                                                                                                                                                                    | Where                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Preflight            | Not included. `tailwindcss/theme.css` and `tailwindcss/utilities.css` are imported separately.                                                                                      | The library must not reset a consuming app's base styles, and `apps/docs` has its own reset.                                                                                                                                           | `src/styles/index.css`, `app/globals.css` |
| Cascade layers       | Tokens and theme in `@layer theme`; utilities unlayered.                                                                                                                            | Unlayered CSS beats layered CSS, so an app's plain `:root { --accent: … }` retints components, and component utilities beat an app's element selectors.                                                                                | `src/styles/index.css`                    |
| Dark mode            | No `dark:` variant anywhere. Tokens switch with `light-dark()` and `color-scheme`; `data-theme` on `<html>` forces a theme.                                                         | One set of classes per component, and a theme change needs no recompile. Tailwind's `dark:` would double every colour class.                                                                                                           | `@retrojb/tokens`                         |
| Colours              | Own ramps and semantic colours registered as `--color-*`, each `var(--token, fallback)`. Tailwind's palette is still emitted but not used by components.                            | Utilities resolve at paint time, so overriding a token needs no rebuild. The fallback keeps `dist/styles.css` working without the token layer.                                                                                         | `theme.css`                               |
| Typography           | `text-<role>` utilities (`text-body-sm`, `text-heading-md`) that set size, line height, weight and tracking together. `font-sans`, `font-mono` and four weights remapped to tokens. | One class per role instead of four, and retuning a role is one token edit.                                                                                                                                                             | `theme.css`, `lib/tv.ts`                  |
| tailwind-merge       | The type roles are registered as a `text` class group.                                                                                                                              | Without it, tailwind-merge reads `text-body-sm` as a colour and drops it next to `text-foreground`.                                                                                                                                    | `lib/tv.ts`                               |
| Spacing              | Components write `p-(--space-4)`, not `p-4`. Heights use `h-(--control-height-md)`. Text-aligning indents are a `calc()`, such as `ps-[calc(--spacing(6)+var(--space-2))]`.         | Tailwind's `--spacing-*` namespace means multiples of 0.25rem, and a named token cannot join it without colliding. `--space-*` also changes with `data-density`, which Tailwind's numeric scale cannot. See [SPACING.md][spacing-doc]. | Component `styles.ts`                     |
| Radius               | `rounded-control` for every interactive surface.                                                                                                                                    | One radius decision for all controls.                                                                                                                                                                                                  | `theme.css`                               |
| Shadows (planned)    | Primitives named `--elevation-*` and `--bevel-*`; `theme.css` maps roles to `--shadow-*` and bevels to `--inset-shadow-*`.                                                          | A theme variable that reads a token of the same name references itself. Using `--inset-shadow-*` for bevels lets Tailwind compose a bevel and an elevation on one element.                                                             | Phase 4                                   |
| Always-emitted roles | `@source inline(...)` lists every type role.                                                                                                                                        | Apps that only import `dist/styles.css` can use a role no component uses yet.                                                                                                                                                          | `src/styles/index.css`                    |
| Anchor positioning   | Plain CSS rules outside Tailwind for the ComboBox popup.                                                                                                                            | `@position-try` and `@supports` are at-rules, which a utility cannot hold.                                                                                                                                                             | `src/styles/index.css`                    |

## Known collisions

**Radius tokens share Tailwind's names.** `--radius-xs` (4px) and `--radius-sm`
(8px) in `@retrojb/tokens` have the same names as Tailwind's own `--radius-xs`
(0.125rem) and `--radius-sm` (0.25rem). Both are declared in `@layer theme`, so
whichever stylesheet loads last wins:

- In `@retrojb/ui/dist/styles.css` the tokens load after Tailwind's theme, so
  `rounded-sm` is 8px. Correct.
- In `apps/docs`, `globals.css` loads after `@retrojb/ui/styles.css`, so
  Tailwind's values win. Measured on the built site: `--radius-xs` is 0.125rem
  and `--radius-sm` is 0.25rem. The `Link` focus outline (`rounded-sm`) and the
  `Code` component (`rounded-(--radius-xs)`) render with Tailwind's radii there.

This predates the tokens package. The fix is a rename out of the `--radius-*`
namespace, tracked with the other naming work in the foundations plan.

## Rules for new customisations

1. Prefer what Tailwind ships. Add a customisation only when the default cannot
   express a design-system decision.
2. Never name a token inside a Tailwind namespace. See rule 5 in
   [TOKENS.md][tokens-doc].
3. Register every new utility in `theme.css` as `var(--token, fallback)`, with
   the light value as the fallback.
4. If a new utility name could be mistaken for an existing class group (a new
   `text-*`, `shadow-*` or `rounded-*` name), register it with tailwind-merge in
   `lib/tv.ts`.
5. Record the decision in this file.

---

author: John Baltes

updated: 2026-11-06

---

[theme-css]: ../../packages/ui/src/styles/theme.css
[ui-index-css]: ../../packages/ui/src/styles/index.css
[docs-globals]: ../../apps/docs/app/globals.css
[tokens-doc]: ./TOKENS.md
[spacing-doc]: ./SPACING.md
