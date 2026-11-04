---
"@retrojb/ui": patch
"@retrojb/retrojb-storybook": patch
---

Add a `<Name>Spec.yaml` index entry for every component, and rename two
folders and one category so names match the exports.

No component behaviour changes, and every import from `@retrojb/ui` is
unchanged.

- Each spec sits beside its component and is validated against
  `packages/ui/componentSpec.schema.json` by `npm run check:specs`.
- The `interactions` category is now `actions`. `Button` moves to
  `src/components/actions/Button`, and its story title is `Actions/Button`, so
  the docs URL changes from `/docs/interactions-button--docs` to
  `/docs/actions-button--docs`.
- `TabGroup` moves from `src/components/navigation/Tabs` to
  `src/components/navigation/TabGroup`. Its story title is
  `Navigation/TabGroup`, so the docs URL changes from `navigation-tabs` to
  `navigation-tabgroup`.
- The empty `Chip` and `Tag` scaffolds are in `content/chip` and `content/tag`.

Source comments in `styles.ts` that pointed at `interactions/Button/styles.ts`
now point at `actions/Button/styles.ts`. That touches `BrowserAlert`,
`InlineAlert`, `ProgressBar`, `DynamicContainer`, `Icon`, `Table`, `Checkbox`,
`CheckboxGroup`, `ComboBox`, `Input`, `Radio`, `RadioGroup`, `SegmentedControl`,
`Toggle`, `Link`, `Code`, `CodeBlock`, `List`, `Paragraph` and `Reference`, and
the `PageHeading`, `ProductHeading`, `SectionHeading`, `SubHeading` and
`TitleHeading` headings. `Card`, `GraphicCard` and `InteractiveCard` are
covered by their specs, which describe the new `Button` path.

`Chip` and `Tag` are still planned and not exported.
