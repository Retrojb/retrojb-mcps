---
"@retrojb/tokens": minor
"@retrojb/ui": minor
"@retrojb/docs": patch
"@retrojb/retrojb-storybook": patch
---

Add six surface levels and two scrim tokens.

`@retrojb/tokens` gains `--surface-sunken`, `--surface-base`,
`--surface-raised-1`, `--surface-raised-2` and `--surface-overlay`, which sit on
`--background` to make six levels. In dark mode each level is a step lighter;
in light mode the three top levels are white and are told apart by border.
`--surface-sunken` is a step darker than `--surface-base` in both themes.
`--scrim-sm` and `--scrim-md` tint the page behind an overlay. `--surface` and
`--surface-raised` remain as deprecated aliases of `--surface-base` and
`--surface-raised-1`.

`@retrojb/ui` registers `bg-surface-sunken`, `bg-surface-base`,
`bg-surface-raised-1`, `bg-surface-raised-2`, `bg-surface-overlay`,
`bg-scrim-sm` and `bg-scrim-md`, and every component now uses the new names.
The values are the same, so nothing changes visually except one fix:
`BrowserAlert`'s backdrop is now `--scrim-md`. It was `--neutral-9` at 60%,
which is near-white in the dark theme and lightened the page behind the dialog
instead of dimming it.

Components renamed to the new surface tokens: `Button`, `BrowserAlert`,
`InlineAlert`, `ToastAlert`, `ProgressBar`, `Card`, `GraphicCard`,
`InteractiveCard`, `Chip`, `Icon`, `Tag`, `Table`, `Checkbox`,
`CheckboxGroup`, `ComboBox`, `Input`, `Radio`, `RadioGroup`,
`SegmentedControl`, `Toggle`, `TabGroup`, `Code`, `CodeBlock`, `List`,
`Paragraph`, `Reference` and the heading components.

`check:contrast` in `@retrojb/docs` now measures text and boundaries on all six
levels (290 pairings). The docs site and Storybook use the new token names.
