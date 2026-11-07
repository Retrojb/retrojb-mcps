# Foundations implementation plan

Response to the feedback at the end of `foundations-05-patterns-and-recommendations.md`. It reviews each decision, argues against the ones that have a real cost, and turns the rest into phased work. Nothing in the repo has changed yet.

## Contents

- [Questions that block Phase 1](#questions-that-block-phase-1)
- [Resolved decisions](#resolved-decisions)
- [Phase 1 status](#phase-1-status)
- [Phase 2 status](#phase-2-status)
- [Phase 3 status](#phase-3-status)
- [Decisions reviewed](#decisions-reviewed)
- [Explainers](#explainers)
- [Implementation phases](#implementation-phases)
- [Out of scope](#out-of-scope)

## Questions that block Phase 1

1. **What does "[0-10] similar to Polaris" mean?** Polaris does not use 0 to 10. Its spacing is px ÷ 25 (`space-400` = 16px) and its shadows are `0, 100` to `600`. I read your rule as "an integer index from 0 to 10". That is 11 steps. The colour ramps today are 0 to 9 (10 steps), so either colour stays at 0 to 9 or every ramp gains a step. See decision G1.
2. **Shadow naming conflicts with the 0-10 rule.** "Polaris seven step naming" gives `shadow-0, shadow-100 … shadow-600`. The 0-10 rule gives `shadow-0 … shadow-6`. Pick one. I recommend `0` to `6` (decision S4).
3. **Which Carbon breakpoint?** Carbon's largest is 1584px (`max`). Tailwind's largest is 1536px (`2xl`). They are 48px apart, so adding 1584 changes almost nothing. If you want a wider tier, 1920px (Ant, Fluent) is the common choice. Did you mean 1584, 1920, or Carbon's 320px floor?
4. **Is `sunken` the page background?** The page (`--background`, `#d1d1d1`) is already darker than `--surface` (`#f6f7f9`). A sunken well that sits between them is a sixth level. Making `sunken` equal `--background` keeps it at five.
5. **Version bump.** The spacing rename is breaking. `@retrojb/ui` is at `0.1.0`, and a changesets `major` takes it to `1.0.0`. The alternative is a `minor` with a deprecation note, which is the usual 0.x convention. Which do you want?

## Resolved decisions

Answers from the review notes at the end of this file, applied to the phases below.

| Topic | Decision |
|---|---|
| Scales (Q1, G1) | Integer index from 0. Colour ramps stay at 0 to 9. |
| Shadow names (Q2, S4) | `0` to `6`, following the 0-10 rule. |
| Breakpoints (Q3, L1) | Tailwind defaults, no Carbon breakpoint. |
| Sunken surface (Q4) | A sixth surface level, separate from `--background`. |
| Version bump (Q5, H2) | Changesets written per phase on this branch, `minor` while 0.x. |
| Spacing names | `--space-*`. Spacious uses the soft column of Table P2. Scale docs must spell out edge cases and limits. |
| Control heights (P3) | Tokenised, unchanged by density for now. |
| Hard shadows (S6) | Dropped. No `shadow-hard` set and no `data-shadow` switch. |
| Bevels (S5) | T-shirt sizes, with written docs for the decision. |
| Prop (S7) | `elevated`, on Card, Button and Avatar. |
| Grid (L3) | A root layout template rather than a provider. |
| Tokens package (H3) | `light-dark()` in the root stylesheet, with `light.css` and `dark.css` as single-theme builds. See Phase 1. |
| Docs | Add `project-docs/references/TAILWIND.md` and a general token reference, `project-docs/references/TOKENS.md`. |

**On the `light-dark()` question in H3.** Yes, that gives consumers both. The sources are `src/light.css` and `src/dark.css`, which is what people review and what `check:contrast` measures. The build pairs them into one `light-dark()` declaration per token in `dist/index.css`, so the duplicated dark block is gone, and also writes `dist/light.css` and `dist/dark.css` for apps that ship one theme. The objections in the paragraph at the end of this file do not apply: the files still exist, the contrast engine reads the plain-colour sources, and the only tokens that differ by theme today are colours. Shadow alphas, when they land, are written as colours inside `light-dark()` rather than as bare percentages.

## Phase 1 status

Done on branch `feat/tokens-package`. No token value changed.

- `packages/tokens` holds `src/base.css`, `src/light.css`, `src/dark.css` and `build.mjs`, which writes `dist/index.css`, `dist/light.css` and `dist/dark.css`.
- `@retrojb/ui` imports `@retrojb/tokens` and `packages/ui/src/styles/tokens.css` is deleted. It was never in the package `exports`, so nothing outside the repo could import it.
- `check-contrast.mjs` reads the two source files. Output is identical to before: 236 pairings, all AA.
- All 166 tokens resolve to the same computed values as before in all six combinations of OS setting and `data-theme`, checked in headless Chromium against the old `dist/styles.css`, the new one, a minified build, and the Next.js build of `apps/docs` (which transpiles `light-dark()` with Lightning CSS). The only difference is computed `color-scheme`, now `light dark` where it was one value when no `data-theme` is set.
- Found while checking: `--radius-xs` and `--radius-sm` collide with Tailwind's own theme variables, and in `apps/docs` Tailwind's values win. This predates Phase 1 and is recorded in `TAILWIND.md`.

## Phase 2 status

Done on branch `feat/tokens-package`. Rules and edge cases are in `project-docs/references/SPACING.md`.

- `--space-0` to `--space-10` in rem in `base.css`. Compact and spacious in `src/density.css`; the build generates the `[data-density="comfort"]` block from `base.css` and fails if a density block declares different steps.
- `--control-height-xs` (24px), `-sm`, `-md`, `-lg`, unchanged by density.
- `--spacing-*` kept as deprecated aliases. Nothing in `@retrojb/ui` reads them.
- Every component length is classified as spacing (`--space-*`), size (`--control-height-*`, or Tailwind's numeric scale for graphical parts), or geometry (`calc()` of its parts). Text-aligning indents in Checkbox, CheckboxGroup, Radio and Toggle are now `calc(box + gap)`, so they stay aligned in every density. This replaces the 44, 52 and 96px size tokens the plan proposed; GraphicCard's 96px media height is `min-h-24`.
- Document 05 item B.5 decided: Button, Input, ComboBox, Table, SegmentedControl, Chip and TabGroup now use `--space-*` and `--control-height-*` instead of Tailwind numerics.
- Storybook has a Density toolbar and a **Foundations / Spacing** page.

Visual changes at the default density, from a pixel diff of all 211 stories before and after (everything else is identical). Each comes from moving an off-scale value onto the 4px comfort scale:

| Component | Change |
|---|---|
| Input, ComboBox, SearchBox | Label-to-field gap 6px to 8px. `sm` leading padding 10px to 8px. |
| Table | `sm` cell inline padding 10px to 8px. `md` cell block padding 10px to 12px, so `md` rows are 46px (were 42px). Sort-button icon gap 6px to 8px. |

Also fixed: the InlineAlert, ToastAlert and BrowserAlert stories used Tailwind classes (`gap-3`, `gap-4`, `p-6`, `min-h-96`, `sm:grid-cols-2`) that never existed in `dist/styles.css`, so their layout was partly unstyled. They now use inline styles with `--space-*`.

Verified in headless Chromium against the built Storybook:

- Every story renders in compact, comfort and spacious (183 stories change in compact, 141 in spacious).
- No interactive element that was at least 24 × 24px in comfort drops below it in compact. A few story elements are under 24px in every density (a native checkbox in the composed Table story, plain story buttons); they predate this phase.
- No element clips (`overflow: hidden` with overflowing content) and no page scrolls sideways at 200% root font size in compact or comfort.

## Phase 3 status

Done on branch `feat/tokens-package`. Reference: the Surfaces section of `project-docs/references/TOKENS.md`.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#d1d1d1` | `#201f20` |
| `--surface-sunken` | `#e7e8eb` | `#0e1012` |
| `--surface-base` | `#f6f7f9` | `#14171a` |
| `--surface-raised-1` | `#ffffff` | `#1a1e22` |
| `--surface-raised-2` | `#ffffff` | `#20252a` |
| `--surface-overlay` | `#ffffff` | `#272c32` |
| `--scrim-sm` | `rgb(7 5 7 / 0.32)` | `rgb(0 0 0 / 0.48)` |
| `--scrim-md` | `rgb(7 5 7 / 0.6)` | `rgb(0 0 0 / 0.72)` |

- `--surface-base` and `--surface-raised-1` keep the old `--surface` and `--surface-raised` values, which stay as deprecated aliases. Every component, story, spec and the docs site now use the new names.
- `check:contrast` measures every text and boundary token on all six levels: 290 pairings, all AA.
- `BrowserAlert` uses `backdrop:bg-scrim-md`. Its old backdrop, `--neutral-9` at 60%, was near-white in dark mode. Measured in Chromium, the dark page goes from `rgb(32, 31, 32)` to `rgb(9, 9, 9)` behind the dialog, where before it was lightened.
- The rename changes nothing visually: a pixel diff of all 211 stories against Phase 2 is identical, apart from a Spacing story whose buttons were fixed to render their labels.

Not done here, by design: overlay components (ComboBox listbox, ToastAlert, BrowserAlert) still use `--surface-base` and `--surface-raised-1`. Moving them to `--surface-overlay` changes their dark-mode fill and the tone ratios measured against it, and it belongs with the shadow roles and the `data-surface` rule for a Card inside an overlay in Phase 5.

## Decisions reviewed

Each row: your decision, my verdict, and the argument. "Agree" means build as stated.

### General

| # | Decision | Verdict | Argument |
|---|---|---|---|
| G1 | 0 to 10 scale for every scaled token | Agree for spacing and shadow. Push back on colour. | The colour ramps are indexed by role, and each step 5 to 9 carries a contrast contract solved against step 3 (`tokens.css` header). Adding step 10 means re-solving every ramp in both themes, updating `check-contrast.mjs`, and breaking `bg-primary-7` for consumers. Nothing is gained. Keep colour at 0 to 9 and treat "ten steps" as already satisfied. |
| G2 | T-shirt sizes where 10 steps is excessive | Agree | Border weights (`sm`, `md`, `lg`) and radii (`xs` to `lg`) already follow this. Bevels, scrims and control heights should too. |
| G3 | Tailwind breakpoints plus a Carbon one | Agree, pending question 3 | See the breakpoint explainer. |
| G4 | Better `min-width` patterns | Agree | See the `min-width` explainer. |
| G5 | `rem` values | Agree with exceptions | Spacing, sizes, breakpoints and container widths in rem. Border widths, outline widths and shadow offsets stay px. A `0.0625rem` border at a 20px root is 1.25px, which browsers round inconsistently, and a decorative shadow gains nothing from scaling. |
| G6 | No hairline | Agree | Components already draw real borders, and a shadow hairline disappears in forced-colors mode. |
| G7 | Alpha approach for dark shadows | Agree, with one simplification | Define `--shadow-alpha-0` to `--shadow-alpha-6` in `light.css` and `dark.css`, and write each shadow once: `color-mix(in srgb, var(--shadow-color) var(--shadow-alpha-3), transparent)`. Passing a percentage through `var()` is plain substitution, so the untested `calc()` inside `color-mix` from document 05 is no longer needed. |


### Spacing

| # | Decision | Verdict | Argument |
|---|---|---|---|
| P1 | Three density modes, toggled like a theme | Agree | Implement as `data-density="compact" \| "spacious"` on any element, with comfort as the default. Unlike `data-theme`, density can be scoped to a subtree, so a dense table can sit in a comfortable page. One catch: a custom property that uses `var()` resolves on the element that declares it. Any alias declared at `:root` (for example `--gap-md: var(--space-3)`) will not follow a subtree override. Either redeclare the aliases inside the density selector or have components read `--space-*` directly. |
| P2 | Compact by 2, comfort by 4, spacious by 8 | Push back on spacious | A strict 8px grain doubles the small steps. Spacious step 1 must be 8px against comfort's 4px, and step 4 becomes 32px against 16px, which doubles the padding on every card, alert and form. Table P2 compares the strict rule with a softer one where the grain applies from step 3 up. |
| P3 | Compact keeps touch targets | Agree, and go further | Control height is a size, not spacing. Move button and input heights to `--control-height-sm/md/lg` and leave them unchanged by density in the first release. Density then only changes padding and gaps, so it cannot break WCAG 2.5.8 (24 × 24 CSS px minimum). Today Button is 32, 40 and 48px and Chip `sm` is 24px, which is exactly the minimum. |


**Table P2.** Values in px at a 16px root. They ship as rem.

| Step | Compact (÷2) | Comfort (÷4) | Spacious strict (÷8) | Spacious soft |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 1 | 2 | 4 | 8 | 4 |
| 2 | 6 | 8 | 16 | 8 |
| 3 | 8 | 12 | 24 | 16 |
| 4 | 12 | 16 | 32 | 24 |
| 5 | 16 | 20 | 40 | 32 |
| 6 | 18 | 24 | 48 | 40 |
| 7 | 24 | 32 | 56 | 48 |
| 8 | 32 | 40 | 64 | 56 |
| 9 | 36 | 48 | 80 | 64 |
| 10 | 48 | 64 | 96 | 80 |

The comfort scale drops three values the components use today. They are sizes, not spacing, and move to size tokens:

- 44px and 52px (`--spacing-200`, `--spacing-400`) are the Toggle description indent, which is the control width plus a gap (`Toggle/styles.ts` lines 196 and 197). Derive it with `calc()` from the control size.
- 96px (`--spacing-1000`) is the GraphicCard media `min-height`.

**Name the scale `--space-*`, not `--spacing-*`.** Tailwind 4 reads `--spacing-*` as its own namespace, where `p-4` means 16px. A token called `--spacing-7` meaning 32px sits next to a utility `p-7` meaning 28px. `inlineAlert/styles.ts` already documents this collision.

### Box shadow and surface

| # | Decision | Verdict | Argument |
|---|---|---|---|
| S1 | Five surfaces: sunken, base, raised-1, raised-2, overlay | Agree, pending question 4 | Light mode has no headroom. `--surface-raised` is already `#ffffff`, and nothing is lighter. raised-1, raised-2 and overlay will all be white in light mode and differ only by shadow, which is what Atlassian does. Dark mode can step lighter per level. Every new surface must be added to `check-contrast.mjs`, because text lands on all of them. |
| S2 | Plan for a Card inside a modal | Agree | Overlay is the top surface, so a raised card inside it has nowhere to go. In dark mode it would have to be lighter than the overlay, and in light mode both are white. Proposed rule: overlay components set `data-surface="overlay"`, and Card uses Tailwind 4's `in-*` variant (`in-data-[surface=overlay]:shadow-none`) to drop its shadow and keep its border. This is also how a card inside a raised panel should behave. |
| S3 | Scrim tokens | Agree | `--scrim-sm` and `--scrim-md` (t-shirt, per G2), defined per theme. `BrowserAlert` uses native `<dialog>`, so the scrim goes on `::backdrop`. `::backdrop` only inherits custom properties in recent browsers, so verify in Storybook in every supported browser. |
| S4 | Polaris seven-step naming | Agree on seven steps. Push back on the names. | Seven steps fits the roles (none, control, control-hover, raised-1, raised-2, overlay, modal). `100` to `600` breaks your own 0-10 rule, and the gaps it leaves for insertion matter less once components use roles instead of steps. Recommend `0` to `6`. |
| S5 | A beveled scale | Agree as t-shirt, not seven steps | A bevel is a light inset edge on one side and a dark one on the other. It has roughly three useful strengths plus a pressed (inverted) form. Per G2 that is `sm`, `md`, `lg`, `pressed`. Register bevels under Tailwind's `--inset-shadow-*` namespace. Tailwind composes `inset-shadow-*` and `shadow-*` on one element, so a bevel and an elevation stack without one overwriting the other. |
| S6 | `shadow-soft` and `shadow-hard` sets | Agree | Switch with `data-shadow="hard"`, which repoints the roles at the hard primitives. Hard shadows raise three problems. Alpha does not apply, because a hard offset is opaque. A dark offset on a dark page is invisible, so dark mode needs a lighter offset colour, which is a design call. An offset shadow extends past the box and gets clipped by `overflow-hidden` ancestors (Card's `layout` slot and media slot both have it). |
| S7 | `withShadow` prop | Agree, scoped | Offer it only where a shadow is optional (Card, Button). Overlays (ComboBox listbox, Toast, BrowserAlert) always get theirs, because without a shadow they read as part of the page. Consider naming it `elevated`. It describes intent rather than mechanism, and still reads correctly when the style is a hard offset or a bevel. Ghost buttons and disabled states ignore it. |


- 
**Primitive and role names.** Tailwind maps `--shadow-*` theme variables to `shadow-*` utilities, and a theme variable that reads a token of the same name references itself. So the tokens package uses a different prefix and `theme.css` maps it, as it already does for type (`--type-*` tokens become `--text-*` utilities):

```css
/* tokens */
--elevation-soft-0 … --elevation-soft-6
--elevation-hard-0 … --elevation-hard-6
--bevel-sm, --bevel-md, --bevel-lg, --bevel-pressed
--elevation-raised-1: var(--elevation-soft-2);   /* role */

/* theme.css */
--shadow-raised-1: var(--elevation-raised-1, <fallback>);
--inset-shadow-bevel-md: var(--bevel-md, <fallback>);
```

### Layout grid

| # | Decision | Verdict | Argument |
|---|---|---|---|
| L1 | Ant naming conventions | Agree for component props, push back on breakpoint names | Ant's breakpoint names already match Tailwind for `sm`, `md`, `lg` and `xl`. The only differences are `xs` and `xxl` (Tailwind's `2xl`). Renaming takes two lines in `theme.css`. The real cost is elsewhere: Tailwind's container sizes are `@3xs` to `@7xl`, which cannot be renamed to match, so you would write `xxl:` for the viewport and `@2xl:` for a container. Snippets from Tailwind's docs would also stop working. Keep Tailwind's breakpoint names and use Ant's prop vocabulary (`span`, `offset`, `order`, `gap`) on the grid components. |
| L2 | 12-column grid | Agree | See the 12-column explainer. Using 12 columns everywhere is simpler than Carbon's 4, 8 and 16. At 320px each column is about 9px wide, so small screens effectively use spans of 12, 6 or 4. |
| L3 | Set and forget via provider or root layout | Root layout, not a provider | CSS custom properties already cascade. A React provider would add client JavaScript, force a `"use client"` boundary in the Next app, and need `matchMedia` to know the breakpoint, which shifts the layout after server rendering. A root `PageGrid` component plus grid tokens does the same job with no JavaScript. |
- L1: Go with the tailwind standard on breakpoints.
- L3: Provide a root layout template

### Housekeeping

| # | Decision | Verdict | Argument |
|---|---|---|---|
| H1 | Docs app uses the ui tokens | Mostly done already | `../../../apps/docs/app/globals.css` already imports `@retrojb/ui/theme.css`, takes its colours from the library, and `check:contrast` reads `tokens.css`. Document 05's housekeeping note is out of date. What remains is literal spacing, radii, borders and font sizes in `globals.css` and `demo.module.css` (for example `padding: 0.6rem 0.75rem`, `margin: 2.5rem 0`, `border-radius: 4px`). |
| H2 | One changeset for the lift | Agree, created in Phase 1 | Changesets rejects unknown package names, so the file cannot name `@retrojb/tokens` until the package exists. Bump type depends on question 5. |
| H3 | New tokens package with `light.css` and `dark.css` | Agree, with a correction | Tailwind does not do the theme switching. The switch is the CSS selectors in the token files, and components never need `dark:` classes. Splitting the files does not remove the duplicated dark block either: `dark.css` still needs the `prefers-color-scheme` block and the `[data-theme="dark"]` block. A small build step that writes both from one source removes that hazard. `check-contrast.mjs` currently splits `tokens.css` on the media-query string and must be updated to read the two files, which is simpler than what it does now. |



## Explainers

### Container queries

A media query asks about the viewport. A container query asks about an ancestor element, so a component can change layout based on the space it was given rather than the screen size.

1. Mark an ancestor as a container: `container-type: inline-size`. In Tailwind that is the `@container` class.
2. Style descendants by that container's width: `@container (min-width: 28rem) { … }`. In Tailwind that is `@md:flex-row`.
3. Name a container when several are nested: `@container/card` on the ancestor, `@md/card:flex-row` on the child. Unnamed queries match the nearest container.
4. Size relative to the container with `cqi` units (1cqi = 1% of the container's inline size), for example `font-size: clamp(1rem, 4cqi, 1.5rem)`.

Limits that matter here:

- An element cannot query itself, only an ancestor. That is why `Card` is the container and its inner slots respond.
- `inline-size` containment means the container's width can no longer depend on its content. The comment in `card/styles.ts` already describes this.
- Containment also creates a new containing block, which affects `position: fixed` descendants and is one reason Card keeps `overflow-hidden` off its root.

Rule of thumb: media queries for page layout (`PageGrid`, navigation), container queries for components (`Card`, `GraphicCard`, `DynamicContainer`, which already use them).

### `min-width` patterns

1. **Mobile first.** Base styles target the smallest screen, and `min-width` queries add layout upward. Use `max-*:` only for a bounded range.
2. **Queries in rem.** Media and container queries in rem respond to the user's font size, so raising it switches the layout earlier. That is what WCAG 1.4.10 reflow at 320 CSS px needs. Tailwind's breakpoints are already rem.
3. **`min-width: 0` on flex and grid children.** Flex items default to `min-width: auto`, so they refuse to shrink below their content and overflow. `min-w-0` fixes it, and Checkbox, Radio and the group components already use it. In grids, write `minmax(0, 1fr)`, not `1fr`, which means `minmax(auto, 1fr)`.
4. **Intrinsic columns without overflow.** `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`. The `min(100%, …)` stops a 16rem minimum overflowing a narrower container.
5. **Clamped page width.** `width: min(100% - 2 * var(--grid-margin), var(--grid-max-width))` replaces a `max-width` plus padding pair.

### 12 columns, set and forget

Grid tokens in `base.css`, changed per breakpoint in a `min-width` media query on `:root`:

```css
--grid-columns: 12;
--grid-gutter: var(--space-4);   /* wider at lg */
--grid-margin: var(--space-4);   /* wider at lg, xl */
--grid-max-width: 80rem;
```

A `PageGrid` root component in `components/foundations/`:

```css
display: grid;
grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
column-gap: var(--grid-gutter);
width: min(100% - 2 * var(--grid-margin), var(--grid-max-width));
margin-inline: auto;
```

A `GridItem` with Ant-style props: `span`, `offset`, `order`, and `span={{ base: 12, md: 6, lg: 4 }}` for responsive spans. Responsive values are passed as CSS variables in `style` (`--span-md: 6`) and read by fixed rules. Generating classes from props would not work, because Tailwind only emits classes it finds as literal strings in source, and a lookup table of every span at every breakpoint is 72 classes before offsets.

For nested alignment, `GridItem subgrid` sets `grid-template-columns: subgrid`, so a section's children land on the page's columns without restating them. Full-bleed sections use `span="full"` (`grid-column: 1 / -1`).

The cost of a root grid: every direct child must be placed. Anything not wrapped in a `GridItem` takes one column. The default `GridItem` span should therefore be `full`.

## Implementation phases

Each phase is one PR that leaves the repo releasable. Phase 1 changes no values, so its review is a straight diff.

### Phase 0: decisions

Answer the five blocking questions above, plus the design calls these phases need: P2 (spacious values), S6 (hard-shadow colour in dark mode), and S7 (prop name).

### Phase 1: tokens package, no value changes

- Create `packages/tokens` (`@retrojb/tokens`) with `src/base.css`, `src/light.css`, `src/dark.css`, `src/index.css`. All in `@layer theme`.
- Move the current `tokens.css` content in unchanged. `base.css` holds anything theme-independent (spacing, radii, border weights, type).
- Generate `dist/dark.css` from one source so the media block and `[data-theme="dark"]` block cannot drift.
- `../../../packages/ui/src/styles/index.css` imports `@retrojb/tokens`. Keep `src/styles/tokens.css` as a one-line re-export for one release, since `files` publishes it.
- Update `../../../apps/docs/scripts/check-contrast.mjs` to read `light.css` and `dark.css`.
- Add the changeset (bump per question 5).
- Done when: `npm run build`, `check-types`, `lint` and `check:contrast` pass, and Storybook renders identically in light and dark.

### Phase 2: spacing and density

- Add `--space-0` to `--space-10` in rem, comfort values, in `base.css`.
- Add `[data-density="compact"]` and `[data-density="spacious"]` blocks (`density.css`).
- Add `--control-height-sm/md/lg` and size tokens for the 44, 52 and 96px cases.
- Keep `--spacing-10` and the rest as deprecated aliases (`--spacing-10: var(--space-1)`), each with a comment naming the replacement.
- Migrate component `styles.ts` files and the `tokens` lists in the seven `*Spec.yaml` files that reference spacing. Decide document 05 item B.5 (Button, ComboBox and SegmentedControl Tailwind numerics) here.
- Add a density toolbar to Storybook next to the theme toolbar.
- Done when: every component story renders in all three densities, every interactive target is at least 24 × 24 CSS px in compact, and nothing clips at 200% text size.

### Phase 3: surfaces and scrim

- Add `--surface-sunken`, `--surface-base`, `--surface-raised-1`, `--surface-raised-2`, `--surface-overlay`, and `--scrim-sm`, `--scrim-md`, per theme.
- Alias `--surface` to `--surface-base` and `--surface-raised` to `--surface-raised-1`. Deprecate the old names.
- Register `bg-surface-*` and `bg-scrim-*` in `theme.css`.
- Add every surface to the pairings `check-contrast.mjs` measures.
- Apply the scrim to `BrowserAlert`'s `::backdrop`.
- Done when: `check:contrast` passes with the new surfaces in both themes.

### Phase 4: shadow tokens

- `--shadow-color` and `--shadow-alpha-0` to `-6` per theme.
- `--elevation-soft-0` to `-6`, `--elevation-hard-0` to `-6`, and `--bevel-sm/md/lg/pressed` in `base.css`.
- Roles (`--elevation-control`, `-control-hover`, `-raised-1`, `-raised-2`, `-overlay`, `-modal`), pointing at soft by default, with `[data-shadow="hard"]` repointing them.
- Map roles to `--shadow-*` and bevels to `--inset-shadow-*` in `theme.css`.
- Inspect the compiled `dist/styles.css` to confirm `var()`-based shadows compile and that `shadow-*` and `inset-shadow-*` compose on one element.
- Add a shadow-style toolbar to Storybook.
- Done when: Storybook shows each role in 2 themes × 2 styles, and forced-colors emulation shows every component still has its border.

### Phase 5: components adopt shadows

- `withShadow` (or `elevated`) on Card and Button as a tailwind-variants boolean, with compound variants turning it off for ghost and disabled buttons.
- ComboBox listbox: replace `shadow-lg` with `shadow-overlay`. Toast: `shadow-overlay`. BrowserAlert: `shadow-modal`.
- Overlay components set `data-surface="overlay"`, and Card drops its shadow inside one.
- ComboBox listbox, ToastAlert and BrowserAlert move to `bg-surface-overlay`, with their tone ratios re-measured on it.
- Button: `transition-colors` becomes a transition on colour and shadow, with `motion-reduce:transition-none`. Hard-style press uses a translate only when motion is allowed.
- Update each touched `*Spec.yaml`, TSDoc, stories and changeset entry.

### Phase 6: layout

- Register breakpoints in `theme.css` (Tailwind values plus the answer to question 3), in rem.
- Grid tokens, `PageGrid` and `GridItem` in `components/foundations/`.
- A Storybook foundations page covering breakpoints, container queries and the `min-width` patterns.

### Phase 7: docs app

- Replace the literal spacing, radii, borders and font sizes in `../../../apps/docs/app/globals.css` and `demo.module.css` with tokens. Decide whether the fluid `clamp()` headings stay or move to the type roles.
- Add token reference pages for spacing, surfaces and shadows if the site should demonstrate them.

## Out of scope

- Z-index tokens (document 05, A.7). Not in your feedback, and the native `<dialog>` top layer covers most of the need.
- Semantic gap tokens (`--gap-*`). `DynamicContainer`'s `xs` to `xl` can map to `--space-*` directly until a second component needs them.
- Moving these files into `../..`. `temp/` is gitignored, so this plan is lost if it is not moved.

---

Sources: Tailwind box-shadow and theme docs (https://tailwindcss.com/docs/box-shadow), documents 01 to 05 in this folder, and the repo files named above.

---
- G1: I agree with your verdict, I just want to make sure things are scalable in terms of ramps. Keep the color ramps as is.
- G5: I see, and agreed with those exceptions.
- G7: Good call, I agree with the simplification

- S1 & S4: Sorry, typo for that, it should follow the [0-10] idea.
- S5: Yes that makes sense, ensure to write documentation around this decision.
- S6: Exclude the `shadow-hard`, that was just a wild thought I had.
- S7: Elevate makes sense and yes optional where it makes sense (Card, Button, Avatars).
- Primitive roles - Please add a Tailwind decisions to our project-docs that break down where we strictly follow tailwind and where we break from the pattern or have customizations. Also make sure to write a generalized token documeantion that breaks down the naming conventions.

- P2: I see the point, in some cases this would be over kill. I failed to point out that this would have the adverse effect when scaling upward. Let's make sure to write very clear documentation around these scales so that consumers very clearly understand and that edge cases, and restrictions can apply to this.
- P3: Fair, as long as it's tokenized so that we can easily change it later if needed.
- Scale name: Let's go with `space-*`

- H1: Alright, let's just clean it up. We want implementation to be frictionless when adding our styles in.
- H2: I will handle the changesets
- H3: I'll take your word for it, let's make it as frictionless as possible. To your below statement, if we kept a root index that used the `light-dark()` then we have our `dark` and `light` files that only have that variant, we'd get the best of both worlds for consumers?

**Alternative to H3, not recommended for now.** CSS `light-dark()` lets each colour token hold both values in one declaration (`--surface-base: light-dark(#f6f7f9, #14171a)`), with `data-theme` only setting `color-scheme`. That removes the duplication, but it removes the light and dark files you asked for, the contrast engine would need to parse `light-dark()`, and it only accepts colours, so shadow alphas would still need per-theme blocks.


---

author: John Baltes

updated: 2026-11-06

---
