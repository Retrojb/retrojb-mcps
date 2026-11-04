# TSDoc standards

How to document code in `@retrojb/ui`. The rules apply to every exported
component, props type, style function, hook and utility in `packages/ui/src`.

Three readers use these comments: people hovering a symbol in an editor, the
Storybook props table, and AI agents that open one file and need to know what it
is for. Write for all three. A reader should not have to open another file to
learn what a component is for, what its props mean, or how to use it.

## Where each fact lives

Each fact has one home. Everything else points to it.

| Fact                                             | Home                                          |
| ------------------------------------------------ | --------------------------------------------- |
| What the component is for (one or two sentences) | `description` in `<Name>Spec.yaml`            |
| Why it is built the way it is                    | `@remarks` on the component                   |
| What each prop means and its default             | The member's doc comment in `types.ts`        |
| Variants, status, files, WCAG criteria (as data) | `<Name>Spec.yaml`                             |
| Accessibility behaviour (as prose)               | `@a11y` on the component                      |
| Implementation notes beside a class list         | Plain `//` or `/* */` comments in `styles.ts` |

The summary line of the component's doc comment is a copy of the spec
`description`. If the two differ, the spec is right and the comment is stale.

## What a component's doc comment contains

Every exported component has all of these, in this order:

1. **Summary.** The first paragraph, equal to the spec `description`. Backticks
   and line breaks may differ; the words may not.
2. **`@remarks`.** The reasoning that does not fit in the summary. See
   [Writing `@remarks`](#writing-remarks).
3. **`@example`.** One minimal, copy-pasteable usage. Longer examples belong in
   the stories.
4. **`@a11y`.** See [Writing `@a11y`](#writing-a11y).
5. **`@see`.** One line per related file. See
   [Linking related files](#linking-related-files).
6. **A release tag.** See [Release tags](#release-tags).

````tsx
/**
 * Triggers an action on the current page. Defaults to `type="button"`, so it
 * never submits a surrounding form by accident; pass `type="submit"` when that
 * is the intent.
 *
 * @remarks
 * ### Why `type` defaults to `"button"`
 *
 * The HTML default is `"submit"`, so a button dropped inside a form to open a
 * dialog would submit the form instead. That bug only shows up once the button
 * is reused somewhere with a form around it.
 *
 * For navigation to another page, use `Link`.
 *
 * @example
 * ```tsx
 * <Button text="Save" type="submit" />
 * ```
 *
 * @a11y Renders a native `<button>`, named by `text`. Enter and Space activate
 * it. Focus is a 2px outline at a 2px offset that survives forced-colors mode.
 * WCAG 1.4.3, 2.4.7, 2.5.8, 4.1.2.
 *
 * @see packages/ui/src/components/actions/Button/ButtonSpec.yaml
 * @see apps/retrojb-storybook/src/stories/actions/Button.stories.tsx
 * @see apps/retrojb-storybook/src/stories/actions/Button.mdx
 * @see apps/retrojb-storybook/src/stories/actions/accessibilityDocs/ButtonAccessibility.mdx
 *
 * @public
 */
````

Do not use `@param` or `@returns` on a component. It takes one destructured
props object, so there is no parameter to attach them to, and the types are
already in the signature. Prop descriptions go on the props type.

## Documenting types

Every exported type, interface and member in `types.ts` has a doc comment.
Members the component adds are `readonly`; native props inherited or redeclared
from the DOM interface are not. A member with no comment shows an empty row in
the Storybook props table.

- Each interface has a summary saying what it describes.
- Each member has a one-sentence comment. Say what the prop does or why it
  exists, not what its type is.
- A required prop says why it is required when the reason is not obvious (the
  accessible name, a platform rule).
- A prop with a default uses `@default` on its own line, with the value written
  bare: `@default primary`, not `@default "primary"`. Storybook's props table
  reads this tag and quotes strings itself. TSDoc's own `@defaultValue` is not
  used, because Storybook's docgen ignores it; `@default` is declared in
  `packages/ui/tsdoc.json`.
- A union type documents what each member means when the names alone do not.

```ts
interface IButtonProps
  extends Omit<ComponentPropsWithRef<"button">, "type">, ButtonVariants {
  /** The visible label. It is also the button's accessible name. */
  readonly text: string;

  /**
   * Visual weight. Use `danger` only for actions that destroy data.
   *
   * @default primary
   */
  readonly intent?: ButtonVariants["intent"];
}
```

### Variant props must be exposed

Variants come from `tv()` in `styles.ts` through `VariantProps`. Docgen cannot
read a description from a type produced that way, so a variant that is only
inherited shows up undocumented, or not at all.

For every variant a caller may pass:

1. Export the variants type from the component barrel and from
   `packages/ui/src/index.ts` (`ButtonVariants`).
2. Keep the props interface extending the variants type, so a variant added to
   `styles.ts` still reaches callers.
3. Redeclare the member on the props interface with a doc comment, typed as
   `Variants["name"]` so the values stay in sync with `styles.ts`, and with
   `@default` matching `defaultVariants`.

A variant the component computes itself (`invalid`, `interactive`, `disabled` on
a card) is not part of the public props. Leave it off the props type with `Omit`
or `Pick`, as `ICardProps` does with `Pick<CardVariants, "size">`.

## Writing `@remarks`

`@remarks` holds the reasoning that used to live in `WHY ...` sections. Each one
becomes a level-3 heading, in sentence case, starting with "Why" or "When":

```ts
/**
 * ...summary...
 *
 * @remarks
 * ### Why the card is not the link
 *
 * Wrapping the card in `<a>` makes its entire text the link's accessible name...
 *
 * ### Why it responds to its container
 *
 * ...
 */
```

Keep the existing wording. This is a move, not a rewrite: only the all-caps
heading line changes.

### Escaping

`eslint-plugin-tsdoc` rejects comments the TSDoc parser cannot read. The common
causes:

- Put `{`, `}`, `@`, and HTML such as `<a>` or `<button>` inside backticks.
- Never split a code span across two lines. Rewrap the sentence so the span
  stays on one line.
- Do not use `@description`, `@since` or any tag not listed in this document.
  The summary is the description, and the spec records `introducedIn`.
- `{@link}` takes a code symbol or a URL. It does not take a file path.

## Writing `@a11y`

`@a11y` is a custom block tag, declared in `packages/ui/tsdoc.json`. It states
the accessibility contract in a few sentences, in this order:

1. The rendered element and role.
2. Where the accessible name comes from.
3. Keyboard behaviour.
4. The WCAG 2.2 criteria it addresses, by number.

Every component has one, including components with nothing to operate. Say "No
interaction" instead of leaving the tag off, so a missing tag always means "not
written yet".

The numbers must appear in the spec's `accessibility.wcag`. The longer
explanation, with measured ratios, stays in the component's accessibility MDX
page.

## Linking related files

`@see` is how a reader, or an agent, gets from the code to everything else about
the component. One `@see` per line, with a repo-relative path as plain text.

A component links to:

- its `<Name>Spec.yaml` (always)
- its story, when the spec's `files.story` is not `null`
- its docs page, when the spec's `files.storybookDocComponent` is not `null`
- its accessibility page, when the spec's `files.accessibilityDoc` is not `null`

A component with a sibling it is often confused with (`Link` for `Button`) links
to the sibling's spec as well.

Use `{@link Symbol}` in prose only for a code symbol in scope, never for a file.

## Release tags

Every exported symbol ends with exactly one release tag, taken from the spec's
`status`:

| Spec status    | Tag                                   |
| -------------- | ------------------------------------- |
| `shipped`      | `@public`                             |
| `experimental` | `@beta`                               |
| `deprecated`   | `@public`, plus `@deprecated` (below) |
| not exported   | `@internal`                           |

`@deprecated` says what to use instead and the version it is removed in:
`@deprecated Use {@link Link}. Removed in 1.0.0.` The spec records
`deprecatedIn` and `replacedBy`.

A symbol marked `@internal` in a spec's `exports` (`internal: true`) carries
`@internal`, and the reverse.

## Other exports

- **Style functions** (`buttonStyle`): a summary, `@remarks` for the
  server-component note, `@example`, `@see` the spec, a release tag. No `@a11y`.
- **Hooks and utilities** (`useComboBox`, `comboBoxFilter`): the same as style
  functions, plus `@typeParam` for generics. Add `@a11y` when the hook owns
  keyboard or ARIA behaviour.
- **Parts of a compound component** (`CardTitle`): a summary and a release tag.
  The root component's `@remarks` carries the shared reasoning.

## What stays a plain comment

Not everything is API documentation. These stay as `//` or `/* */`:

- Notes beside class lists in `styles.ts`, including contrast ratios.
- Comments inside function bodies.

An explanation of why an exported symbol is built the way it is is not a plain
comment. It goes in that symbol's `@remarks`, even when it used to be a header
comment at the top of the file. `buttonStyle` is the example: the note on why it
lives outside the `"use client"` module is its `@remarks`.

## Enforcement

| Rule                                                   | How                                         |
| ------------------------------------------------------ | ------------------------------------------- |
| Comments parse; only known tags are used               | `tsdoc/syntax` in `npm run lint`. Enforced. |
| `@a11y` is a defined tag                               | `packages/ui/tsdoc.json`. Enforced.         |
| Summary equals the spec `description`                  | Planned check script. Not enforced yet.     |
| `@remarks`, `@example`, `@a11y`, release tag present   | Planned check script. Not enforced yet.     |
| `@see` paths exist and cover the spec's story and a11y | Planned check script. Not enforced yet.     |
| Every variant is redeclared with a doc and `@default`  | Planned check script. Not enforced yet.     |
| `@default` matches `defaultVariants` and the spec      | Planned check script. Not enforced yet.     |
| Release tag matches the spec `status` and `internal`   | Planned check script. Not enforced yet.     |
| `@a11y` WCAG numbers appear in the spec                | Planned check script. Not enforced yet.     |

Until the script exists, review these by hand.

## Adopting the standard

`Button` is the first component to follow it, and is the reference to copy.
Other components migrate one group at a time. A component is migrated when it
has every element listed above, its `WHY` sections are under `@remarks`, and
`npm run lint` passes.

New components follow the standard from the start. The `ui-component-creator`
agent is updated to write the doc comment along with the spec.

## Checklist

Before you finish a component:

- [ ] The summary matches the spec `description`.
- [ ] `@remarks` holds the reasoning, with a "Why" heading for each topic.
- [ ] There is one short `@example`.
- [ ] `@a11y` covers element, name, keyboard and criteria.
- [ ] There is an `@see` for the spec, the story and the accessibility page.
- [ ] Every type and every prop has a comment.
- [ ] Every variant is redeclared with a comment and `@default`.
- [ ] There is one release tag.
- [ ] `npm run lint` passes.
