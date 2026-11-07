---
"@retrojb/tokens": minor
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Add the `--space-*` scale, density modes and control-height tokens, and move
every component onto them.

`@retrojb/tokens` gains `--space-0` to `--space-10` (rem) and
`--control-height-xs` to `--control-height-lg` (24 to 48px). Set
`data-density="compact"`, `"comfort"` or `"spacious"` on `<html>` or on any
element to change the space scale inside it; comfort is the default. Density
changes spacing only, so control heights and target sizes are unchanged. The
old `--spacing-*` tokens remain as deprecated aliases and will be removed in a
later breaking release. See `project-docs/references/SPACING.md`.

In `@retrojb/ui`, padding, gaps and margins use `--space-*`, control heights
use `--control-height-*`, and helper-text indents are a `calc()` of the control
and its gap, so they follow density. Components updated: `Button`, `Input`,
`ComboBox`, `SearchBox`, `Table`, `SegmentedControl`, `Chip`, `Tag`,
`TabGroup`, `Checkbox`, `CheckboxGroup`, `Radio`, `RadioGroup`, `Toggle`,
`Icon`, `ProgressBar`, `InlineAlert`, `ToastAlert`, `BrowserAlert`, `Card`,
`InteractiveCard`, `GraphicCard`, `DynamicContainer`, `List`, `ListItem`,
`Code`, `CodeBlock` and `Reference`.

Visual changes at the default density, from snapping off-scale values to the
4px scale: `Input`, `ComboBox` and `SearchBox` have an 8px label gap (was 6px)
and 8px leading padding at `sm` (was 10px). `Table` `sm` cells have 8px inline
padding (was 10px), `md` cells 12px block padding (was 10px, so rows are 46px,
were 42px), and the sort icon gap is 8px (was 6px).

Storybook gains a Density toolbar and a Foundations / Spacing page. The
InlineAlert, ToastAlert and BrowserAlert stories no longer depend on Tailwind
classes that were never compiled.
