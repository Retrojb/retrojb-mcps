# Spacing: ten systems compared

See `foundations-00-README.md` for method and caveats. Values were read from
token source where possible (Polaris, Ant, Carbon, Atlassian, Chakra, Primer,
Tailwind) and from docs otherwise (Fluent, Bootstrap). Material 3 spacing was
not verified.

## Summary table

| System     | Base unit               | Steps                                                                 | Unit in source | Naming rule                          | Responsive tokens                            |
| ---------- | ----------------------- | --------------------------------------------------------------------- | -------------- | ------------------------------------ | -------------------------------------------- |
| Material 3 | Not verified            |                                                                       |                |                                      |                                              |
| Carbon     | 8px mini unit (2x Grid) | 13 component (`spacing-01` to `-13`), 7 layout (`layout-01` to `-07`) | rem            | Zero-padded index                    | No. Jumping steps at breakpoints is allowed. |
| Polaris    | 4px                     | 15 (`space-0` to `space-2000`)                                        | rem            | px ÷ 25 (`space-400` is 16px)        | Prop values can take `@container` conditions |
| Atlassian  | 8px = `space.100`       | 14 (`space.0` to `space.1000`) plus negatives                         | rem            | Percent of 8px (`space.200` is 16px) | Not yet. Docs say density is future work.    |
| Fluent 2   | 4px                     | 16 (`size20` to `size560`) plus `sizeNone`                            | px             | px × 10 (`size160` is 16px)          | Guidance: change spacing per breakpoint      |
| Primer     | 4px (px values)         | 19 base sizes (2 to 128), plus functional tokens                      | px             | Value (`base.size.16`)               | Control and stack tokens by density          |
| Ant Design | 4px unit, step 4        | 9 (`sizeXXS` to `sizeXXL`)                                            | px (numbers)   | T-shirt                              | Via the seed (`sizeUnit`, `sizeStep`)        |
| Bootstrap  | 1rem `$spacer`          | 6 (0 to 5)                                                            | rem            | Index (1 = .25 spacer)               | Breakpoint-prefixed utilities                |
| Tailwind 4 | 0.25rem `--spacing`     | Any integer or half-step                                              | rem            | Multiplier                           | Breakpoint variants                          |
| Chakra 3   | 0.25rem (key × .25rem)  | About 40 keys, 0.5 to 96+                                             | rem            | Multiplier                           | Breakpoint style props                       |

## Side-by-side by pixel value

Every row is the same pixel size. A dash means the system has no step at that
size. "Retro" is the current `--spacing-*` in
`../../../packages/ui/src/styles/tokens.css`.

| px  | Carbon | Atlassian | Polaris | Fluent | Primer | Ant          | Tailwind / Chakra | Bootstrap | Retro |
| --- | ------ | --------- | ------- | ------ | ------ | ------------ | ----------------- | --------- | ----- |
| 2   | 01     | .025      | 050     | 20     | 2      |              | 0.5               |           |       |
| 4   | 02     | .050      | 100     | 40     | 4      | XXS          | 1                 | 1         | 10    |
| 6   |        | .075      | 150     | 60     | 6      |              | 1.5               |           |       |
| 8   | 03     | .100      | 200     | 80     | 8      | XS           | 2                 | 2         | 20    |
| 12  | 04     | .150      | 300     | 120    | 12     | SM           | 3                 |           | 30    |
| 16  | 05     | .200      | 400     | 160    | 16     | MS / default | 4                 | 3         | 40    |
| 20  |        | .250      | 500     | 200    | 20     | MD           | 5                 |           | 50    |
| 24  | 06     | .300      | 600     | 240    | 24     | LG           | 6                 | 4         | 60    |
| 32  | 07     | .400      | 800     | 320    | 32     | XL           | 8                 |           | 80    |
| 40  | 08     | .500      | 1000    | 400    | 40     |              | 10                |           | 100   |
| 48  | 09     | .600      | 1200    | 480    | 48     | XXL          | 12                | 5         | 300   |
| 64  | 10     | .800      | 1600    |        | 64     |              | 16                |           | 700   |
| 80  | 11     | 1000      | 2000    |        | 80     |              | 20                |           |       |
| 96  | 12     |           |         |        | 96     |              | 24                |           | 1000  |

## What the table shows

1. **Everyone lands on a 4px grain.** The two systems documented around 8px
   (Carbon, Atlassian) still publish 4px steps (`spacing-02`, `space.050`) and
   sub-4 values. Bootstrap's smallest step is 4px.
2. **The shape is the same everywhere.** Steps of 4px up to about 24px, then 8px
   up to 48px, then 16px. No system uses a geometric ratio.
3. **Half steps at 2px and 6px are common.** Seven of ten include a 2px step
   (Carbon, Atlassian, Polaris, Fluent, Primer, Tailwind, Chakra). Six include
   6px (Atlassian, Polaris, Fluent, Primer, Tailwind, Chakra). Fluent says
   explicitly that 2, 6 and 10 exist to align icons to the 4px grid.
4. **Scales are small.** Excluding Tailwind and Chakra, which are open
   multiplier systems, the published steps run from 6 (Bootstrap) to 19
   (Primer). Retro publishes 20.
5. **Five naming styles:**

| Style                 | Examples                                                             | Trade-off                                                             |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Name tracks the value | Polaris (÷ 25), Fluent (÷ 10), Atlassian (percent), Primer, Tailwind | You can read the size from the name. Gaps allow inserts.              |
| Zero-padded index     | Carbon                                                               | Stable if values change. Opaque.                                      |
| T-shirt               | Ant                                                                  | Easy to remember. Needs more names than letters when the scale grows. |
| Small integers        | Bootstrap (0 to 5)                                                   | Compact. Capped.                                                      |
| Multiplier            | Tailwind, Chakra                                                     | Open ended. Tied to one base unit.                                    |

6. **rem is the majority.** Carbon, Atlassian, Polaris, Bootstrap, Tailwind and
   Chakra publish rem. Fluent, Primer and Ant publish px numbers, with Fluent
   noting platform scaling (pt on iOS, dp on Android).
7. **Semantic layers sit over the scale in some systems.**
   - Primer: `stack-gap-*` and `stack-padding-*` by density (condensed, normal,
     spacious), `control-*-paddingInline-*` by size and density. Its guide marks
     control tokens for interactive elements and stack tokens for layout spacing
     as required. A newer changelog entry adds functional spacing `xxs` to `xl`.
   - Ant: `padding*`, `margin*` and `paddingContent*` aliases that read from the
     size scale.
   - Carbon: two scales. Component spacing covers padding inside and between
     components. Layout spacing covers space between sections.
   - Atlassian: three usage ranges: `.0` to `.100` for compact UI, `.150` to
     `.300` for larger components, `.400` to `.1000` for layout.
8. **Tokens do not change with viewport.** Carbon states it directly. Fluent
   suggests changing which step is used per breakpoint instead.
9. **Stacks replace margins.** Carbon, Polaris and Bootstrap steer toward `gap`
   on a parent instead of margin on children (document 04).
10. **Touch targets constrain spacing.** Fluent states minimum targets of 44 by
    44 (iOS and web) and 48 by 48 (Android) and asks designers to size spacers
    to meet them.

## Per-system notes

- **Carbon.** The scale deliberately uses multiples of two, four and eight.
  Percentages and `auto` are allowed alongside tokens. Off-scale values are
  discouraged but possible.
- **Polaris.** Web components accept a middle-out scale (`small-500` to
  `large-500`, centred on `base`) for `padding`, `size` and `gap` props. Layout
  components default to no gap, and you add one explicitly.
- **Atlassian.** Negative space tokens run from `space.negative.025` to
  `space.negative.400` (-2px to -32px). Docs point to the Bleed primitive before
  reaching for them. ESLint rules enforce token use: colour is required, space
  and shape are "strongly recommended".
- **Fluent 2.** Spacing is measured from the bounding box. The ramp is
  multi-platform and used in every component.
- **Primer.** Base sizes include negatives (-2 to -48) for overlap.
- **Ant.** Everything derives from two numbers, `sizeUnit` (4) and `sizeStep`
  (4): `sizeXXS` = 4 × 1, `size` = 4 × 4 = 16, `sizeXXL` = 4 × 12 = 48. Changing
  the seed re-scales every dependent padding and margin token, which is a
  density control.
- **Bootstrap.** `$spacer` is 1rem. The map is 0, .25, .5, 1, 1.5, 3 times the
  spacer. Utilities are `m`/`p` with side letters, and the same map drives
  gutters and `gap-*`.
- **Tailwind.** `--spacing: 0.25rem` is the only input. `p-4` is
  `calc(var(--spacing) * 4)`. A named token cannot be added to this namespace
  without colliding, which the repo's `inlineAlert/styles.ts` already documents.
- **Chakra.** A literal key-to-rem map, so `4` is `1rem`. New keys are added in
  config (`"128": { value: "32rem" }`).

## How `@retrojb/ui` compares

Findings from reading `tokens.css` and the component `styles.ts` files:

- **The name stops tracking the value at 100.** `--spacing-10` to
  `--spacing-100` are 4px to 40px (4px per ten). After that the names jump by a
  hundred while the values keep stepping by 4: 200 is 44px, 300 is 48px, 700 is
  64px, 1000 is 96px. Nothing else in the table does this. Polaris, Fluent and
  Atlassian all keep the name derived from the value.
- **Units are px.** Type is already in rem so that user font-size changes apply
  (WCAG 1.4.4). Spacing stays fixed when a user raises the browser font size,
  which Carbon, Atlassian and Polaris avoid.
- **Two systems are in use side by side.** Containers, alerts, tags, chips,
  checkboxes and tabs use the token form (`p-(--spacing-40)`,
  `gap-(--spacing-20)`). Button, ComboBox and SegmentedControl heights use
  Tailwind numerics (`px-4`, `h-10`, `mt-1`, `h-6`). Both resolve to the same
  pixels today, but only one follows an override of `--spacing-*`.
- **Usage is narrow.** From the matches I could read, components use 0, 10, 20,
  30, 40, 50, 60 and 1000. I did not confirm that 70 to 900 are unused.
- **No sub-4px values.** The scale has no 2px or 6px step.
- **No semantic layer.** `DynamicContainer` defines its own `gap` variants (`xs`
  to `xl`) that map to 10, 20, 30, 40 and 60.

## Sources

- Carbon spacing: https://www.carbondesignsystem.com/elements/spacing/overview/
- Carbon 2x Grid: https://www.carbondesignsystem.com/elements/2x-grid/overview/
- `@carbon/layout` 11.63.0: https://www.npmjs.com/package/@carbon/layout
- Polaris tokens: https://www.npmjs.com/package/@shopify/polaris-tokens
- Polaris web components (middle-out scale):
  https://shopify.dev/docs/api/polaris/using-polaris-web-components
- Atlassian spacing: https://atlassian.design/foundations/spacing
- Fluent 2 layout: https://fluent2.microsoft.design/layout
- Primer base sizes:
  https://github.com/primer/primitives/blob/main/src/tokens/base/size/size.json5
- Primer tokens guide:
  https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md
- Primer changelog: https://github.com/primer/primitives/blob/main/CHANGELOG.md
- Ant Design `genSizeMapToken`, `alias`, `seed`:
  https://github.com/ant-design/ant-design/tree/master/components/theme
- Bootstrap spacing: https://getbootstrap.com/docs/5.3/utilities/spacing/
- Tailwind theme: https://tailwindcss.com/docs/theme
- Chakra spacing: `@chakra-ui/react` 3.38.0 `theme/tokens/spacing`;
  https://chakra-ui.com/docs/theming/customization/spacing
