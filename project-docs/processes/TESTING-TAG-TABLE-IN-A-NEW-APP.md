# Testing Tag and Table in a new application

How to pull `@retrojb/ui` into a fresh app and verify the sentiment `Tag` tints
and the `Table` `divided` variant render and pass their accessibility checks
after a deploy. Written for someone consuming the library, not developing it.

- [What shipped in this change](#what-shipped-in-this-change)
- [Prerequisites](#prerequisites)
- [Install and wire up the styles](#install-and-wire-up-the-styles)
- [Verify Tag](#verify-tag)
- [Verify Table](#verify-table)
- [Accessibility checks](#accessibility-checks)
- [Troubleshooting](#troubleshooting)

## What shipped in this change

Two component changes and the tokens behind them:

- **Tag sentiment tints.** `neutral`, `info` and `success` now fill with a soft
  tint ([`--tag-neutral-surface`][tokens], `--tag-info-surface`,
  `--tag-success-surface`) instead of sitting on `--surface-base`. `danger`
  still fills saturated and reverses to `--danger-foreground`. The sizes moved
  up a step: `sm` uses the `label-md` type role and `md` uses `label-lg`.
- **Table `divided` variant.** A boolean that draws the horizontal rules between
  body rows. It defaults to `true`, so an existing table is unchanged; pass
  `divided={false}` for a borderless table. The sort chevron on start-aligned
  columns is also pushed to the trailing edge.

The measured contrast ratios for both now live in the component spec files
([`TagSpec.yaml`][tagspec], [`TableSpec.yaml`][tablespec]) rather than in code
comments. The build-time `check:contrast` script is what enforces them.

## Prerequisites

The library is a set of workspace packages, all at `0.0.0` and not published to
npm (see [`RELEASE.md`][release]). A new app consumes them one of two ways:

- **Inside this monorepo.** Add `"@retrojb/ui": "*"` to the app's
  `package.json`, run `npm install` at the repo root, and Turborepo resolves it
  to the local copy.
- **Outside the monorepo.** Pack the built package with `npm pack` from
  `packages/ui` and install the resulting tarball, or point at a tarball your CI
  produces. The package ships `dist/` and `src/styles`, so build it first with
  `npx turbo build --filter=@retrojb/ui`.

Peer dependencies the app must provide, pinned to the versions the library is
built against:

| Peer                    | Version |
| ----------------------- | ------- |
| `react`                 | 19.2.8  |
| `react-dom`             | 19.2.8  |
| `@tanstack/react-table` | 9.2.4   |

`@tanstack/react-table` is only needed if the app uses `Table`. `Tag` has no
peer requirement beyond React.

## Install and wire up the styles

The components are styled with Tailwind classes that resolve against CSS custom
properties. An app gets those properties and the compiled utilities by importing
the package's two style entry points once, at the app root:

```ts
// Compiled utilities and the component CSS.
import "@retrojb/ui/styles.css";
// The token-to-Tailwind variable mapping, including the new tag tints.
import "@retrojb/ui/theme.css";
```

Without `theme.css` the `--color-tag-*-surface` variables are undefined and the
tints fall back to the light-mode hex values baked in as defaults, so a tag
still renders but dark mode will not switch. Import both.

Dark mode follows the `@retrojb/tokens` light and dark sheets. If the app does
not already load them, the tag tints resolve through the fallbacks in
`theme.css` and will not react to a theme switch. Load the tokens package the
same way the docs app does.

## Verify Tag

Render one tag per tone and confirm each fills with its tint and the text stays
legible:

```tsx
import { Tag } from "@retrojb/ui";

export function TagCheck() {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Tag text="Neutral" tone="neutral" />
      <Tag text="Info" tone="info" />
      <Tag text="Success" tone="success" />
      <Tag text="Danger" tone="danger" />
      <Tag text="Large" tone="info" size="md" />
    </div>
  );
}
```

What to look for:

- `neutral`, `info` and `success` each sit on a soft tinted fill, not a flat
  grey surface. `danger` is a solid saturated fill with reversed text.
- Toggle the app between light and dark. The three tints change value; the text
  stays readable in both.
- `size="md"` is visibly larger type than the default `sm`.
- The label text is always present. A tag never signals by colour alone.

## Verify Table

Build a small TanStack instance and render it. The `divided` rules are on by
default, so first confirm the default, then confirm `divided={false}` removes
the row rules:

```tsx
import { Table } from "@retrojb/ui";
import { useTable } from "@tanstack/react-table";

const columns = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "amount", header: "Amount" },
];
const data = [
  { name: "Ada", amount: 42 },
  { name: "Grace", amount: 7 },
];

export function TableCheck() {
  const table = useTable({ features: {}, columns, data });
  return (
    <>
      <Table table={table} caption="Default (divided)" />
      <Table table={table} caption="Borderless" divided={false} />
    </>
  );
}
```

What to look for:

- The first table has a horizontal rule under the header and between each body
  row. The last row has no trailing rule against the container edge.
- The second table has the header rule but no rules between body rows.
- On a start-aligned sortable column, the sort chevron sits at the column's
  trailing edge rather than next to the label.
- The whole table is inside a focusable scroll region: tab to it and the border
  shows a focus ring.

## Accessibility checks

The library verifies its own palette at build time. After deploying, run the
same check from the docs app to confirm the deployed tokens still pass:

```sh
npm run check:contrast --workspace apps/docs
```

A pass prints `All meet WCAG 2 level AA` and lists the three tag pairings:
`tag neutral text on tint`, `tag info text on tint`, `tag success text on tint`.
This reads the token sources directly, so it measures what ships, not a copy.

In the app itself, check the two things the automated script cannot:

- **Tag.** Confirm meaning is never carried by tone alone. Every tag has text
  stating its category or outcome.
- **Table selection.** The selected-row tint is a composited colour and is
  deliberately not a sufficient cue on its own. A selectable table must put a
  checkbox or radio in the row, because `aria-selected` is not valid on a
  `table` row. Verify selection is announced by that control, not the tint.

The measured ratios behind both are documented in [`TagSpec.yaml`][tagspec] and
[`TableSpec.yaml`][tablespec] under `accessibility.notes`.

## Troubleshooting

- **Tints do not switch with dark mode.** `theme.css` or the `@retrojb/tokens`
  sheets are not imported. Tints render from the light-mode fallbacks until both
  are loaded.
- **Tags render unstyled or as plain text.** `@retrojb/ui/styles.css` is not
  imported, so the Tailwind utilities are absent.
- **Table throws on render.** `@tanstack/react-table` is missing or at the wrong
  version. It is a peer dependency pinned to 9.2.4.
- **The header rule disappears when `bordered` is on.** This is the
  tailwind-merge group collision the side-scoped classes guard against. If a
  caller overrides the header cell class with a blanket `border-<color>`, scope
  it to a side (`border-b-*`) instead.

---

author: John Baltes

updated: 2026-11-16

---

[tokens]: ../../packages/tokens/src/light.css
[tagspec]: ../../packages/ui/src/components/content/tag/TagSpec.yaml
[tablespec]: ../../packages/ui/src/components/data/Table/TableSpec.yaml
[release]: ./RELEASE.md
