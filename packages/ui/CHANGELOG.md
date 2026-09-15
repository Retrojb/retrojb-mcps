# @retrojb/ui

## 0.1.0

### Minor Changes

- f481b49: Add `Table` to `@retrojb/ui`: a composable data table over TanStack
  Table v9.

  The instance is a prop rather than something the component builds. Every
  interesting decision about a table — which features are registered, where the
  sorting state lives, whether filtering happens on the client or a server —
  TanStack already models well, and a wrapper can only obscure it. Build it with
  `useTable` and hand it over:

  ```tsx
  const table = useTable({ features, columns, data });

  <Table table={table} caption="Open invoices" />;
  ```

  That renders the head, the body and, when a column defines one, the foot. When
  a column needs a checkbox or a row needs a click handler, compose the parts
  instead — `Table.Head`, `Table.Body`, `Table.Foot`, `Table.Row`,
  `Table.HeaderCell`, `Table.Cell` and `Table.Empty`, also exported flat as
  `TableHead` and friends. Each renders its children when given any and
  generates itself from the instance when not, so `<Table.Head />` above a
  hand-written body is a normal thing to write, and a hand-written cell is
  indistinguishable from a generated one. Variants are `size`, `align`,
  `bordered`, `striped`, `stickyHeader`, `selected` and `captionHidden`; `align`
  also reads `columnDef.meta.align`, which is the only way a generated cell can
  know about it.

  `@tanstack/react-table` is a **peer** dependency, pinned to `9.2.4`. The
  instance type crosses the package boundary, and two copies in one tree means
  two structurally identical types TypeScript will not accept for each other.

  The component is generic over v9's `TFeatures`, so it cannot know at compile
  time whether sorting or column visibility is registered — it checks at runtime
  instead, because v9 puts feature methods on the shared prototypes. A table
  with `rowSortingFeature` gets sort buttons; the same component with the same
  columns and no sorting feature renders plain header text.

  Accessibility decisions live in the component:

  - `caption` is a **required** prop, the same call `Input` makes about `label`.
    A table with no caption has no accessible name. `captionHidden` applies
    `sr-only` for designs with no room for the text; it still names the table
    and still labels the scroll region.
  - The scroll container is `role="region"` with `tabindex="0"`, named by the
    caption. A horizontally scrolling box that is not focusable cannot be
    scrolled without a pointer (2.1.1), and a table wide enough to scroll is the
    normal case.
  - Sorting is a real `<button>` filling the whole header cell, with `aria-sort`
    on the `<th>` — `"none"` included, so a sortable column is distinguishable
    from a fixed one before activating anything. The direction glyph is
    `aria-hidden`, and exists so direction is not conveyed by colour alone
    (1.4.1).
  - `scope` is chosen from how many columns a cell actually covers, and nested
    columns of uneven depth are merged with `rowSpan` rather than padded with
    empty placeholder cells — a blank `<th>` that is also a sort control is a
    button with no accessible name (4.1.2).
  - `selected` tints a row and sets `data-selected`, and announces nothing: ARIA
    supports `aria-selected` on rows inside a `grid`, not inside a `table`. A
    selectable table needs a checkbox in one of its cells, which is also what
    keeps the state off colour alone.

  `tableStyle()` is exported as a slot function and is callable from a server
  component, for a static table with no instance behind it.

  In `apps/docs`, `check:contrast` gains `focus ring on raised` — the table puts
  a focus ring on its scroll container and on every sort button, both of which
  sit on `--surface-raised` rather than on the page or on `--surface`. It passes
  at 5.98:1 and 7.59:1. Every other pairing the table introduces was already
  checked under another name.

- b9c76d6: Give every component the same shape on disk, and fix the build that
  did not follow it.

  A component is now a directory rather than a file: `<Name>.tsx` for the React
  layer, `styles.ts` for the `tv()` definition, `types.ts` for the props
  interface, and an `index.ts` barrel, grouped under
  `components/<group>/<Name>`. `Button` moves to `interactions/`, `Link` to
  `navigation/`, `Input` to `forms/`, and the central `variants.ts` is gone —
  its contents now sit beside the components that use them.

  The variant functions are renamed to match: `link` and `input` become
  `linkStyle` and `inputStyle`, alongside the existing `buttonStyle`. Prop
  interfaces are `IButtonProps`, `ILinkProps` and `IInputProps`. The
  server/client split is unchanged — `styles.ts` carries no `"use client"`, so
  `linkStyle()` is still callable from a server component for the
  `<NextLink className={linkStyle()}>` case.

  Two build fixes came out of this. `tsup`'s entry globs were single-level, so
  nothing under `components/<group>/<Name>/` was compiled — and the failure was
  silent, because `tsc` still emitted the declarations, leaving a `dist` that
  type-checked while `dist/index.js` imported JavaScript that was never written.
  It surfaced only as `Failed to resolve import` in Storybook. The package's
  `moduleResolution` override is also reverted to the `NodeNext` of the shared
  base config, which turns the extensionless and directory imports that hid the
  problem into compile errors.

  `Button` regained the `"use client"` directive it lost, and its `styles.ts`
  now builds on the configured `tv` instance from `lib/tv.ts` rather than
  importing `tailwind-variants` directly, restoring the `radius` conflict rule
  that keeps `<Button className="rounded-full">` working.

- 3b03bf8: Rebuild `@retrojb/ui` as a real component library: Tailwind CSS v4
  for the styling engine, `tailwind-variants` for the variant API, `tsup` for
  the build. Replaces the `create-turbo` placeholder components.

  Ships `Button` (four intents, three sizes), `Link` (inline, standalone and
  muted, with external-link handling) and `Input` (label, description, error and
  invalid state). Each exports its variant function alongside the component, for
  styling an element the package does not own — a router's `<Link>`, a
  `<textarea>` that has to match the inputs beside it.

  The palette is a set of plain custom properties that `@theme` maps into
  Tailwind's `--color-*` namespace, so utilities resolve to `var(--accent)` at
  paint time and an app retints every component by overriding one variable.
  Tokens ship in `@layer theme` and utilities ship unlayered, which is what
  makes an app's own `:root` block win over the defaults while the components
  still win over an app's global element styles. `apps/docs` already declares
  these tokens, so its contrast-checked palette is the one in effect there.

  Accessibility decisions are in the components rather than left to each call
  site: `Input` requires a `label` prop and wires `htmlFor`, `aria-describedby`
  and `aria-invalid` from `useId`; inline links are underlined because colour
  alone would fail 1.4.1 at this contrast; external links announce that they
  open a new tab; all three share one `:focus-visible` outline. Ratios for every
  token pair are recorded in `src/styles/tokens.css`.

  Also fixes ESLint for every package with a `tsup.config.ts`. The file sits
  outside each package's `tsconfig` `include`, and `allowDefaultProject` only
  listed `.js`/`.mjs`/`.cjs`, so `eslint .` failed with "was not found by the
  project service" rather than linting — affecting `wcag-a11y-scanner`,
  `kiro-figma-bridge` and `figma-bridge-plugin`.

### Patch Changes

- b9c76d6: Add per-component accessibility documentation to Storybook.

  The WCAG reasoning behind each component was only readable as comments in
  `styles.ts`. It is now a docs page per component, under
  `src/stories/<category>/accessibilityDocs`, covering the criteria each
  component satisfies, the measured contrast ratio for every pairing it renders,
  and the aria each one does and does not set:

  - `Interactions/Button/Accessibility`
  - `Navigation/Link/Accessibility`
  - `Forms/Input/Accessibility`

  Ratios are the measured output of
  `npm run check:contrast --workspace=@retrojb/docs`, not transcribed by hand,
  so they stay checkable against the palette the package ships.

  Enables `remark-gfm` in the docs addon. MDX parses CommonMark, where tables
  are not included, so the ratio tables would otherwise have rendered as
  paragraphs of literal `|` characters.

  One claim did not survive being written down: the comment in `Button`'s
  `styles.ts` said the two larger sizes cleared the 44px AAA target in 2.5.5,
  but `md` is 40px. Only `lg` clears it. Corrected in the component comments and
  on the docs site alongside the new pages.

  Tailwind's `@source` list now includes `components/**/*.ts`. The class strings
  moved into `styles.ts` when components became directories, and only automatic
  source detection was still finding them — which holds when the CLI runs from
  the package root and not otherwise.

- 127366f: Revised underlying configurations, node, cleaned up dependencies
