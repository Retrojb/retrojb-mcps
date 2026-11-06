# Patterns and recommendations for `@retrojb/ui`

Synthesis of documents 02 to 04. Everything here is a proposal. Nothing has been changed in the repo.

## Patterns that hold across the ten systems

### Elevation

1. **Small scales.** Four to seven levels, never more.
2. **Two layers per shadow.** A tight contact layer plus a soft ambient one is used by seven of ten. Single-layer shadows (Polaris, Carbon, Bootstrap) are the minority.
3. **Depth is expressed twice: surface and shadow.** Material, Carbon and Atlassian lighten higher surfaces. Atlassian pairs a surface token with a shadow token and says never to mix levels. Primer pairs shadow levels with z-index tokens.
4. **Dark mode needs its own values.** Where systems publish dark shadows, alpha is several times higher (Primer 4 to 20 times), and Chakra and Primer add a light edge (inset highlight, opaque ring) because dark shadows on dark surfaces are nearly invisible.
5. **Tinted near-black in light mode** (`#1A1A1A`, `#1E1F21`, gray 900), not pure black.
6. **Shadows are for floating things.** In the systems that publish shadows, overlays, menus and dialogs get them. Cards and buttons are the contested middle (document 02, pattern 8).
7. **Shadow level is paired with a stacking layer** in Atlassian and Primer.

### Spacing

1. **4px grain**, with 8px-based systems still publishing 4px steps.
2. **Steps of 4px to about 24px, 8px to 48px, then 16px.**
3. **A name that tracks the value** is the most common rule (Polaris, Fluent, Atlassian, Primer, Tailwind).
4. **Half steps at 2px and 6px** exist in seven and six of ten respectively.
5. **Fixed scales publish 6 to 19 steps**, most of them 13 to 16. Tailwind and Chakra are open multipliers. Retro publishes 20.
6. **A semantic layer is common but varies in form:** density-based stack and control tokens (Primer), usage ranges (Atlassian), two scales (Carbon), aliases (Ant).
7. **rem units** in six of ten.

### Grid and layout

1. **12 columns is the shared default**, with Ant at 24 and Carbon at 4, 8, 16.
2. **Five to six breakpoints**, clustering around 480, 768, 1024, 1280.
3. **Layout primitives with `gap` are replacing margin-based layout** (Polaris, Carbon, Ant, Chakra, Bootstrap utilities).
4. **Container queries are becoming first-class** (Polaris, Tailwind).
5. **Z-index tokens have gaps, and names tied to roles** (Atlassian, Primer, Chakra, Polaris).

## Where `@retrojb/ui` stands today

| Area | Today | Against the patterns |
|---|---|---|
| Shadow tokens | None. One hardcoded Tailwind `shadow-lg`. | Missing. |
| Surface tokens | `--surface`, `--surface-raised` (2 levels) | Atlassian has 4 (sunken, default, raised, overlay). |
| Dark-mode shadow handling | None | Needed once any shadow ships. |
| Button depth | None; transparent border; `transition-colors` | Consistent with Atlassian and Bootstrap; Primer differs. |
| Spacing names | Track value to 100, then jump | Unique among the ten. |
| Spacing units | px | Majority use rem. |
| Spacing scale size | 20 steps; components use about 8 | Larger than any comparable fixed scale. |
| Sub-4px steps | None | Seven of ten have 2px. |
| Spacing usage | Token form in many components (alerts, tags, chips, form controls, tabs); Tailwind numerics in Button, ComboBox, SegmentedControl heights | Two systems in parallel. |
| Breakpoints | Implicit Tailwind defaults | Not documented. |
| Container queries | Used by `Card`, `GraphicCard`, `DynamicContainer` | Consistent with the direction of Polaris and Tailwind. |
| Layout primitives | `DynamicContainer`; `foundations/` is empty | Thin. |
| Z-index | Raw `z-10`, `z-50`; `isolate` on ComboBox; native `<dialog>` | No tokens. Native top layer avoids most of the need. |

## Proposals

### A. Elevation tokens

This updates the proposal in document 01 with what the comparison added.

1. **Colour:** `--shadow-color`, light = `var(--neutral-9)`, dark = `#000`. The repo's neutral-9 is already a tinted near-black (`#070507`), which matches pattern 5.
2. **Scale:** keep `--elevation-1` to `--elevation-4`, two layers each, plus an inset token for inputs and pressed states. Four steps matches the low end of the range and the number of surfaces Atlassian uses.
3. **Dark values:** two options.
   - Restate the alphas in the dark blocks (what Primer and Chakra do). This adds a third and fourth copy next to the existing "keep in step" blocks.
   - One strength token. `color-mix(in srgb, var(--shadow-color) calc(14% * var(--shadow-strength)), transparent)` would let only `--shadow-strength` differ by theme. Whether `calc()` is accepted inside a `color-mix` percentage in all supported browsers needs a test before adopting this.
4. **Hairline layer:** skip it. Atlassian and Chakra add `0 0 1px` to define the edge, but the repo already draws real borders on every component that has a shadow candidate (ComboBox listbox, Toast, Card). A shadow hairline would vanish in forced-colors mode, which is the reason the repo uses borders.
5. **Roles:** `control`, `control-hover`, `control-active`, `raised`, `overlay`, `modal`, with `--shadow-inset` for inputs. Component code uses roles, never the scale.
6. **Surface pairing:** adopt Atlassian's rule that a shadow role implies a surface. Today `--surface-raised` can serve `raised`, `overlay` and `modal`. Whether overlay needs its own lighter surface in dark mode is open decision 3.
7. **Z-index:** add a short named scale (for example `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`) with gaps between values and have components use it instead of `z-10` and `z-50`. Keep `isolate` as the first tool, as Primer advises. Low priority because the native `<dialog>` top layer already sidesteps most conflicts.

### B. Spacing

1. **Fix the naming** (breaking). Options:

| Option | Example | Cost |
|---|---|---|
| Keep as is | `--spacing-10` = 4px, `--spacing-200` = 44px | No change. The oddity stays. |
| Name tracks px | `--spacing-4`, `--spacing-8`, `--spacing-44` | Clear. Collides conceptually with Tailwind's `p-4`, which means 16px. |
| Polaris style | px × 25 | Looks like the current names for small steps. |
| Atlassian style | Percent of a base | Needs an agreed base (4 or 8). |

   These are public CSS custom properties that consuming apps may override. A rename needs a deprecation window and a changeset.
2. **Prune.** Components use roughly 0, 10 to 60, and 1000 from what I could read. Comparable scales run 13 to 19. Confirm usage, then decide whether 70 to 900 stay as a published promise.
3. **Add 2px and 6px** only if a component needs optical alignment. Do not add them speculatively.
4. **Decide px or rem.** rem follows a user's font size, which matches the rem type scale. The cost is that a few component heights (`h-8`, `h-10`, `h-12` Button heights) are already Tailwind rem-based via `--spacing`, and mixing px tokens with them can desync at larger font sizes.
5. **Unify usage.** Either move Button, ComboBox and SegmentedControl to token form, or document why they use Tailwind numerics. `inlineAlert/styles.ts` already explains why a named token cannot join Tailwind's numeric namespace.
6. **Semantic roles later.** `DynamicContainer` already defines a gap vocabulary (`xs` to `xl`). If more components need it, promote that to `--gap-*` tokens. Not before.

### C. Layout

1. **No 12-column grid component.** The evidence points the other way: Tailwind and Chakra ship none, and Polaris, Carbon and Ant steer toward stacks and `gap`. CSS grid with `repeat(auto-fit, minmax(...))` and a gap token covers most cases, and the repo already uses container queries.
2. **Document the breakpoints.** The implicit Tailwind set (640, 768, 1024, 1280, 1536) includes the 768px `md` that Chakra, Polaris, Bootstrap and Ant also use. Add a short statement in the docs, and register `--breakpoint-*` in `theme.css` only if the set will diverge.
3. **Publish container sizes** for the `@sm` and `@md` breakpoints the components rely on (24rem and 28rem from Tailwind's `--container-*`).
4. **Page-level layout** is the real gap: a max-width container with gutters that widen by breakpoint (Carbon: 0, 16, 16, 16, 24px margins; Bootstrap: 1.5rem gutter). That belongs in `components/foundations/` if the library wants it.

## Open decisions

1. **Shadow style.** Soft and modern (document 01 values) or hard-offset retro (`3px 3px 0 var(--border-strong)`)? The token structure supports either.
2. **Button resting shadow.** On (Primer) or off (Atlassian, Bootstrap)? Flat with a strong border is a legitimate default.
3. **How many surfaces.** Keep two, or add Atlassian-style sunken and overlay surfaces so dark mode can lighten overlays?
4. **Spacing rename.** Which option from B.1, and is a breaking change acceptable?
5. **px or rem for spacing.**
6. **Breakpoints.** Keep Tailwind's defaults and document them, or define a retro set?
7. **Page layout components.** In scope for this library, or left to consuming apps?

## Housekeeping if any of this is built

- The docs app has its own palette in `../../../apps/docs/app/globals.css`, and `tokens.css` notes the contrast check reads that file. New shadow tokens would need mirroring there if the docs site demonstrates them.
- Every change to `@retrojb/ui` needs a changeset. A spacing rename would be a breaking change.
- New tokens need entries in the Storybook docs and, for components that adopt them, an update to the component's `*Spec.yaml` and TSDoc, per `project-docs/TSDOC.md`.
- `check:contrast` does not gate shadows, so a shadow is never a contrast fix.

---
## My feedback to the research

Please follow up with a new markdown with a plan to implement these changes and any hard arguements against my decisions. 
### General
- Our scale should be [0-10] similar to Polaris. This should be across all "scaled tokens" (color, spacing, box shadow, gaps)
- For borders and cases where a scale of 10 would be excessive use T-Shirt Sizing 
- For Breakpoints, follow the standard scale along with Carbons increased breakpoint. 
- Determine better patterns for using `min-width`
- use `rem` values. 
- don’t use hairline
- dark mode for shadows do the `alpha` approach
### Spacing
Spacing should have 3 modes: Compact (divisible by 2), Comfort (by 4) and Spacious (by 8) - this will be controlled similar to how a theme would be toggled. One caveat is that compact must maintain its a11y touch targets for clickable elements, so their may be case where "Compact" is pretty much the same as Comfort. 
### Box Shadow / Surface
- Create surfaces - sunken, base, raised-1 raised-2 and overlay. 
- We will want to consider how things like a `Card` would render in a modal or other overlay. 
- We will also want to go ahead and create `scrim` tokens too. 
- Use the Shopify Polaris Seven Step approach to naming
  - Add a beveled scale too 
- Can we make a set of `shadow-soft` (modern approach) and a set of `shadow-hard` (for a more retro feel)
Can we make the ability to add box shadow optional prop once we’ve determined what semantic shadow token a component will use? Like `withShadow`
### Layout Grid
I want to follow the simple naming conventions of Ant Design but am very curious to how over complicated that’d make just following Tailwind. 
- Can you also better explain the CSS `@containers` query functionality
- Utilize a 12 Grid layout, is it possible to tokenize or make it a provider or a root level layout so that it’s a "set and forget" situation? 
### house keeping
- Update the docs app to use our tokens from the ui package. 
- We can go ahead and create a new change set for this lift. 
- Let’s create a new package to hold all of our tokens. I will want to separate them into a `light.css` and a `dark.css` so that tailwind can handle using them for theme switching. 
