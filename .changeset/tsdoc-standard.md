---
"@retrojb/ui": patch
---

Add TSDoc linting with `eslint-plugin-tsdoc` and a custom `@a11y` tag
(`packages/ui/tsdoc.json`). The standard is in `../project-docs/references/TSDOC.md`.

Two comments failed the new check and were fixed, with no change to behaviour:
`BrowserAlert` props no longer use the undefined `@description` tag, and a
`ProductHeading` code span that wrapped across two lines is rewrapped.
