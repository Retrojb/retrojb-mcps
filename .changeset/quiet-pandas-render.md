---
"@retrojb/ui": minor
"@retrojb/docs": patch
"@retrojb/eslint-config": patch
---

Rebuild `@retrojb/ui` as a real component library: Tailwind CSS v4 for the
styling engine, `tailwind-variants` for the variant API, `tsup` for the build.
Replaces the `create-turbo` placeholder components.

Ships `Button` (four intents, three sizes), `Link` (inline, standalone and muted,
with external-link handling) and `Input` (label, description, error and invalid
state). Each exports its variant function alongside the component, for styling an
element the package does not own — a router's `<Link>`, a `<textarea>` that has to
match the inputs beside it.

The palette is a set of plain custom properties that `@theme` maps into Tailwind's
`--color-*` namespace, so utilities resolve to `var(--accent)` at paint time and an
app retints every component by overriding one variable. Tokens ship in
`@layer theme` and utilities ship unlayered, which is what makes an app's own
`:root` block win over the defaults while the components still win over an app's
global element styles. `apps/docs` already declares these tokens, so its
contrast-checked palette is the one in effect there.

Accessibility decisions are in the components rather than left to each call site:
`Input` requires a `label` prop and wires `htmlFor`, `aria-describedby` and
`aria-invalid` from `useId`; inline links are underlined because colour alone
would fail 1.4.1 at this contrast; external links announce that they open a new
tab; all three share one `:focus-visible` outline. Ratios for every token pair are
recorded in `src/styles/tokens.css`.

Also fixes ESLint for every package with a `tsup.config.ts`. The file sits outside
each package's `tsconfig` `include`, and `allowDefaultProject` only listed
`.js`/`.mjs`/`.cjs`, so `eslint .` failed with "was not found by the project
service" rather than linting — affecting `wcag-a11y-scanner`,
`kiro-figma-bridge` and `figma-bridge-plugin`.
