---
"@retrojb/tokens": minor
"@retrojb/ui": minor
---

Add `CodeSnippet`, a code block with chrome: an optional header (file name and
language), a copy button, and bring-your-own syntax highlighting over a
keyboard-focusable scroll region.

Highlighting is bring-your-own: the component ships no language grammars and
parses nothing. A caller runs its own highlighter, tags each run with one of
five sentiments (`positive`, `negative`, `special`, `emphasis`, `neutral`), and
passes the result as `lines`; the component paints each run with the matching
`text-code-*` colour. `code` is always required and is the single source of
truth for the copy button, so the clipboard carries the real source and never
any highlight markup. The copy button is a native `<button>` with a visible
text label (not an icon alone) and announces its result through an `aria-live`
region. `CodeSnippet`, `codeSnippetStyles`, `ICodeSnippetProps`,
`CodeSnippetVariants`, `ICodeToken` and `CodeSentiment` are exported from
`@retrojb/ui`.

`@retrojb/tokens` gains the five code-highlight sentiment colours
(`--code-positive`, `--code-negative`, `--code-special`, `--code-emphasis`,
`--code-neutral`) in light and dark, each solved for 4.5:1 on `--surface-sunken`
(the code well). `@retrojb/ui` surfaces them as `text-code-*`, `bg-code-*` and
`border-code-*` utilities.
