---
"@retrojb/ui": patch
---

`Button` now follows the TSDoc standard in `../project-docs/references/TSDOC.md`. Every prop
of `IButtonProps` has a description, and `intent`, `size`, `fullWidth` and
`type` are redeclared with their defaults so editors and Storybook show them.
The custom props (`text`, `intent`, `size`, `fullWidth`) are now `readonly`,
which is a type-only change and does not affect callers. The note on why
`buttonStyle` lives outside the client module moved from a file header into the
function's doc comment.
