---
"@retrojb/retrojb-storybook": patch
"@retrojb/ui": patch
---

Add a component docs page template (`apps/retrojb-storybook/templates/Component.mdx`)
and the first page built from it, `Button.mdx`. The page takes its summary and
prop table from TSDoc and its status, guidance, accessibility and exports from
`ButtonSpec.yaml`.

Storybook now reads the library's TSDoc: docgen is `react-docgen-typescript`,
and `@retrojb/ui` resolves to its source inside Storybook, so every docs page
shows prop descriptions and unions. Stories run against source instead of the
built package; `@retrojb/ui/styles.css` still comes from `dist`.

`Button` stories gain `Intents`, `Sizes`, `FullWidth` and `Disabled`, and
`Button.stories.ts` is now `Button.stories.tsx`. `Button` props use `@default`
for defaults, since Storybook's docgen ignores `@defaultValue`.

The facts row at the top of each docs page (`DocSpecFacts`) now draws status,
complexity, category and version as `Tag`s, with the status toned: shipped
success, experimental info, deprecated danger, planned and stub neutral.
