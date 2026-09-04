---
"@retrojb/retrojb-storybook": minor
"@retrojb/ui": patch
---

Add per-component accessibility documentation to Storybook.

The WCAG reasoning behind each component was only readable as comments in
`styles.ts`. It is now a docs page per component, under
`src/stories/<category>/accessibilityDocs`, covering the criteria each component
satisfies, the measured contrast ratio for every pairing it renders, and the aria
each one does and does not set:

- `Interactions/Button/Accessibility`
- `Navigation/Link/Accessibility`
- `Forms/Input/Accessibility`

Ratios are the measured output of
`npm run check:contrast --workspace=@retrojb/docs`, not transcribed by hand, so
they stay checkable against the palette the package ships.

Enables `remark-gfm` in the docs addon. MDX parses CommonMark, where tables are
not included, so the ratio tables would otherwise have rendered as paragraphs of
literal `|` characters.

One claim did not survive being written down: the comment in `Button`'s
`styles.ts` said the two larger sizes cleared the 44px AAA target in 2.5.5, but
`md` is 40px. Only `lg` clears it. Corrected in the component comments and on the
docs site alongside the new pages.

Tailwind's `@source` list now includes `components/**/*.ts`. The class strings
moved into `styles.ts` when components became directories, and only automatic
source detection was still finding them — which holds when the CLI runs from the
package root and not otherwise.
