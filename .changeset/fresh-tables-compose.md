---
"@retrojb/ui": minor
"@retrojb/docs": patch
---

Add `Table` to `@retrojb/ui`: a composable data table over TanStack Table v9.

The instance is a prop rather than something the component builds. Every
interesting decision about a table — which features are registered, where the
sorting state lives, whether filtering happens on the client or a server —
TanStack already models well, and a wrapper can only obscure it. Build it with
`useTable` and hand it over:

```tsx
const table = useTable({ features, columns, data });

<Table table={table} caption="Open invoices" />;
```

That renders the head, the body and, when a column defines one, the foot. When a
column needs a checkbox or a row needs a click handler, compose the parts
instead — `Table.Head`, `Table.Body`, `Table.Foot`, `Table.Row`,
`Table.HeaderCell`, `Table.Cell` and `Table.Empty`, also exported flat as
`TableHead` and friends. Each renders its children when given any and generates
itself from the instance when not, so `<Table.Head />` above a hand-written body
is a normal thing to write, and a hand-written cell is indistinguishable from a
generated one. Variants are `size`, `align`, `bordered`, `striped`,
`stickyHeader`, `selected` and `captionHidden`; `align` also reads
`columnDef.meta.align`, which is the only way a generated cell can know about it.

`@tanstack/react-table` is a **peer** dependency, pinned to `9.2.4`. The instance
type crosses the package boundary, and two copies in one tree means two
structurally identical types TypeScript will not accept for each other.

The component is generic over v9's `TFeatures`, so it cannot know at compile time
whether sorting or column visibility is registered — it checks at runtime instead,
because v9 puts feature methods on the shared prototypes. A table with
`rowSortingFeature` gets sort buttons; the same component with the same columns
and no sorting feature renders plain header text.

Accessibility decisions live in the component:

- `caption` is a **required** prop, the same call `Input` makes about `label`. A
  table with no caption has no accessible name. `captionHidden` applies `sr-only`
  for designs with no room for the text; it still names the table and still labels
  the scroll region.
- The scroll container is `role="region"` with `tabindex="0"`, named by the
  caption. A horizontally scrolling box that is not focusable cannot be scrolled
  without a pointer (2.1.1), and a table wide enough to scroll is the normal case.
- Sorting is a real `<button>` filling the whole header cell, with `aria-sort` on
  the `<th>` — `"none"` included, so a sortable column is distinguishable from a
  fixed one before activating anything. The direction glyph is `aria-hidden`, and
  exists so direction is not conveyed by colour alone (1.4.1).
- `scope` is chosen from how many columns a cell actually covers, and nested
  columns of uneven depth are merged with `rowSpan` rather than padded with empty
  placeholder cells — a blank `<th>` that is also a sort control is a button with
  no accessible name (4.1.2).
- `selected` tints a row and sets `data-selected`, and announces nothing: ARIA
  supports `aria-selected` on rows inside a `grid`, not inside a `table`. A
  selectable table needs a checkbox in one of its cells, which is also what keeps
  the state off colour alone.

`tableStyle()` is exported as a slot function and is callable from a server
component, for a static table with no instance behind it.

In `apps/docs`, `check:contrast` gains `focus ring on raised` — the table puts a
focus ring on its scroll container and on every sort button, both of which sit on
`--surface-raised` rather than on the page or on `--surface`. It passes at 5.98:1
and 7.59:1. Every other pairing the table introduces was already checked under
another name.
