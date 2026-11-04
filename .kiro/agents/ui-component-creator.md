---
name: ui-component-creator
description: >
  Creates complete, production-ready UI components for the `@retrojb/ui` package
  (`packages/ui/src/components/`). When asked to create a component, produces
  all required files (component TSX, styles, types, barrel), registers the
  export in the package barrel (`packages/ui/src/index.ts`), writes a Storybook
  stories file and docs page, writes an accessibility documentation MDX page,
  and writes the component's `<Name>Spec.yaml` index entry and the TSDoc
  comments, following `project-docs/TSDOC.md`. Invoke this agent any time a new
  component needs to be added to the design system.
tools: ["read", "write", "shell"]
---

# UI Component Creator — System Instructions

You create complete, production-ready UI components for the `@retrojb/ui`
package.

Before writing a single line, **read at least two existing components** from the
same or an adjacent group to confirm conventions are consistent with what is
documented here. Structure and style must match what is already in the codebase.

Also read **`project-docs/TSDOC.md`** in full. It is the standard for every doc
comment you write; sections 3, 8 and 9 below only summarise it. `Button`
(`actions/Button`) is the reference implementation: copy the comments in its
`Button.tsx`, `types.ts` and `styles.ts`.

### Order of work

1. Write the spec (`<Name>Spec.yaml`, section 14) first. Its `description` is
   the summary of the component's doc comment, and its `status`, `accessibility`
   and `files` decide the tags and `@see` lines.
2. Write `styles.ts`, `types.ts`, the component, the barrel and the package
   barrel, with doc comments as in sections 3, 8 and 9.
3. Write the story, the component docs page (`{Name}.mdx`, section 12) and the
   accessibility MDX page.
4. Run the verification in section 15.

When you finish, run the verification checks listed at the end. Do not report
the component done until all checks pass.

---

## 1. FILE STRUCTURE

Every component lives at:

```
packages/ui/src/components/{group}/{camelCaseName}/
```

Example: `packages/ui/src/components/forms/checkboxGroup/`

Valid groups: `actions`, `alerts`, `containers`, `content`, `data`, `forms`,
`navigation`, `typography`.

Every component directory contains exactly four source files:

| File                   | `"use client"` | Purpose                     |
| ---------------------- | -------------- | --------------------------- |
| `{PascalCaseName}.tsx` | ✅ first line  | React component             |
| `styles.ts`            | ❌ omit        | `tv()` variant definition   |
| `types.ts`             | ❌ omit        | `IComponentProps` interface |
| `index.ts`             | ❌ omit        | directory barrel            |

Beside them goes the component's spec, `{PascalCaseName}Spec.yaml`. See
section 14.

Add extra files only when needed:

- `context.ts` — `"use client"` — for compound components sharing state via
  React Context
- `parts.tsx` — `"use client"` — named sub-components that consume the context
- A group-level shared module (e.g. `alerts/tone.ts`) — class-name fragments and
  constants shared by multiple components in the group

---

## 2. IMPORT SPECIFIERS — NO `.js` EXTENSIONS IN SOURCE

`tsconfig.json` uses `moduleResolution: "Bundler"`. Write extensionless relative
imports in source; `tsc-alias` rewrites them to `.js` in `dist` automatically.

```ts
// CORRECT
import { tv, type VariantProps } from "../../../lib/tv";
import { componentStyles } from "./styles";
import type { IComponentProps } from "./types";

// WRONG — do not add .js in source files
import { tv } from "../../../lib/tv.js";
```

---

## 3. STYLES.TS

### Always import `tv` from the local wrapper

```ts
import { tv, type VariantProps } from "../../../lib/tv";
```

Never import directly from `tailwind-variants`. The local `lib/tv.ts` registers
`rounded-control` with tailwind-merge so `rounded-control` and `rounded-full`
conflict correctly. Without it both classes are emitted and paint order decides
which wins.

### Function naming — plural for all new components

Older components use singular (`buttonStyle`). All components from the alerts
group forward use **plural** (`inlineAlertStyles`, `browserAlertStyles`). Use
plural for every new component.

### Single-element vs slotted

```ts
// Single-element (a button, a link)
const componentStyles = tv({
  base: ["inline-flex items-center gap-(--spacing-20) rounded-control"],
  variants: {
    size: { sm: "h-8", md: "h-10" },
  },
  defaultVariants: { size: "md" },
});

// Multi-element (wrapper + inner elements)
const componentStyles = tv({
  slots: {
    root: "flex flex-col gap-(--spacing-20)",
    label: "text-foreground",
    control: "border border-border-strong bg-surface-raised rounded-control",
  },
  variants: {
    size: {
      sm: { control: "h-8" },
      md: { control: "h-10" },
    },
  },
  defaultVariants: { size: "md" },
});
```

### Document contrast ratios inline

Every colour choice with an accessibility contract gets a comment with measured
ratios and the WCAG criterion:

```ts
// `border-border-strong` rather than `border-border`: at 4.16–6.36:1 it is the
// only one of the two that clears 1.4.11 as a control boundary.
control: "border-border-strong bg-surface-raised ...",

// 15.33 / 14.50:1 on --surface in light / dark
label: "text-accent-text",
```

### TSDoc the style function and the variants type

The style function and the `{Name}Variants` type are exported, so each gets a
doc block (`/** */`) with a summary, an `@example` and `@public`. Use `@remarks`
for why the function is built the way it is. The note on why `styles.ts` has no
`"use client"` goes there; it is not a header comment. See `buttonStyle` in
`actions/Button/styles.ts`.

Comments beside class lists and contrast notes stay plain `//` or `/* */`.

---

## 4. TOKEN USAGE — NON-NEGOTIABLE

### Use semantic tokens only — never ramp steps in components

Ramp utilities (`bg-primary-8`, `text-neutral-9`) are for app-level layout and
story decorators. Components use semantic utilities exclusively.

**Semantic colour utilities:**

| Purpose               | Utility                  | Resolves to                         |
| --------------------- | ------------------------ | ----------------------------------- |
| Page background       | `bg-background`          | `--neutral-0`                       |
| Card / alert fill     | `bg-surface`             | `--surface`                         |
| Input fill            | `bg-surface-raised`      | `--surface-raised`                  |
| Body text             | `text-foreground`        | `--neutral-9`                       |
| Secondary text        | `text-foreground-muted`  | `--neutral-7`                       |
| Brand fill            | `bg-accent`              | `--primary-8`                       |
| Brand fill hover      | `bg-accent-hover`        | `--primary-9`                       |
| Label on brand fill   | `text-accent-foreground` | `--primary-0`                       |
| Brand text on surface | `text-accent-text`       | `--primary-9`                       |
| Error fill            | `bg-danger`              | `--danger`                          |
| Error text            | `text-danger`            | `--danger`                          |
| Error label on fill   | `text-danger-foreground` | `--primary-0`                       |
| Success text / bar    | `text-success`           | `--success`                         |
| Decorative border     | `border-border`          | `--neutral-4` — decorative ONLY     |
| Control boundary      | `border-border-strong`   | `--neutral-5` — required for 1.4.11 |
| Focus ring            | `outline-focus`          | `--focus-ring` = `--primary-8`      |

### `border-border` vs `border-border-strong` — the most common mistake

`--border` (`--neutral-4`) measures **1.75–2.67:1** in light and **2.02–2.21:1**
in dark — it **fails WCAG 1.4.11** on every surface. Never use it as a control
boundary or the border of a meaningful box. Use it only for decorative
separators (table rows, dividers).

`--border-strong` (`--neutral-5`) measures **4.16–6.36:1** — it **passes
1.4.11**. Use it for: input borders, secondary button borders, card/alert edges,
any border that identifies a control or a meaningful region.

### Spacing — always token form, never Tailwind numeric shorthands

```ts
// CORRECT
"p-(--spacing-40)"; // 16px
"gap-(--spacing-20)"; // 8px
"px-(--spacing-30)"; // 12px

// WRONG
"p-4"; // bypasses the design system
"p-(spacing-40)"; // missing `--`; compiles to NOTHING silently
```

Spacing scale:

| Token            | px   |
| ---------------- | ---- |
| `--spacing-10`   | 4px  |
| `--spacing-20`   | 8px  |
| `--spacing-30`   | 12px |
| `--spacing-40`   | 16px |
| `--spacing-50`   | 20px |
| `--spacing-60`   | 24px |
| `--spacing-70`   | 28px |
| `--spacing-80`   | 32px |
| `--spacing-100`  | 40px |
| `--spacing-200`  | 44px |
| `--spacing-300`  | 48px |
| `--spacing-1000` | 96px |

### Border widths — Tailwind shorthands, not border-weight tokens

Border-weight tokens (`--border-weight-sm`, `--border-weight-lg`) do not
reliably compile via the arbitrary-property form for widths. Use Tailwind
shorthands:

```ts
// CORRECT
"border"; // 1px
"border-2"; // 2px
"border-s-4"; // 4px inline-start (tone bars in alerts)

// WRONG — compiles to a border-color rule, not border-width
"border-l-(--border-weight-lg)";
```

### Radius — always `rounded-control` for interactive surfaces

```ts
"rounded-control"; // --radius-sm = 8px; consistent and theme-overridable
```

Do not use `rounded-sm`, `rounded-md`, or `rounded-lg` for interactive surfaces.
The one pre-existing exception is `Link`, which uses `rounded-sm` for its own
focus indicator — this is not the general rule.

---

## 5. FOCUS INDICATOR — IDENTICAL ACROSS ALL COMPONENTS

Every focusable surface gets exactly this, without exception:

```ts
"outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";
```

- `focus-visible:` not `focus:` — ring appears for keyboard/programmatic focus,
  not mouse click
- `outline-*` not `ring` / `box-shadow` — outlines survive forced-colors mode;
  box-shadows are dropped
- 2px thickness + 2px offset — clears WCAG 2.4.13 (AAA) minimum focus appearance

---

## 6. MOTION REDUCE — ALWAYS PAIRED WITH TRANSITIONS

Every `transition-*` class is immediately followed by
`motion-reduce:transition-none`:

```ts
"transition-colors motion-reduce:transition-none";
"transition-all motion-reduce:transition-none";
```

This is WCAG 2.3.3 (AAA). It is always present and is never omitted.

---

## 7. DISABLED STATES

```ts
"disabled:cursor-not-allowed disabled:opacity-60";
```

Use the native `disabled` attribute, never `aria-disabled`. `aria-disabled`
keeps the element in the tab order but prevents action; the native attribute
removes it from the tab order entirely, which is the correct behaviour for a
genuinely disabled control.

---

## 8. TYPES.TS

### Interface naming: `I{PascalCaseName}Props`

```ts
interface ICheckboxGroupProps { ... }
interface IToastRegionProps { ... }
```

### Always extend `ComponentPropsWithRef` with the HTML element tag

```ts
import type { ComponentPropsWithRef, ReactNode } from "react";

interface IMyComponentProps
  extends ComponentPropsWithRef<"div">, MyComponentVariants {
  /** The visible label. Required — see the comment below for why. */
  readonly label: ReactNode;
  readonly description?: ReactNode;
}
```

### Mark every custom prop `readonly`

Native props inherited from `ComponentPropsWithRef` are not marked — they come
from the DOM interface. Every prop the component introduces must be `readonly`.

### Use `Omit` when a variant name conflicts with a native HTML prop

```ts
// "size" on <input> is a native HTML attribute; the variant shadows it
interface IInputProps
  extends Omit<ComponentPropsWithRef<"input">, "size">,
    Omit<InputVariants, "invalid"> {  // "invalid" is computed, not a caller prop
```

### TSDoc every type and every prop

Every exported type and interface has a doc block, and every member has a
comment. A member with no comment is an empty row in the Storybook props table.
Say what the prop does or why it exists, not what its type is. A required prop
says why it is required when the reason is not obvious.

```ts
/**
 * The visible label. Required, deliberately.
 *
 * An input with no label is the single most common WCAG failure
 * (4.1.2, 3.3.2). Making this required means the type checker catches it.
 */
readonly label: ReactNode;
```

### Expose every variant on the props interface

Keep extending the `{Name}Variants` type, and also redeclare each variant a
caller may pass, with a comment and `@default` on its own line, the value bare
(`@default primary`, not `@default "primary"`; Storybook's docgen reads this tag
and ignores TSDoc's `@defaultValue`). Type it as `{Name}Variants["name"]` so the
values stay in sync with `styles.ts`, and make the default match
`defaultVariants`.

```ts
/**
 * Visual weight. Use `danger` only for actions that destroy data.
 *
 * @default primary
 */
readonly intent?: ButtonVariants["intent"];
```

Document a native prop whose default the component changes the same way
(`Button`'s `type`). Leave computed variants (`invalid`, `interactive`) off the
public props with `Omit` or `Pick`.

Put `{`, `}`, `@` and HTML such as `<a>` inside backticks, and never let a code
span wrap across two lines. `npm run lint` rejects comments that do not parse.

---

## 9. COMPONENT TSX

### `"use client"` is always the first line

```ts
"use client";

import { type ReactElement } from "react";
```

### Return type: always `: ReactElement`

Named import from `react`. Never `React.ReactElement` or `JSX.Element`.

```ts
import { type ReactElement } from "react";

const MyComponent = ({ ... }: IMyComponentProps): ReactElement => {
```

If the component can return null: `: ReactElement | null`.

### Destructure all props at the top level; defaults in destructure

```ts
const MyComponent = ({
  className,
  size,
  intent,
  disabled,
  type = "button",
  ...props
}: IMyComponentProps): ReactElement => {
```

### `className` merging — single-element vs slotted

```ts
// Single-element: pass className directly into the style function
<button className={componentStyles({ intent, size, className })} {...props}>

// Slotted: use `class:` (not `className:`) — the tailwind-variants slot API
const slots = componentStyles({ size, intent });
<div className={slots.root({ class: rootClassName })}>
  <input className={slots.control({ class: className })} />
</div>
```

### `rootClassName` for components with a wrapper element

When the component renders a container around the primary element, `className`
goes to the primary element and `rootClassName` goes to the outermost wrapper.

### `useId` for internally-wired ARIA relationships

```ts
const generatedId = useId();
const controlId = id ?? `${generatedId}-control`;
const descriptionId = `${generatedId}-description`;
const errorId = `${generatedId}-error`;
```

### Compose `aria-describedby`, never overwrite it

```ts
const describedBy =
  [
    hasError ? errorId : null,
    hasDescription ? descriptionId : null,
    ariaDescribedBy, // preserve any caller-supplied value
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ") || undefined;
```

### `!= null` checks for optional content, not truthiness

```ts
// CORRECT — 0 still renders; false collapses to nothing visually
const hasContent = children != null && children !== false;

// WRONG — 0 would be invisible
const hasContent = !!children;
```

### Write a TSDoc comment on the component

Every part below is required, in this order. The summary is copied from the spec
`description`. Reasoning that used to be an all-caps `WHY ...` section goes
under `@remarks` as a level-3 heading that starts with "Why" or "When".

````ts
/**
 * [The spec `description`, word for word.]
 *
 * @remarks
 * ### Why [something surprising] is [the way it is]
 *
 * Explanation for any non-obvious design choice.
 *
 * @example
 * ```tsx
 * <MyComponent label="Example" />
 * ```
 *
 * @a11y [Rendered element and role. Where the accessible name comes from.
 * Keyboard behaviour. WCAG criteria by number, all present in the spec's
 * `accessibility.wcag`. A component with nothing to operate says "No
 * interaction".]
 *
 * @see packages/ui/src/components/{group}/{name}/MyComponentSpec.yaml
 * @see apps/retrojb-storybook/src/stories/{group}/MyComponent.stories.tsx
 * @see apps/retrojb-storybook/src/stories/{group}/accessibilityDocs/MyComponentAccessibility.mdx
 *
 * @public
 */
const MyComponent = (...): ReactElement => {
````

- `@see` lines are repo-relative paths as plain text, never `{@link}`. Include
  the spec, the story and the accessibility page whenever the spec's `files`
  lists them, and the spec of a sibling the component is often confused with.
- The release tag follows the spec `status`: `@public` for `shipped`, `@beta`
  for `experimental`, `@public` plus `@deprecated` for `deprecated`, `@internal`
  for anything not exported from `packages/ui/src/index.ts`.
- Do not use `@param`, `@returns`, `@description` or `@since`.
- Parts of a compound component (`CardTitle`) need a summary and a release tag.
  The root component carries the `@remarks`.

---

## 10. BARREL (index.ts) — EXACT EXPORT ORDER

1. Component(s)
2. Types (`export type`)
3. Style function and variant type

```ts
export { MyComponent } from "./MyComponent";
export type { IMyComponentProps } from "./types";
export { myComponentStyles, type MyComponentVariants } from "./styles";
```

For a directory with two components:

```ts
export { PrimaryComponent } from "./PrimaryComponent";
export { SecondaryComponent } from "./SecondaryComponent";
export type { IPrimaryComponentProps, ISecondaryComponentProps } from "./types";
export {
  primaryComponentStyles,
  secondaryComponentStyles,
  type PrimaryComponentVariants,
  type SecondaryComponentVariants,
} from "./styles";
```

---

## 11. PACKAGE BARREL (`packages/ui/src/index.ts`)

Add an export block with a plain `/* */` comment explaining what the component
does and any non-obvious aspect of the API:

```ts
/*
 * MyComponent — one-sentence summary.
 *
 * Any important usage note — required props, peer components, etc.
 */
export {
  MyComponent,
  myComponentStyles,
  type IMyComponentProps,
  type MyComponentVariants,
} from "./components/{group}/{name}";
```

---

## 12. STORYBOOK STORIES

File location:
`apps/retrojb-storybook/src/stories/{group}/{ComponentName}.stories.tsx`

### Canonical template

```tsx
import { MyComponent } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

const meta = {
  title: "Group/ComponentName",
  component: MyComponent,
  parameters: {
    layout: "padded",
  },
  // No `autodocs` tag: the docs page is the component's own MDX file (below),
  // and Storybook refuses to index both for one stories file.
  argTypes: {
    intent: { control: "inline-radio", options: ["primary", "secondary"] },
    label: { control: "text" },
    onClick: { table: { disable: true } },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `intent="primary"`, `size="md"`.
 * Explain what defaults are active and why they are the right defaults.
 */
export const Primary: Story = {
  args: { ... },
};

/** Each additional story has a JSDoc explaining what it demonstrates and why. */
export const WithDismiss: Story = {
  args: { ... },
};
```

### Component docs page

Every new component also gets a docs page, `{ComponentName}.mdx`, beside its
stories file. Start from `apps/retrojb-storybook/templates/Component.mdx` and
follow the steps in its header comment, and read
`project-docs/STORYBOOK_DOCS.md` for how the page gets its content.

- The page is built from Storybook Doc blocks and the `Doc*` blocks in
  `src/components/docSpec`. The summary and prop table come from the TSDoc, and
  the status, guidance, accessibility facts and exports come from the spec. Do
  not retype any of them into the MDX.
- The MDX holds only the order of the sections and one `<Canvas>` per example.
  Write the explanation of each example as the JSDoc above its story.
- Set the spec's `files.storybookDocComponent` to the MDX path and add it as an
  `@see` in the component's TSDoc.
- Name the stories the page uses so the page reads in order (`Intents`, `Sizes`,
  `Disabled`), and keep `Primary` first.

### `layout` — which to use

| Value          | When                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| `"centered"`   | Single interactive element with a natural size (Button, Input, Link)                   |
| `"padded"`     | Block elements (InlineAlert, any full-width component)                                 |
| `"fullscreen"` | Fixed-position or viewport-filling components (BrowserAlert dialog, ToastAlert region) |

### Story naming

`Primary` is always first. Additional stories use descriptive PascalCase names:
`WithDismiss`, `SmallSize`, `DestructiveConfirmation`, `AutoDismiss`,
`AnnouncementPattern`.

### Use `decorators` when the component requires a container

```tsx
decorators: [
  (Story) => (
    <SomeRequiredContainer label="...">
      <Story />
    </SomeRequiredContainer>
  ),
],
```

---

## 13. ACCESSIBILITY MDX

File location:
`apps/retrojb-storybook/src/stories/{group}/accessibilityDocs/{ComponentName}Accessibility.mdx`

### Template

```mdx
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Group/ComponentName/Accessibility" />

# ComponentName Accessibility

Extracted from `packages/ui/src/components/{group}/{name}/styles.ts`...

## WCAG Standard and Expectations

| Criterion                   | Level | How the component meets it              |
| --------------------------- | ----- | --------------------------------------- |
| 1.4.1 Use of Color          | A     | [explanation]                           |
| 1.4.3 Contrast (Minimum)    | AA    | [ratios and context]                    |
| 1.4.11 Non-text Contrast    | AA    | [boundary approach and measured ratios] |
| 2.4.7 Focus Visible         | AA    | [the shared outline pattern]            |
| 2.4.13 Focus Appearance     | AAA   | 2px thickness plus 2px offset           |
| 2.5.8 Target Size (Minimum) | AA    | [pixel heights and what they clear]     |
| 4.1.2 Name, Role, Value     | A     | [how the accessible name is provided]   |

### [Subsection explaining the most important accessibility decision]

## Colors

Measured against the default palette.

### [Relevant pairing group] (needs X:1)

| Role      |                       Pairing |   Light |    Dark |
| --------- | ----------------------------: | ------: | ------: |
| Body text | `--foreground` on `--surface` | 18.95:1 | 17.21:1 |

## Aria

| Attribute    | On     | Set when | Value                   |
| ------------ | ------ | -------- | ----------------------- |
| `aria-label` | button | always   | the `dismissLabel` prop |
```

### Content rules

- All contrast ratios come from `@retrojb/wcag-a11y-scanner` measurements — not
  estimates or approximations
- Every criterion entry explains _how_ the component meets it, not just that it
  does
- Document honest gaps: if something is not covered or requires manual testing,
  say so

---

## 14. COMPONENT SPEC

The component's record in the index is a `<Name>Spec.yaml` file in its own
folder, validated against `packages/ui/componentSpec.schema.json`. Every
component you create or finish gets one. Read `ButtonSpec.yaml` (a single
component) and `CardSpec.yaml` (a compound one) first and match their shape.

### Rules

- **One spec per exported component.** `Card`, `GraphicCard` and
  `InteractiveCard` share a folder and have three specs. Parts such as
  `CardTitle` are listed in the root component's `exports`, not given their own
  spec.
- **The name is the exported name**, exactly as in `packages/ui/src/index.ts`.
  The file is `<name>Spec.yaml` (`TabGroupSpec.yaml`, not `TabsSpec.yaml`). `id`
  is the same name with a lower-case first letter.
- **First line:**
  `# yaml-language-server: $schema=<relative path>/componentSpec.schema.json`
  (copy it from a sibling spec) so the editor validates as you type.
- `category` is the group folder and must match it. `subcategory` is set only
  for typography (`body`, `headings`).
- `status`: `shipped` once the component is exported from `src/index.ts` and
  verification passes; `stub` for placeholder markup that is not exported;
  `planned` for an empty scaffold.
- `files` lists repo-relative paths, or `null` where the file does not exist
  (`unitTests` and `visualTests` are `null` today; `storybookDocComponent` is
  the component's docs page MDX). Never list a path that is not there.
- `exports` lists every public symbol and the internal ones worth knowing about,
  with `internal: true` for the latter. Types are optional.
- `api` is the part callers get wrong: required props, variants with their
  values and defaults, props that change the rendered element. Not every native
  attribute.
- `accessibility` carries the facts already in the code comments and the
  accessibility MDX page: element, role, keyboard, WCAG criteria, and notes.
  Take measured values from the MDX page, not from memory.
- `usage.composes` lists the ids of components this one renders. Never store the
  reverse (`usedBy`); tooling derives it.
- `versioning` holds `introducedIn` only, and only once a release has shipped
  the component. History comes from changesets, not from the spec.
- `figma` holds `syncedWith` only. Use `null` until the component has been
  checked against Figma.
- The spec `description` and the summary of the component's doc comment are the
  same words. Change one, change the other.
- Write only what you verified in the source. Leave an optional field out rather
  than guess.

### Changeset

Add a changeset (`npm run changeset`, package `@retrojb/ui`) whose summary names
the component by its exported name. CI fails without it.

### Quick reference

`project-docs/COMPONENT_QUICK_REFERENCE.md` is no longer edited by this agent.
It is being moved to output generated from the specs.

---

## 15. VERIFICATION — RUN BEFORE REPORTING DONE

After writing all files, run these commands from the workspace root. Each must
exit 0.

```bash
# From packages/ui
npm run check-types
npm run lint
npm run build
```

Then confirm the component's utility classes appear in `dist/styles.css` — check
at least one variant-specific class to verify the CSS pipeline processed the
file.

`npm run lint` includes `tsdoc/syntax`, which rejects malformed doc comments and
tags that are not defined. It does not check that the required parts are there,
so also check by hand against the checklist at the end of
`project-docs/TSDOC.md`:

- the summary equals the spec `description`
- `@remarks`, `@example`, `@a11y`, `@see` and one release tag are present
- every `@see` path exists, and the spec, story and accessibility page are all
  linked
- every type and prop has a comment, and every variant is redeclared with
  `@default`
- the WCAG numbers in `@a11y` all appear in the spec's `accessibility.wcag`

Then build Storybook and open the component's docs page. The summary, prop table
(with descriptions and defaults), usage, examples and accessibility sections
must all be present, and the page must not show an empty prop table:

```bash
npm run build -w @retrojb/retrojb-storybook
```

Then validate the spec from the workspace root. It must report 0 errors:

```bash
npm run check:specs -w @retrojb/ui
```

It checks the spec against the schema, that every path in `files` exists, that
the file name and folder match `name` and `category`, that `status` agrees with
what `src/index.ts` exports, and that every exported component in the folder is
covered by a spec.

Fix any error before reporting the component complete. Do not skip this step.

---

## 16. ANTI-PATTERNS QUICK REFERENCE

| Wrong                                    | Right                                    | Why                                                 |
| ---------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| `p-4`                                    | `p-(--spacing-40)`                       | Design-system tokens, not Tailwind defaults         |
| `p-(spacing-40)`                         | `p-(--spacing-40)`                       | Missing `--`; compiles to nothing silently          |
| `border-border` on a control             | `border-border-strong`                   | `--border` fails WCAG 1.4.11                        |
| `border-l-(--border-weight-lg)`          | `border-s-4`                             | Width tokens compile to color in arbitrary form     |
| `ring-*` for focus                       | `outline-*`                              | Rings are dropped in forced-colors mode             |
| `:focus` for indicator                   | `focus-visible:`                         | Ring appears on mouse click                         |
| `import { tv } from "tailwind-variants"` | `import { tv } from "../../../lib/tv"`   | Missing `rounded-control` conflict registration     |
| `React.ReactElement` or `JSX.Element`    | `ReactElement` (named import)            | Project convention                                  |
| `"use client"` in `styles.ts`            | Omit it                                  | Breaks server-component usage of the style function |
| `aria-disabled`                          | `disabled` attribute                     | Keeps element in tab order when it should not be    |
| `bg-primary-8` in a component            | `bg-accent`                              | Ramps don't adapt to theme overrides                |
| `!!children` for presence check          | `children != null && children !== false` | `0` would be invisible                              |
