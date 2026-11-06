# Box shadows for buttons and components: repo findings and token proposal

First research pass, saved as written, with additions from the ten-system comparison (documents 02 to 05).

## What the repo shows today

- **No shadow tokens exist.** The only shadow in `../../../packages/ui` is Tailwind's default `shadow-lg` on the ComboBox listbox (`forms/ComboBox/styles.ts`). `toastAlert/styles.ts` says there is no shadow because the palette ships no elevation token.
- **Elevation is done with tone.** `--surface` and `--surface-raised` in `styles/tokens.css` are the only elevation tokens.
- **Shadows cannot carry meaning here.** Every component comment says focus uses `outline`, and edges use a real `border`, because forced-colors mode drops box-shadows. A shadow has to be extra depth on top of a border that already identifies the control (WCAG 1.4.11).
- **Token pattern.** `tokens.css` holds primitives and semantic roles with duplicated light and dark blocks. `theme.css` maps them into Tailwind with `var(--token, fallback)`. It warns that a token must not share a name with the Tailwind theme variable that reads it.
- **Button has no depth cue.** `buttonStyle` uses `transition-colors`, no shadow, and `border border-transparent` on every intent, which also keeps an edge in forced-colors mode.

## Proposed token structure

Keep the existing two-layer pattern: a primitive scale, then semantic roles that components use.

### 1. Colour token (the only theme-dependent colour)

```css
/* light */ --shadow-color: var(--neutral-9);
/* dark  */ --shadow-color: #000;
```

Dark needs its own value because `--neutral-9` is near-white in dark mode, so a shadow tinted with it would read as a glow.

### 2. Primitive scale

```css
--elevation-1: 0 1px 2px color-mix(in srgb, var(--shadow-color) 16%, transparent);
--elevation-2: 0 1px 2px color-mix(in srgb, var(--shadow-color) 14%, transparent),
               0 2px 6px color-mix(in srgb, var(--shadow-color) 12%, transparent);
--elevation-3: 0 2px 4px  color-mix(in srgb, var(--shadow-color) 12%, transparent),
               0 8px 16px color-mix(in srgb, var(--shadow-color) 14%, transparent);
--elevation-4: 0 4px 8px  color-mix(in srgb, var(--shadow-color) 14%, transparent),
               0 16px 32px color-mix(in srgb, var(--shadow-color) 18%, transparent);
```

- Two layers per level, a tight contact shadow plus a soft ambient one. Seven of the ten systems in document 02 do this.
- Dark mode needs higher alphas. The systems that publish dark values raise them a lot (Primer 0.04 to 0.12 in light becomes 0.4 to 0.8 in dark). Put the strength in one token (`--shadow-strength`) so only that value differs by theme, instead of restating every shadow in the dark blocks.
- `color-mix` is acceptable here. The contrast scanner refuses it for text and boundary checks, but shadows are not contrast-gated.

### 3. Semantic roles

```css
--shadow-control:        var(--elevation-1);  /* buttons at rest */
--shadow-control-hover:  var(--elevation-2);
--shadow-control-active: none;                /* pressed = flattened */
--shadow-raised:         var(--elevation-2);  /* cards */
--shadow-overlay:        var(--elevation-3);  /* popovers, listboxes, toasts */
--shadow-modal:          var(--elevation-4);  /* dialogs */
```

Expose them in `theme.css` as `--shadow-control: var(--shadow-control, <fallback>)` style mappings so components use `shadow-control`, never `shadow-md`. This matches how type roles already work.

**Naming rule:** Tailwind v4 reads `--shadow-*` theme variables as `shadow-*` utilities. The primitives need a different prefix (`--elevation-*`) so `--shadow-overlay: var(--elevation-3)` does not collide with itself.

Document 05 revises this list slightly after the cross-system comparison (an `inset` token, a hairline layer, and a z-index pairing).

## Applying it to Button

```ts
base: [
  // transition-colors does not animate shadow
  "transition-[color,background-color,box-shadow] motion-reduce:transition-none",
  ...
]
primary:   "bg-accent text-accent-foreground shadow-control hover:bg-accent-hover hover:shadow-control-hover active:shadow-control-active"
secondary: same shadow classes; the existing border stays
danger:    same shadow classes
ghost:     no shadow (it has no surface to lift)
// disabled:shadow-none
```

- **Keep `outline` for focus.** Do not use a ring shadow, for the reasons already in the component comments.
- **Keep `border border-transparent`** on primary and danger. In forced-colors mode the shadow disappears and the border is what remains.
- **Drop the shadow on press.** It reads as the button sinking and needs no `translate`.
- **Check `hover:opacity-90` on danger.** It fades the shadow with the fill.

**Whether buttons should have a resting shadow at all is a split decision across systems** (see document 02). Primer recommends one for buttons. Atlassian reserves shadow for movable cards and floating UI. Bootstrap ships component shadows switched off by default. A flat button with a good border is a legitimate default.

## Where else to use it

| Component | Role | Notes |
|---|---|---|
| Card | `shadow-raised` | Raised or interactive variant only. Flat cards keep tone and border. |
| ComboBox listbox | `shadow-overlay` | Replaces the hardcoded `shadow-lg`. |
| Toast | `shadow-overlay` | Lets the "no shadow" comment be updated. Its border stays. |
| BrowserAlert dialog | `shadow-modal` | The `::backdrop` already separates it. |
| Tag, Chip, inputs | none | Flat by design. |

## One real trade-off

If a theme variable like `--shadow-control` resolves through `var()`, Tailwind cannot see the colours inside it at build time. The `shadow-red-500` colour utilities and `shadow-control/20` opacity modifiers probably will not work on these utilities. This is untested on Tailwind 4.3.3. The Tailwind docs describe colour and opacity overrides for its own literal shadow values. The colour comes from `--shadow-color` in this proposal, so the loss is acceptable, but a one-line check of the compiled `dist/styles.css` would confirm it.

## A style decision

The values above are soft and modern. The package is called retro, and the token structure makes a hard-offset style cheap too, for example `--elevation-2: 3px 3px 0 var(--border-strong)`. An app could switch styles by overriding the semantic tokens only. Which one is the default is a product decision (open decision 1 in document 05).

## Suggested order

1. Add `--shadow-color`, the scale and the roles to `tokens.css`, and the `shadow-*` mappings to `theme.css`.
2. Apply the tokens to Button and swap ComboBox's `shadow-lg`.
3. Check both themes against `--background`, `--surface` and `--surface-raised`.
4. Add a changeset, update `ButtonSpec.yaml` and the TSDoc, and add a docs page for the tokens.

## Sources

- Tailwind box-shadow docs: https://tailwindcss.com/docs/box-shadow
- Tailwind default theme: https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css
- Repo files: `../../../packages/ui/src/styles/tokens.css`, `packages/ui/src/styles/theme.css`, `packages/ui/src/components/actions/Button/styles.ts`, `packages/ui/src/components/forms/ComboBox/styles.ts`, `packages/ui/src/components/alerts/toastAlert/styles.ts`
