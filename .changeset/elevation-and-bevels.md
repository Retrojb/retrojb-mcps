---
"@retrojb/tokens": minor
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Add elevation and bevel tokens and their Tailwind utilities.

`@retrojb/tokens` gains `--elevation-0` to `--elevation-6`, two-layer shadows
written once in `base.css`, and six roles: `--elevation-control`,
`--elevation-control-hover`, `--elevation-raised-1`, `--elevation-raised-2`,
`--elevation-overlay` and `--elevation-modal`. Bevels are `--bevel-sm`,
`--bevel-md`, `--bevel-lg` and `--bevel-pressed`. Only the colours differ by
theme (`--elevation-shade-sm`, `-md`, `-lg`, `--bevel-highlight`,
`--bevel-shade`); dark mode uses black at three to four times the light alpha.

`@retrojb/ui` registers the roles as `shadow-control`, `shadow-control-hover`,
`shadow-raised-1`, `shadow-raised-2`, `shadow-overlay` and `shadow-modal`, and
the bevels as `inset-shadow-bevel-sm`, `-md`, `-lg` and `-pressed`, so a bevel
and a role stack on one element. Both sets are always emitted in
`dist/styles.css` and registered with tailwind-merge, and `SHADOW_ROLES` and
`BEVELS` are exported. No component uses them yet.

Storybook gains a Foundations / Elevation page. See
`project-docs/references/ELEVATION.md`.
