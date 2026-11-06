# Foundations research: elevation, spacing, grid and layout

Research date: 5 November 2026. Prepared for `@retrojb/ui` (`../../../packages/ui`).

> `../../../temp` is listed in `.gitignore` and `.npmignore`, so none of these files are committed or published. Move anything worth keeping into `project-docs/` before it is lost.

## Documents

| File | What it covers |
|---|---|
| `foundations-01-box-shadow-buttons-and-tokens.md` | The first research pass: how box shadows fit this repo, a proposed token structure, and how to apply it to Button and other components. |
| `foundations-02-elevation-comparison.md` | How ten systems define elevation and shadow tokens, with values. |
| `foundations-03-spacing-comparison.md` | Spacing scales, base units and naming across the same ten, with a px-aligned comparison table. |
| `foundations-04-grid-and-layout-comparison.md` | Grids, breakpoints, containers, layout primitives and z-index layers. |
| `foundations-05-patterns-and-recommendations.md` | Cross-system patterns, gaps in `@retrojb/ui`, and proposals with open decisions. |
| `foundations-06-implementation-plan.md` | Review of the feedback on document 05, arguments against specific decisions, and a phased implementation plan. |

## The ten systems

1. Material Design 3 (Google)
2. Carbon (IBM)
3. Polaris (Shopify)
4. Atlassian Design System
5. Fluent 2 (Microsoft)
6. Primer (GitHub)
7. Ant Design
8. Bootstrap 5
9. Tailwind CSS 4
10. Chakra UI 3

Selection is a judgment call, not a measured popularity ranking. I picked a mix of the best-documented enterprise design systems and the most widely used component or utility libraries. Notable omissions: Apple HIG (little public token detail), MUI (it follows the Material lineage but I did not check its own tokens), Radix Themes and shadcn/ui.

## How the values were gathered

Where possible I read the published token source rather than prose docs, because prose and shipped values drift.

| System | Source read | Version or state |
|---|---|---|
| Polaris | `@shopify/polaris-tokens` CSS output | 9.4.2 |
| Ant Design | `antd` `es/theme` source | 6.7.0 |
| Carbon | `@carbon/layout` and `@carbon/styles` SCSS, plus 2x Grid and spacing docs | 11.63.0 and 1.119.0 |
| Atlassian | `@atlaskit/tokens` default values, plus elevation and spacing docs | 20.9.0 |
| Chakra | `@chakra-ui/react` theme tokens | 3.38.0 |
| Primer | `primer/primitives` JSON5 token source | `main` |
| Tailwind | `tailwindcss` `theme.css` and docs | `main`, 4.x |
| Bootstrap | 5.3 docs | 5.3 |
| Fluent 2 | fluent2.microsoft.design pages | live docs |
| Material 3 | `@material/web` elevation SCSS, Android window size class docs, one secondary teardown | 2.5.0 |

## What I could not verify

- **Material 3 spacing and grid columns.** m3.material.io is client-rendered and the fetch tool returned no content. Window size classes come from the Android docs. Column counts and margins for M3 are not covered.
- **Material 3 level-to-component mapping.** Only the dp values (0, 1, 3, 6, 8, 12) and the tonal-elevation approach are confirmed, via a secondary source and snippets from the official page.
- **Fluent 2 low-ramp formula.** The page text repeats the same parameters for both shadow layers, so I do not quote an exact per-layer split.
- **Carbon shadow consumers.** I found its shadow token and utility values but did not map every component that uses them.
- **Atlassian grid and Primer breakpoints.** Not researched. Atlassian layout is covered only through spacing, elevation and z-index.
- **Tailwind `shadow-<colour>` and opacity modifiers on `var()`-based shadow tokens.** Noted in document 01 as untested against Tailwind 4.3.3.

Short phrases from sources are paraphrased. Source URLs are listed at the end of each document.
