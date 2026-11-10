---
"@retrojb/ui": patch
"@retrojb/docs": patch
---

Fix three layout bugs found while building the page grid and cleaning up the
docs site.

- `Card`, `GraphicCard` and `InteractiveCard` no longer overflow their
  container. The root is `w-full` and carries the content padding, and without
  a preflight reset its `box-sizing` was `content-box`, so every card was its
  container's width plus padding and border (34px at the default density). The
  root is now `box-border`. Cards in a constrained container render 34px
  narrower than before, which is their intended width.
- `Table`'s scroll container is now `relative`, so an absolutely positioned
  `sr-only` label inside a cell stays inside the scroll clip instead of widening
  the page.
- `ComboBox` and `SearchBox` popups clear the browser's default 40px list
  indent (`ps-0`), so options line up with the popup edge.

The docs site's `table-demo.tsx` lint error is fixed by declaring the column
meta as a typed constant, which keeps the `meta.align` type check that the
lint auto-fix would have removed.
