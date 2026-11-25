---
"@retrojb/tokens": minor
"@retrojb/ui": minor
"@retrojb/docs": patch
---

BREAKING: the radius tokens are renamed from `--radius-*` to
`--border-radius-*` (`--border-radius-none`, `-xs`, `-sm`, `-md`, `-lg`,
`-circle`), so they no longer share names with Tailwind's own `--radius-xs` to
`--radius-lg`. The shared names made the result depend on stylesheet order: in
an app with its own Tailwind build, Tailwind's values won and radii rendered at
half size.

`@retrojb/ui`'s `theme.css` now maps Tailwind's `--radius-xs` to `--radius-lg`
onto the new tokens and adds `rounded-circle`, so `rounded-sm` is 8px wherever
`theme.css` is imported, whatever the load order. `Code` uses `rounded-xs`, and
`rounded-circle` is registered with tailwind-merge.

Migrating: replace `var(--radius-xs)` and the rest with
`var(--border-radius-xs)`, and move any override of `--radius-*` to
`--border-radius-*`. Apps that import `@retrojb/ui/theme.css` can keep reading
`var(--radius-sm)`, which now resolves to the token. Apps that imported
`@retrojb/tokens` a second time after Tailwind's theme to win the radius values
can drop that import; the docs site has.
