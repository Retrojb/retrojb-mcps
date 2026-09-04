# @retrojb/ui

Shared React primitives for the apps in this repo. Tailwind CSS v4 for the
styling engine, [`tailwind-variants`](https://www.tailwind-variants.org) for the
variant API, `tsup` for the build.

Three components so far: `Button`, `Link`, `Input`.

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

<Button intent="primary" size="md">Save</Button>
<Link href="/docs">Read the docs</Link>
<Input label="Email" type="email" description="We never share it." />
```

Every component also exports its variant function, for styling an element this
package does not own:

```tsx
import NextLink from "next/link";
import { link } from "@retrojb/ui";

// Client-side routing, library styling.
<NextLink href="/docs" className={link({ intent: "standalone" })}>
  Docs
</NextLink>;
```

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
- One focus indicator across all three components: a 2px `outline` with a 2px
  offset on `:focus-visible` (2.4.7, 2.4.13). An `outline` rather than a `ring`
  box-shadow, because outlines survive forced-colors mode.
- Contrast ratios for every token pair are recorded in `src/styles/tokens.css`,
  and the pairings these components introduce — button labels on their fills,
  input text, borders and focus rings — are gated by
  `npm run check:contrast --workspace=@retrojb/docs`, which uses the engine from
  `@retrojb/wcag-a11y-scanner`. If you change a colour, run it.

Colour is never the only signal for a state: the invalid input changes its
border as well as showing a message, and disabled controls change cursor as well
as opacity.

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

The three components are client modules — `Input` calls `useId`. The variant
functions are not, and the split is deliberate: `"use client"` marks everything
a module exports as client-only, so had `link()` lived next to `Link` it could
not be called from a server component, which is the default in App Router and
where the `<NextLink className={link()}>` example above normally sits.

So `variants.ts` holds the class-name logic with no directive, and
`components/*.tsx` hold the React layer with one. Both are re-exported from the
package root, so this works from a server component:

```tsx
import { link } from "@retrojb/ui"; // fine on the server
```

## Notes on the build

`tsup` compiles the JS, one output file per source module rather than a bundle.
A bundle would be a single module with a single directive, which is what would
collapse the boundary described above; esbuild preserves per-file directives
when it is not bundling. It also means Next.js ships only the components an app
actually imports to the client.

Declarations come from `tsc --emitDeclarationOnly` rather than tsup's `dts`
step, which injects a `baseUrl` that TypeScript 6 rejects outright. The
stylesheet is compiled by the Tailwind CLI. Both run from tsup's `onSuccess`, so
watch mode keeps all three artifacts in step.

`treeshake` is off, because it routes the output through Rollup, which strips
module-level directives. Consumers' bundlers tree-shake this package anyway.
