# Elevation and shadow: ten systems compared

See `foundations-00-README.md` for method and what could not be verified. All
shadow values are `x y blur spread alpha` unless stated. Alpha is the colour's
opacity.

## Summary table

| System     | Scale                                                     | Naming                                 | Depth mechanism                               | Dark mode strategy                | Shadow colour                                  |
| ---------- | --------------------------------------------------------- | -------------------------------------- | --------------------------------------------- | --------------------------------- | ---------------------------------------------- |
| Material 3 | 6 levels: 0, 1, 3, 6, 8, 12 dp                            | Level number (0 to 5)                  | Tonal surface overlay first, shadow secondary | Lighter tone carries depth        | Per-component token                            |
| Carbon     | No shadow scale; 4 colour layers                          | `layer-01`, `layer-02`, `layer-03`     | Layering by background colour                 | Each layer one step lighter       | One `$shadow` token                            |
| Polaris    | 7 steps: 0, 100 to 600                                    | Number                                 | Single-layer shadows                          | Not captured                      | Tinted `#1A1A1A`                               |
| Atlassian  | 4 levels plus overflow                                    | Role: sunken, default, raised, overlay | Surface and shadow token pair                 | Lighter surfaces, shadows kept    | Tinted `#1E1F21`                               |
| Fluent 2   | 2, 4, 8, 16 (low); 28, 64 (high)                          | Blur radius in px                      | Key plus ambient shadow                       | Higher opacity on the low ramp    | Neutral; luminosity formula for brand surfaces |
| Primer     | inset; resting xsmall to medium; floating small to xlarge | Role and size                          | Multi-layer shadow                            | Much higher alpha plus a 1px ring | Neutral ramp step                              |
| Ant Design | 3 global plus component shadows                           | `boxShadow`, `Secondary`, `Tertiary`   | Three-layer shadow                            | One `colorShadow` seed            | Seed token, alpha scaled per layer             |
| Bootstrap  | sm, default, lg, none, inset                              | T-shirt                                | Single-layer shadow                           | Not differentiated                | `$black`                                       |
| Tailwind 4 | 2xs to 2xl, inset, drop, text                             | T-shirt                                | One or two layers                             | None (black only)                 | `rgb(0 0 0)`                                   |
| Chakra 3   | xs to 2xl, inner, inset                                   | T-shirt                                | Two layers                                    | Separate `_dark` values           | Gray 900 (light), black (dark)                 |

## Per-system detail

### 1. Material Design 3

- Six elevation levels measured in dp: 0, 1, 3, 6, 8, 12. They map to level
  tokens 0 to 5.
- Depth is shown mainly by a tonal overlay from the primary colour. Shadow is a
  secondary cue. The official tokens page now says the old surface-tint colour
  is deprecated in favour of the level tokens.
- `@material/web` 2.5.0 builds shadows from a key layer per level. The offsets
  in its SCSS comments are:

| Level | Key shadow    |
| ----- | ------------- |
| 0     | `0 0 0 0`     |
| 1     | `0 1px 2px 0` |
| 2     | `0 1px 2px 0` |
| 3     | `0 1px 3px 0` |
| 4     | `0 2px 3px 0` |
| 5     | `0 4px 4px 0` |

An ambient layer is added on top; its values were not captured.

- Secondary source: cards at level 1, navigation bars at level 2, FAB at
  level 3.
- Takeaway: the level count is the token. Colour does the depth work, so dark
  mode needs no special handling.

### 2. IBM Carbon

- No elevation or shadow scale. Depth is the layering model: background, then
  `layer-01`, `layer-02`, `layer-03`.
- Light themes alternate White and Gray 10 with each layer. Dark themes lighten
  one step per layer (Gray 100, 90, 80, 70).
- Shadows are used for floating UI. `@carbon/styles` 1.119.0 has a shadow
  utility of `0 2px 6px` (and `0 -2px 6px` for top placement) coloured by a
  single theme token, `$shadow`.
- Takeaway: if depth is expressed in colour, the shadow scale can shrink to one
  or two values for overlays.

### 3. Shopify Polaris

Seven steps, one layer each, with negative spread that grows with size so the
shadow stays tight to the element. Values from `@shopify/polaris-tokens` 9.4.2
(`rgba(26, 26, 26, alpha)`):

| Token        | Value              | Alpha |
| ------------ | ------------------ | ----- |
| `shadow-0`   | none               |       |
| `shadow-100` | `0 1px 0 0`        | 0.07  |
| `shadow-200` | `0 3px 1px -1px`   | 0.07  |
| `shadow-300` | `0 4px 6px -2px`   | 0.20  |
| `shadow-400` | `0 8px 16px -4px`  | 0.22  |
| `shadow-500` | `0 12px 20px -8px` | 0.24  |
| `shadow-600` | `0 20px 20px -8px` | 0.28  |

- Alpha rises with size. Ant Design's shadow spec says farther objects get
  lighter shadows, so the two disagree in principle. Ant's own token alphas also
  rise from `boxShadowTertiary` to `boxShadow`, so its tokens do not follow its
  prose either.
- The default Card uses `shadow-300`.
- A separate `shadow-bevel-100` token is a set of four inset edge shadows. I did
  not verify which component consumes it.
- Takeaway: numeric names leave gaps (100, 200, 300) so steps can be inserted
  without renaming.

### 4. Atlassian Design System

Four levels, each with a surface token. The top two also have a shadow token.

| Level    | Use                                              | Surface and shadow                                       |
| -------- | ------------------------------------------------ | -------------------------------------------------------- |
| Sunken   | Wells such as a Kanban column backdrop           | `elevation.surface.sunken`                               |
| Default  | Page content                                     | `elevation.surface`; add a border for a flat card        |
| Raised   | Cards that can be moved; one focal point at most | `elevation.surface.raised` + `elevation.shadow.raised`   |
| Overlay  | Modals, menus, floating toolbars, dragged items  | `elevation.surface.overlay` + `elevation.shadow.overlay` |
| Overflow | Scroll-clipping indicator                        | `elevation.shadow.overflow`                              |

Values from `@atlaskit/tokens` 20.9.0:

| Token                       | Value                                     |
| --------------------------- | ----------------------------------------- |
| `elevation.shadow.raised`   | `0 1px 1px #1E1F2140, 0 0 1px #1E1F214F`  |
| `elevation.shadow.overlay`  | `0 8px 12px #1E1F2126, 0 0 1px #1E1F214F` |
| `elevation.shadow.overflow` | `0 0 8px #1E1F2129, 0 0 1px #1E1F211F`    |

Rules from the docs:

- Always pair matching surface and shadow tokens. Do not mix a raised surface
  with an overlay shadow.
- In dark mode higher surfaces are lighter, because shadows are harder to see.
  Raised and overlay still keep their shadows.
- Hover and pressed states use surface tokens (`.hovered`, `.pressed`).
  Elevation transitions are an alternative but must not be combined with those
  tokens, and not for overlays or very small UI.
- Borders are the default for scrolled-content edges. Overflow shadows are for
  where borders are easy to miss, such as tables.
- Every layer also gets a z-index, listed in document 04.
- Takeaway: both layers include a `0 0 1px` hairline that defines the edge. That
  is the same role the repo gives a real `border`.

### 5. Microsoft Fluent 2

- Shadows are named by blur radius: 2, 4, 8, 16 (low ramp) and 28, 64 (high
  ramp). Shadow 2 has a 2px blur, shadow 64 has a 64px blur.
- Each shadow combines a sharp directional key shadow with a soft ambient one.
  Sharp means close to the surface, soft means far.
- Low-ramp key formula from the page: y offset is half the blur value, blur
  equals the value, about 14% opacity in light. In dark the opacity on one layer
  doubles to 28%. The page repeats the same parameters for both layers, so the
  per-layer split is not quoted here.
- Windows uses strokes instead of key shadows to outline an object.
- Suggested uses, summarised: shadow 2 and 4 for cards and grid items, 8 for
  raised cards, FABs and command bars, 16 for callouts and hover cards, 28 for
  sheets and side navigation, 64 for dialogs and panels.
- On coloured surfaces the same shadow reads as a different height, so opacity
  is derived from the colour's luminosity. Shadow 1 opacity is
  `round(42 - 0.116 * L)` and shadow 2 is `round(34 - 0.09 * L)`, where
  `L = 0.2126R + 0.7152G + 0.0722B`. Brand shadow tokens exist for this.
- Takeaway: naming by physical blur makes the scale self-explanatory, and the
  colour-surface rule is the only system that treats shadows on coloured fills
  explicitly. That is relevant to a filled primary or danger button.

### 6. GitHub Primer

Values from `primer/primitives` `shadow.json5` (light, then dark;
`x y blur spread alpha`):

| Token             | Light                                                 | Dark                                     |
| ----------------- | ----------------------------------------------------- | ---------------------------------------- |
| `resting.xsmall`  | `0 1 1 0 .05`                                         | `0 1 1 0 .8`                             |
| `resting.small`   | `0 1 1 0 .04` + `0 1 2 0 .03`                         | `0 1 1 0 .6` + `0 1 3 0 .6`              |
| `resting.medium`  | `0 1 1 0 .1` + `0 3 6 0 .12`                          | `0 1 1 0 .4` + `0 3 6 0 .8`              |
| `floating.small`  | `0 0 0 1 .25` + `0 6 12 -3 .04` + `0 6 18 0 .12`      | ring at 1, `0 6 12 -3 .4`, `0 6 18 0 .4` |
| `floating.medium` | ring 0, then four layers at .08 (up to `0 48 96 -24`) | ring at 1, same layers at .4             |
| `floating.large`  | ring 0 + `0 40 80 0 .24`                              | ring at 1 + `0 24 48 0 1`                |
| `floating.xlarge` | ring 0 + `0 56 112 0 .32`                             | ring at 1 + `0 32 64 0 1`                |
| `inset`           | `0 1 0 0 .04` inset                                   |                                          |

The floating tokens start with a `0 0 0 1px` layer, a "ring". It is transparent
(alpha 0) in light mode for medium and larger, and fully opaque in dark mode,
where it acts as a border.

Usage rules attached to each token in the repo:

- `resting.small`: buttons and clickable elements, recommended as the default
  button shadow.
- `resting.medium`: cards and panels.
- `floating.small`: dropdowns and tooltips. `floating.medium`: popovers and
  action menus. `floating.large`: modals and dialogs. `floating.xlarge`: drawers
  and side sheets.
- `inset`: inputs, wells, pressed buttons.
- Shadow levels map to z-index tokens (document 04).
- Takeaway: Primer is the closest precedent for a button shadow with light and
  dark values in the same token. Its dark alphas run roughly 4 to 20 times the
  light ones.

### 7. Ant Design

From `antd` 6.7.0:

| Token                   | Value                                                      |
| ----------------------- | ---------------------------------------------------------- |
| `boxShadow`             | `0 6px 16px 0 .08, 0 3px 6px -4px .12, 0 9px 28px 8px .05` |
| `boxShadowSecondary`    | identical to `boxShadow` in this version                   |
| `boxShadowTertiary`     | `0 1px 2px 0 .05, 0 1px 6px -1px .03, 0 2px 4px 0 .03`     |
| `boxShadowPopoverArrow` | `2px 2px 5px .05`                                          |

Plus component-level tokens: `boxShadowCard` and four `boxShadowDrawer*`
directions.

- Every alpha is a multiplier of one `colorShadow` seed, so changing the seed's
  colour or alpha retunes every shadow.
- The shadow spec states the principle: the farther an object is from the
  ground, the larger and blurrier its shadow, and the spec says lighter too.
- Takeaway: one seed colour plus per-layer multipliers is the simplest dark-mode
  retune mechanism among the ten.

### 8. Bootstrap 5.3

| Token               | Value                                |
| ------------------- | ------------------------------------ |
| `$box-shadow-sm`    | `0 .125rem .25rem rgba(black, .075)` |
| `$box-shadow`       | `0 .5rem 1rem rgba(black, .15)`      |
| `$box-shadow-lg`    | `0 1rem 3rem rgba(black, .175)`      |
| `$box-shadow-inset` | `inset 0 1px 2px rgba(black, .075)`  |

- Component shadows are off by default. `$enable-shadows` turns them on, and it
  does not affect focus shadows.
- The same values are exposed as `--bs-box-shadow*` CSS variables, and the
  utility classes are `shadow-sm`, `shadow`, `shadow-lg`, `shadow-none`.
- Takeaway: shadows are opt-in decoration. The framework leaves the decision to
  the consuming app.

### 9. Tailwind CSS 4

From the default `theme.css`:

| Token          | Value                                     |
| -------------- | ----------------------------------------- |
| `--shadow-2xs` | `0 1px rgb(0 0 0 / .05)`                  |
| `--shadow-xs`  | `0 1px 2px 0 rgb(0 0 0 / .05)`            |
| `--shadow-sm`  | `0 1px 3px 0 .1, 0 1px 2px -1px .1`       |
| `--shadow-md`  | `0 4px 6px -1px .1, 0 2px 4px -2px .1`    |
| `--shadow-lg`  | `0 10px 15px -3px .1, 0 4px 6px -4px .1`  |
| `--shadow-xl`  | `0 20px 25px -5px .1, 0 8px 10px -6px .1` |
| `--shadow-2xl` | `0 25px 50px -12px .25`                   |

- Also `--inset-shadow-{2xs,xs,sm}`, `--drop-shadow-{xs..2xl}` and
  `--text-shadow-{2xs..lg}`.
- Colour and opacity are overridable per use: `shadow-cyan-500/50`,
  `shadow-xl/20`. The docs note default opacities are low, and raising them to
  around 50% makes shadows pronounced.
- No dark-mode variant. The same black shadows apply on every surface.
- Takeaway: this is what the repo uses today for ComboBox (`shadow-lg`). Colour
  overrides are a utility feature, not a token feature.

### 10. Chakra UI 3

From `@chakra-ui/react` 3.38.0 semantic tokens, each with `_light` and `_dark`:

| Token   | Light                                        | Dark                                            |
| ------- | -------------------------------------------- | ----------------------------------------------- |
| `xs`    | `0 1px 2px gray.900/10, 0 0 1px gray.900/20` | `0 1px 1px black/64, 0 0 1px inset gray.300/20` |
| `sm`    | `0 2px 4px /10, 0 0 1px /30`                 | `0 2px 4px black/64, 0 0 1px inset gray.300/30` |
| `md`    | `0 4px 8px /10, 0 0 1px /30`                 | `0 4px 8px black/64, inset hairline`            |
| `lg`    | `0 8px 16px /10, 0 0 1px /30`                | `0 8px 16px black/64, inset hairline`           |
| `xl`    | `0 16px 24px /10, 0 0 1px /30`               | `0 16px 24px black/64, inset hairline`          |
| `2xl`   | `0 24px 40px /16, 0 0 1px /30`               | `0 24px 40px black/64, inset hairline`          |
| `inner` | `inset 0 2px 4px black/5`                    | `inset 0 2px 4px black`                         |
| `inset` | `inset 0 0 0 1px black/5`                    | `inset 0 0 0 1px gray.300/5`                    |

- Blur steps 2, 4, 8, 16, 24, 40 (xs to 2xl), the y offset is roughly half the
  blur, and the soft layer's alpha stays at 10% (16% at 2xl).
- Dark swaps the soft layer to black at 64% and replaces the light hairline with
  an inset 1px highlight in a light grey. That highlight is a lit top edge.
- Takeaway: Chakra is the only system here with a constant-alpha, evenly stepped
  scale and an explicit dark highlight.

## Patterns across the ten

1. **Four to seven steps.** Nobody ships more than seven shadow levels. Carbon
   ships none.
2. **Multi-layer is the norm.** Seven of ten (Material, Atlassian, Fluent,
   Primer, Ant, Chakra, Tailwind from `sm` to `xl`) combine a tight contact
   layer with a soft ambient one. Polaris, Carbon and Bootstrap use a single
   layer.
3. **Naming splits three ways.** Role names (Atlassian, Primer), size or number
   names (Polaris, Tailwind, Chakra, Bootstrap, Material), and physical-property
   names (Fluent's blur radius, Material's dp). Role names reduce misuse. Number
   names are easier to extend.
4. **Dark mode is handled with surface and shadow together.** Material, Carbon
   and Atlassian make higher surfaces lighter. Primer, Chakra and Fluent raise
   shadow opacity in dark. Chakra and Primer add a light edge (inset highlight
   or opaque ring). Only Tailwind and Bootstrap do nothing.
5. **A tinted near-black beats pure black in light mode.** Polaris uses
   `#1A1A1A`, Atlassian uses `#1E1F21`, Chakra uses a gray 900. Pure black
   appears only in Bootstrap and Tailwind.
6. **A 1px edge layer is common.** Atlassian and Chakra put `0 0 1px` in every
   shadow. Primer has a `0 0 0 1px` ring. This does the job that a border does
   in this repo, and it is also the part that vanishes in forced-colors mode.
7. **Shadow level is paired with a layer.** Atlassian and Primer pair shadow
   with z-index and surface (document 04).
8. **Buttons are split.** Primer recommends a resting shadow on buttons.
   Atlassian reserves shadow for movable cards and overlays. Bootstrap disables
   component shadows by default. Fluent lists hero buttons and FABs.
9. **A single source of shadow colour is rare but effective.** Ant
   (`colorShadow` seed) and Carbon (`$shadow`) retune everything in one place.
10. **Inset is a first-class token** in Primer, Chakra, Tailwind and Bootstrap,
    used for inputs, wells and pressed states.

## Sources

- Material 3 elevation:
  https://m3.material.io/styles/elevation/applying-elevation and
  https://m3.material.io/styles/elevation/tokens
- Material 3 teardown (secondary):
  https://superdesign.dev/blog/material-design-system
- `@material/web` elevation SCSS: https://www.npmjs.com/package/@material/web
- Carbon color layering:
  https://www.carbondesignsystem.com/elements/color/overview/
- `@carbon/styles`: https://www.npmjs.com/package/@carbon/styles
- Polaris tokens: https://www.npmjs.com/package/@shopify/polaris-tokens
- Polaris Card:
  https://polaris-react.shopify.com/components/layout-and-structure/card
- Atlassian elevation: https://atlassian.design/foundations/elevation
- `@atlaskit/tokens`: https://www.npmjs.com/package/@atlaskit/tokens
- Fluent 2 elevation: https://fluent2.microsoft.design/elevation
- Primer shadow tokens:
  https://github.com/primer/primitives/blob/main/src/tokens/functional/shadow/shadow.json5
- Primer tokens guide:
  https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md
- Ant Design shadow spec: https://ant.design/docs/spec/shadow/
- `antd`: https://www.npmjs.com/package/antd
- Bootstrap shadows: https://getbootstrap.com/docs/5.3/utilities/shadows/
- Tailwind box-shadow: https://tailwindcss.com/docs/box-shadow
- Chakra shadows: https://chakra-ui.com/docs/theming/shadows and
  `@chakra-ui/react` 3.38.0 `theme/semantic-tokens/shadows`
