---
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Add `Chip`, a small toggle button for filter-style selection. It renders one
native `<button type="button">` with `aria-pressed`, shows a check icon when
selected, and takes `selected`, `defaultSelected` and `onSelectedChange` for
controlled and uncontrolled use. Sizes `sm` (24px) and `md` (32px). There is no
`onRemove` and no `ChipGroup`; wrap a set of chips in a named `role="group"`.
`Chip`, `chipStyles`, `IChipProps` and `ChipVariants` are exported from
`@retrojb/ui`. Storybook gains the `Chip` stories, docs page and accessibility
page.
