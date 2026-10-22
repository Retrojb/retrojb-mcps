/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * Slots: `root` wraps everything; `field` is the `<label>` that holds the box and
 * the label text, so the whole row is one click target; `box` is a 24px cell the
 * `control` (the real `<input>`) and the `check` / `dash` glyphs stack in; `label`,
 * `description` and `error` are the text.
 *
 *
 * WHY `appearance-none` ON THE REAL INPUT
 *
 * The drawn box *is* the native `<input type="checkbox">`, with its platform
 * rendering switched off. It stays the focus target, the click target, the thing
 * `FormData` reads and the thing assistive technology reports — including
 * `mixed` for `indeterminate`, which no `aria-*` attribute has to fake. The
 * alternative, a visually hidden input behind a styled `<span>`, works too but
 * puts the focus ring and the pointer target on two different elements that
 * have to be kept in sync.
 *
 * The check and the dash are SVG siblings after the input, shown with `peer-*`
 * variants on its `:checked` and `:indeterminate` state. They take no pointer
 * events, so a click on the glyph lands on the input beneath it.
 *
 *
 * TARGET SIZE (2.5.8)
 *
 * The box is 20px, inside a 24px cell, inside a `<label>` that is at least 24px
 * tall and spans the box, the gap and the text. A click anywhere in it toggles
 * the input, so the target is the whole row and never smaller than 24 × 24.
 *
 * Slot names, top down: `root`, `field`, `box`, `control`, `check`, `dash`,
 * `label`, `description`, `error`.
 */
import { tv, type VariantProps } from "../../../lib/tv";

/*
 * Shared by the check and the dash. `--accent-foreground` on `--accent` is
 * 9.32 / 10.19:1, so the mark clears 1.4.11 against the fill it sits on.
 */
const INDICATOR = [
  "pointer-events-none col-start-1 row-start-1 hidden size-4",
  "text-accent-foreground",
  "forced-colors:forced-color-adjust-none forced-colors:text-[SelectedItemText]",
];

const checkboxStyles = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-(--spacing-10)",
    /*
     * The disabled look lives here rather than on the input so the box, the
     * glyph and the label dim together. `has-[input:disabled]` also matches an
     * input disabled by an ancestor `<fieldset disabled>`, which is how
     * `CheckboxGroup` disables its children.
     */
    field: [
      "inline-flex w-fit min-h-6 items-start gap-(--spacing-20)",
      "cursor-pointer",
      "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60",
    ],
    box: "relative grid size-6 shrink-0 place-items-center",
    control: [
      // `peer` so the glyph siblings can follow the input's checked state.
      "peer col-start-1 row-start-1 m-0 size-5 appearance-none",
      /*
       * Half the control radius, not `rounded-control` itself. On a 20px box the
       * full 8px reads as a circle, and the square corner is the cue that tells
       * a checkbox apart from a radio button. Deriving it from `--radius-control`
       * keeps it theme-overridable.
       */
      "rounded-[calc(var(--radius-control)/2)]",
      /*
       * Unchecked: `--border-strong` at 2px. It identifies the control, so
       * 1.4.11 applies — 6.36 / 4.50:1 against the `--surface-raised` fill and
       * 4.16 / 4.41:1 against `--background` outside it. `--border` at
       * 1.75–2.67:1 would fail.
       */
      "border-2 border-border-strong bg-surface-raised",
      /*
       * Checked and indeterminate: an `--accent` fill, 6.19 / 8.87:1 on
       * `--background` and 8.82 / 9.72:1 on `--surface`.
       */
      "checked:border-accent checked:bg-accent",
      "indeterminate:border-accent indeterminate:bg-accent",
      "enabled:hover:border-accent",
      "cursor-pointer disabled:cursor-not-allowed",
      "transition-colors motion-reduce:transition-none",
      // The package-wide indicator: 2px at a 2px offset, an outline so it
      // survives forced-colors mode. --focus on --background is 6.19 / 8.87:1.
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
      /*
       * Forced colors. The browser would otherwise repaint the fill to `Canvas`
       * in both states, leaving the glyph as the only difference. Opting the box
       * out and painting it with system colours gives the checked state a filled
       * box, as a native checkbox has, in whatever palette the user chose.
       */
      "forced-colors:forced-color-adjust-none",
      "forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]",
      "forced-colors:checked:border-[SelectedItem] forced-colors:checked:bg-[SelectedItem]",
      "forced-colors:indeterminate:border-[SelectedItem] forced-colors:indeterminate:bg-[SelectedItem]",
      "forced-colors:enabled:hover:border-[Highlight]",
      "forced-colors:focus-visible:outline-[Highlight]",
      "forced-colors:disabled:border-[GrayText] forced-colors:disabled:checked:bg-[GrayText]",
      "forced-colors:disabled:indeterminate:bg-[GrayText]",
    ],
    /*
     * The check, shown only when checked *and not* indeterminate — a checkbox
     * can be both, and `mixed` is what the input reports, so the dash wins.
     */
    check: [INDICATOR, "peer-[:checked:not(:indeterminate)]:block"],
    dash: [INDICATOR, "peer-indeterminate:block"],
    // `text-body-sm` with `leading-6`: a 24px line, so a one-line label centres
    // on the 24px cell. `leading-6` rather than the `/6` modifier, because the
    // modifier replaces the role's weight and tracking defaults as well.
    // 13.30 / 15.72:1 on --background, 18.95 / 17.21:1 on --surface.
    label: "min-w-0 text-body-sm leading-6 text-foreground",
    /*
     * Indented by the cell plus the gap (24 + 8px) so helper text lines up under
     * the label text, not under the box. 6.25 / 6.62:1 on --background.
     */
    description: "m-0 ps-(--spacing-80) text-body-sm text-foreground-muted",
    // 6.26 / 8.22:1 on --background. Paired with `aria-invalid` and the border
    // colour, so the error is conveyed by more than red text (1.4.1).
    error: "m-0 ps-(--spacing-80) text-body-sm font-medium text-danger",
  },
  variants: {
    invalid: {
      false: {},
      /*
       * The border stays red in every state, so a checked box in an invalid
       * field still reads as invalid. `--danger` is 9.56 / 8.38:1 on the
       * `--surface-raised` fill.
       */
      true: {
        control: [
          "border-danger checked:border-danger indeterminate:border-danger",
          "enabled:hover:border-danger",
        ],
      },
    },
  },
  defaultVariants: {
    invalid: false,
  },
});

export { checkboxStyles };
export type CheckboxVariants = VariantProps<typeof checkboxStyles>;
