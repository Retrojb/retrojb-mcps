# @retrojb/ui

Shared React primitives for the apps in this repo. Tailwind CSS v4 for the
styling engine, [`tailwind-variants`](https://www.tailwind-variants.org) for the
variant API, `tsup` for the build.

Four components so far: `Button`, `Link`, `Input`, `Table`.

## Structure

A component is a directory, not a file. `Button` is the template:

```
src/components/
  interactions/Button/
    Button.tsx    the React layer, and the only file with "use client"
    styles.ts     the tv() definition — buttonStyle, ButtonVariants
    types.ts      the props interface — IButtonProps
    index.ts      the barrel
  navigation/Link/
  forms/Input/
  data/Table/
    Table.tsx     the root, plus the Table.Head / Table.Cell namespace
    parts.tsx     the composable parts
    context.ts    the instance and shared variants, shared with the parts
    styles.ts     tableStyle, TableVariants
    types.ts      ITableProps and one interface per part
    index.ts      the barrel
```

`Table` is the one component that is more than four files. Everything extra is
there because it is composite: `parts.tsx` holds the seven subcomponents,
`context.ts` is how they reach the table instance without every caller passing
it down by hand. The rules below still apply to all of them.

Four files rather than one because of the `"use client"` boundary described
under [Server and client components](#server-and-client-components): the
directive has to sit on the React module alone, or the variant function stops
being callable from server code. `types.ts` is separate from `styles.ts` because
the props interface extends the variant props, so keeping them apart is what
stops that from being a cycle.

Two conventions worth knowing before adding a fourth component:

- `styles.ts` imports `tv` from `../../../lib/tv.js`, not from
  `tailwind-variants` directly. The local instance is configured with the
  `radius` scale; the bare one is not, and the symptom of getting this wrong is
  `<Button className="rounded-full">` quietly not rounding. See `lib/tv.ts`.
- Relative imports carry an explicit `.js` extension, and nothing imports a
  directory. `tsc` is set to `NodeNext` resolution here specifically so both
  rules are enforced at compile time rather than discovered by whoever next runs
  Storybook.

## Usage

Import the stylesheet once, at the app's entry point. It is not imported from
the JS module, because a JS import does not reliably pull CSS through every
bundler.

```tsx
// app/layout.tsx
import "@retrojb/ui/styles.css";
```

Then use the components:

```tsx
import { Button, Input, Link } from "@retrojb/ui";

<Button intent="primary" size="md" text="Save" />
<Link href="/docs">Read the docs</Link>
<Input label="Email" type="email" description="We never share it." />
```

`Button` takes its label as a `text` prop rather than children. `Link` and
`Input` take children and a `label` respectively.

### Table

`Table` renders a TanStack Table v9 instance. It does not build one — which
features a table registers, where its sorting state lives, whether filtering
happens here or on a server are all decisions TanStack models well and a wrapper
can only obscure. `@tanstack/react-table` is a **peer** dependency for the same
reason the instance is a prop: its type crosses this boundary, and two copies in
one tree means two structurally identical types that TypeScript will not accept
for each other.

```tsx
import { Table } from "@retrojb/ui";
import { tableFeatures, useTable } from "@tanstack/react-table";

const features = tableFeatures({}); // module scope: it has to be stable

const Invoices = ({ data }: { data: Invoice[] }) => {
  const table = useTable({ features, columns, data });

  return <Table table={table} caption="Open invoices" striped />;
};
```

That renders the head, the body, and the foot when a column defines a `footer`.

When a column needs a checkbox or a row needs a click handler, compose the
parts. Each one renders its children when given any and generates itself from
the instance when not, so mixing the two is normal:

```tsx
<Table table={table} caption="Open invoices">
  <Table.Head />

  <Table.Body>
    {table.getRowModel().rows.map((row) => (
      <Table.Row key={row.id} selected={row.getIsSelected()}>
        {row.getVisibleCells().map((cell) => (
          <Table.Cell key={cell.id} cell={cell} />
        ))}
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

The parts are `Table.Head`, `Table.Body`, `Table.Foot`, `Table.Row`,
`Table.HeaderCell`, `Table.Cell` and `Table.Empty`, also exported flat as
`TableHead` and friends for when one has to be passed somewhere or wrapped.

`caption` is required — see [Accessibility](#accessibility). Variants are
`size`, `bordered`, `striped`, `stickyHeader` and `captionHidden` on the table,
`align` on a cell and `selected` on a row. `align` is also read from the column
definition, which is the only way a generated cell can know about it:

```ts
const features = tableFeatures({
  columnMeta: {} as { align?: "start" | "center" | "end" },
});

helper.accessor("amount", { header: "Amount", meta: { align: "end" } });
```

The component is generic over v9's `TFeatures`, so it cannot know at compile
time which features a caller registered — it checks at runtime instead, because
v9 puts feature methods on the shared prototypes. A table with
`rowSortingFeature` gets sort buttons and `aria-sort`; the same component with
the same columns and no sorting feature renders plain header text.

### Variant functions

Every component also exports its variant function — `buttonStyle`, `linkStyle`,
`inputStyle`, `tableStyle` — for styling an element this package does not own:

```tsx
import NextLink from "next/link";
import { linkStyle } from "@retrojb/ui";

// Client-side routing, library styling.
<NextLink href="/docs" className={linkStyle({ intent: "standalone" })}>
  Docs
</NextLink>;
```

`inputStyle` is a slot function: `inputStyle().control()` for the element,
`.root()`, `.label()`, `.description()` and `.error()` for the markup around it.
`tableStyle` is the same, with a slot per element — `.root()`, `.table()`,
`.caption()`, `.headerCell()`, `.cell()` and the rest — for a small static table
with no TanStack instance behind it.

## Theming

The palette is a set of plain custom properties — `--background`,
`--foreground`, `--accent`, `--border-strong` and so on — which `@theme` maps
into Tailwind's `--color-*` namespace. Utilities compile to
`var(--color-accent)`, which resolves through to `var(--accent)` at paint time,
so overriding the token retints every component with no rebuild of this package:

```css
:root {
  --accent: #6d28d9;
}
```

The defaults ship in `dist/styles.css` inside `@layer theme`, and unlayered CSS
wins over layered CSS, so an app's own `:root` block overrides them without
`!important` or a specificity fight. `apps/docs` already declares these tokens,
so it retints this package automatically and its `npm run check:contrast` stays
the authority on the palette.

Apps running their own Tailwind build can import just the token mapping to get
the same utilities in their own markup:

```css
@import "@retrojb/ui/theme.css";
```

## Accessibility

The parts that are easy to get wrong are decided here rather than left to each
call site:

- `Input` takes a **required** `label`. An unlabelled input is the most common
  WCAG failure there is, so the type checker catches it instead of an audit.
  `labelHidden` covers designs with no room for visible label text — the label
  stays in the accessibility tree.
- `Input` wires `htmlFor`, `aria-describedby` and `aria-invalid` from generated
  `useId` values, and passing `error` is the only way to get the invalid
  styling, so the visual state cannot drift from the announced one.
- `Link intent="inline"` is underlined and cannot be talked out of it. A link
  distinguished from body text by colour alone fails 1.4.1 at this palette's
  contrast.

- `Link external` sets `target`/`rel` and appends a visually hidden "(opens in a
  new tab)" to the accessible name (3.2.5).
- `Table` takes a **required** `caption`, for the same reason `Input` requires a
  `label`: a table without one has no accessible name. `captionHidden` covers
  designs with no room for the text.
- `Table` wraps itself in a focusable `role="region"` named by that caption. A
  horizontally scrolling container that is not focusable cannot be scrolled
  without a pointer (2.1.1), and a table wide enough to scroll is the normal
  case.
- `Table` sorting is a real `<button>` filling the whole header cell, with
  `aria-sort` on the `<th>` and a glyph for the direction, so the state is both
  announced and drawn (1.4.1, 4.1.2). `scope` follows how many columns a cell
  actually covers, and uneven column trees merge with `rowSpan` rather than
  rendering blank placeholder cells.
- One focus indicator across all four components: a 2px `outline` with a 2px
  offset on `:focus-visible` (2.4.7, 2.4.13). An `outline` rather than a `ring`
  box-shadow, because outlines survive forced-colors mode.
- Contrast ratios for every token pair are recorded in `src/styles/tokens.css`,
  and the pairings these components introduce — button labels on their fills,
  input text, borders and focus rings — are gated by
  `npm run check:contrast --workspace=@retrojb/docs`, which uses the engine from
  `@retrojb/wcag-a11y-scanner`. If you change a colour, run it.

Colour is never the only signal for a state: the invalid input changes its
border as well as showing a message, disabled controls change cursor as well as
opacity, and a sorted column shows a glyph as well as `aria-sort`. A selected
table row is the one case the package cannot close on its own — ARIA has no
`aria-selected` for a row inside a `table`, only inside a `grid` — so a
selectable table needs a checkbox in one of its cells, and `Table`'s tint is
documented as insufficient without one.

## Scripts

| Script                | What it does                                    |
| --------------------- | ----------------------------------------------- |
| `npm run build`       | Compiles JS, then declarations and `styles.css` |
| `npm run dev`         | Same, in watch mode                             |
| `npm run build:css`   | Compiles `dist/styles.css` only                 |
| `npm run build:types` | Emits `.d.ts` only                              |
| `npm run lint`        | ESLint, warnings are errors                     |
| `npm run check-types` | `tsc --noEmit`                                  |

## Server and client components

All four components are client modules — `Input` and `Table` call `useId`, and
`Table` also holds a context. The variant functions are not, and the split is
deliberate: `"use client"` marks everything a module exports as client-only, so
had `linkStyle()` lived in `Link.tsx` it could not be called from a server
component, which is the default in App Router and where the
`<NextLink className={linkStyle()}>` example above normally sits.

So each component directory splits in two: `styles.ts` holds the class-name
logic with no directive, `<Name>.tsx` holds the React layer with one. Both are
re-exported through the directory's `index.ts` and then from the package root,
so this works from a server component:

```tsx
import { linkStyle } from "@retrojb/ui"; // fine on the server
```

A barrel does not collapse the boundary — `index.ts` carries no directive of its
own, and importing a client module from server code is allowed; it is _calling_
an export of one that is not.

## Notes on the build

`tsup` compiles the JS, one output file per source module rather than a bundle.
A bundle would be a single module with a single directive, which is what would
collapse the boundary described above; esbuild preserves per-file directives
when it is not bundling. It also means Next.js ships only the components an app
actually imports to the client.

Because there is no bundle, the `entry` list in `tsup.config.ts` has to name
every source file, and its component globs are recursive for that reason. A
single-level glob matches nothing inside `components/<group>/<Name>/`, and the
failure is quiet in a way worth knowing about: tsup reports success and `tsc`
still emits the declarations, so the package type-checks while `dist/index.js`
imports JavaScript that was never written. It surfaces as
`Failed to resolve import` in the consuming app, not as a build error here.

Declarations come from `tsc --emitDeclarationOnly` rather than tsup's `dts`
step, which injects a `baseUrl` that TypeScript 6 rejects outright. The
stylesheet is compiled by the Tailwind CLI. Both run from tsup's `onSuccess`, so
watch mode keeps all three artifacts in step.

`treeshake` is off, because it routes the output through Rollup, which strips
module-level directives. Consumers' bundlers tree-shake this package anyway.
