---
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Add `Strong` and `Emphasis`, two inline typography components that render
`<strong>` (importance, in bold) and `<em>` (stress, in italic) inside running
text. They set only weight and slant and inherit colour, size and line height,
and `strongStyles` and `emphasisStyles` are callable from a server component.
The Storybook app gains their docs pages and stories, and the typography
accessibility page gains a "Strong and Emphasis" section.

In Storybook docs, markdown `**bold**` and `*italic*` now render as `Strong` and
`Emphasis` (new `DocStrong` and `DocEmphasis` blocks in the docs components).
