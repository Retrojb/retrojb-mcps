---
"@retrojb/retrojb-storybook": patch
"@retrojb/docs": patch
---

Storybook now runs its own Tailwind build, and every story uses utility
classes on the design tokens instead of inline `style` objects.

The preview's `preview.css` is a Tailwind entry set up as
`packages/ui/README.md` documents for an app with its own Tailwind build, run
by a new `postcss.config.mjs`. Before this, a utility in a story only worked if
a library component happened to use the same one. Raw rem values in the old
inline styles are now on the space scale, opacity-dimmed text is now
`text-foreground-muted`, and the typography tokens page samples each role with
its own `text-<role>` utility.

Both this build and the docs site's now also scan `packages/ui/src`. A second
Tailwind stylesheet after `@retrojb/ui/styles.css` could otherwise emit
`border` after the library's `border-s-4`, which turned every alert's 4px tone
bar into a 1px border. The `@retrojb/ui` README's setup gains that `@source`
line and explains it.
