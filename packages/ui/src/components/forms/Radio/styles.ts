/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `actions/Button/styles.ts`.
 *
 * Slots: `root` wraps everything; `field` is the `<label>` that holds the circle
 * and the label text, so the whole row is one click target; `box` is the cell
 * the `control` (the real `<input type="radio">`) and the `dot` stack in;
 * `label`, `description` and `error` are the text. The same layout as
 * `forms/Checkbox`, so a form that mixes the two lines up.
 *
 *
 * WHY `appearance-none` ON THE REAL INPUT
 *
 * As in `Checkbox`: the drawn circle *is* the native `<input type="radio">`,
 * with its platform rendering switched off. It stays the focus target, the click
 * target, the thing `FormData` reads and the thing assistive technology reports,
 * and the browser keeps doing everything a radio group does — one tab stop per
 * `name`, arrow keys that move and select, `required` across the group. The dot
 * is an SVG sibling after the input, shown with `peer-checked:`, and takes no
 * pointer events, so a click on it lands on the input beneath.
 *
 *
 * CHECKED IS MORE THAN COLOUR (1.4.1)
 *
 * Checked adds a shape, the dot, as well as the `--accent` fill. In greyscale,
 * or for a user who cannot tell the fill from the ring, the dot alone still
 * marks the selection. The circle itself (against `Checkbox`'s rounded square)
 * is the cue that says "one of these", not "any of these".
 *
 *
 * TARGET SIZE (2.5.8)
 *
 * The circle is 16 / 20 / 24px (`sm` / `md` / `lg`) inside a 24 / 24 / 32px
 * cell, inside a `<label>` at least that tall that spans the circle, the gap and
 * the text. A click anywhere in it selects the input, so the target is the whole
 * row and never smaller than 24 × 24 — `sm` included, because the cell and the
 * row stay 24px even though the circle shrinks. `md` is `Checkbox`'s geometry
 * exactly. None clears the 44px of 2.5.5 (AAA).
 *
 * Slot names, top down: `root`, `field`, `box`, `control`, `dot`, `label`,
 * `description`, `error`.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const radioStyles = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-(--space-1)",
    /*
     * The disabled look lives here rather than on the input so the circle, the
     * dot and the label dim together. `has-[input:disabled]` also matches an
     * input disabled by an ancestor `<fieldset disabled>`, which is how
     * `RadioGroup` disables its children.
     */
    field: [
      "inline-flex w-fit items-start gap-(--space-2)",
      "cursor-pointer",
      "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60",
    ],
    box: "relative grid shrink-0 place-items-center",
    control: [
      // `peer` so the dot sibling can follow the input's checked state.
      "peer col-start-1 row-start-1 m-0 appearance-none rounded-full",
      /*
       * Unchecked: `--border-strong` at 2px. It identifies the control, so
       * 1.4.11 applies — 6.36 / 4.50:1 against the `--surface-raised-1` fill and
       * 4.16 / 4.41:1 against `--background` outside it. `--border` at
       * 1.75–2.67:1 would fail.
       */
      "border-2 border-border-strong bg-surface-raised-1",
      /*
       * Checked: an `--accent` fill, 6.19 / 8.87:1 on `--background` and
       * 8.82 / 9.72:1 on `--surface-base` — the same fill as a checked `Checkbox`.
       */
      "checked:border-accent checked:bg-accent",
      "enabled:hover:border-accent",
      "cursor-pointer disabled:cursor-not-allowed",
      "transition-colors motion-reduce:transition-none",
      /*
       * The package-wide indicator: 2px at a 2px offset, an outline so it
       * survives forced-colors mode. Outlines follow `border-radius` in every
       * current engine, so the ring is a circle around the circle. --focus on
       * --background is 6.19 / 8.87:1.
       */
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
      /*
       * Forced colors. The browser would otherwise repaint the fill to `Canvas`
       * in both states, leaving the dot as the only difference. Opting the
       * circle out and painting it with system colours gives the checked state
       * a filled circle in whatever palette the user chose, as `Checkbox` does.
       */
      "forced-colors:forced-color-adjust-none",
      "forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]",
      "forced-colors:checked:border-[SelectedItem] forced-colors:checked:bg-[SelectedItem]",
      "forced-colors:enabled:hover:border-[Highlight]",
      "forced-colors:focus-visible:outline-[Highlight]",
      "forced-colors:disabled:border-[GrayText] forced-colors:disabled:checked:bg-[GrayText]",
    ],
    /*
     * The dot. `--accent-foreground` on `--accent` is 9.32 / 10.19:1, so it
     * clears 1.4.11 against the fill it sits on. Under forced colors it is
     * `SelectedItemText` on `SelectedItem`, and `Canvas` on the `GrayText` fill
     * of a disabled checked radio — the pairing `SegmentedControl` uses.
     */
    dot: [
      "pointer-events-none col-start-1 row-start-1 hidden",
      "text-accent-foreground peer-checked:block",
      "forced-colors:forced-color-adjust-none forced-colors:text-[SelectedItemText]",
      "forced-colors:peer-disabled:text-[Canvas]",
    ],
    // 13.30 / 15.72:1 on --background, 18.95 / 17.21:1 on --surface-base. The type
    // role and line height are set per size, below, so tailwind-merge never
    // sees a role in one place drop a `leading-*` from another.
    label: "min-w-0 text-foreground",
    // Indented by the cell plus the gap, per size, so helper text lines up
    // under the label text, not under the circle. 6.25 / 6.62:1 on --background.
    description: "m-0 text-body-sm text-foreground-muted",
    // 6.26 / 8.22:1 on --background. Paired with `aria-invalid` and the border
    // colour, so the error is conveyed by more than red text (1.4.1).
    error: "m-0 text-body-sm font-medium text-danger",
  },
  variants: {
    /*
     * Circle / dot / cell: 16 / 6 / 24px, 20 / 8 / 24px, 24 / 10 / 32px. The
     * dot is about 40% of the circle in each, which leaves a clear ring of fill
     * around it inside the 2px border. The label line height matches the cell,
     * so a one-line label centres on the circle.
     */
    size: {
      sm: {
        field: "min-h-6",
        box: "size-6",
        control: "size-4",
        dot: "size-1.5",
        label: "text-body-sm leading-6",
        description: "ps-[calc(--spacing(6)+var(--space-2))]",
        error: "ps-[calc(--spacing(6)+var(--space-2))]",
      },
      md: {
        field: "min-h-6",
        box: "size-6",
        control: "size-5",
        dot: "size-2",
        label: "text-body-sm leading-6",
        description: "ps-[calc(--spacing(6)+var(--space-2))]",
        error: "ps-[calc(--spacing(6)+var(--space-2))]",
      },
      lg: {
        field: "min-h-8",
        box: "size-8",
        control: "size-6",
        dot: "size-2.5",
        label: "text-body-md leading-8",
        description: "ps-[calc(--spacing(8)+var(--space-2))]",
        error: "ps-[calc(--spacing(8)+var(--space-2))]",
      },
    },
    invalid: {
      false: {},
      /*
       * The border stays red in every state, so a checked radio in an invalid
       * group still reads as invalid. `--danger` is 9.56 / 8.38:1 on the
       * `--surface-raised-1` fill.
       */
      true: {
        control: [
          "border-danger checked:border-danger",
          "enabled:hover:border-danger",
        ],
      },
    },
  },
  defaultVariants: {
    size: "md",
    invalid: false,
  },
});

export { radioStyles };
export type RadioVariants = VariantProps<typeof radioStyles>;
