/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * Slots: `root` wraps everything; `field` is the `<label>` that holds the track
 * and the label text, so the whole row is one click target; `cell` is a 24px-tall
 * grid the `control` (the real `<input>`, drawn as the track) and the `thumb`
 * stack in; `glyph` is the check inside the thumb; `label`, `description` and
 * `error` are the text.
 *
 *
 * THE TRACK IS THE REAL INPUT
 *
 * The same pattern as `forms/Checkbox`: the native `<input type="checkbox">`
 * with `appearance-none` is the drawn shape — here a pill rather than a box — so
 * focus, clicks, `FormData` and the reported state stay native. The thumb is a
 * `pointer-events-none` sibling after it, moved and recoloured with `peer-*`
 * variants on the input's `:checked` state. A click on the thumb lands on the
 * track beneath it.
 *
 * Nothing is imported from the Checkbox styles. The two share conventions, not
 * values: the box geometry, the glyph swap and the indeterminate state have no
 * counterpart here, and a shared fragment would make a change to one quietly
 * restyle the other.
 *
 *
 * ON AND OFF ARE MORE THAN COLOUR (1.4.1)
 *
 * Three cues change together, and any one of them identifies the state:
 *
 *   - position: the thumb sits at the start when off and slides to the end;
 *   - fill: the track goes from the near-white `--surface-raised` to the solid
 *     `--accent`, a luminance change of 9.45 / 9.05:1, not just a hue change;
 *   - glyph: a check appears in the thumb when on.
 *
 * The glyph is there because position alone is ambiguous without a reference —
 * a single switch on its own gives no way to tell which end is "on".
 *
 *
 * TARGET SIZE (2.5.8)
 *
 * The `md` track is 44 × 24 and clears 24 × 24 on its own. The `sm` track is
 * 36 × 20, but it sits in a 24px cell inside a `<label>` that is at least 24px
 * tall and spans the track, the gap and the text. A click anywhere in it toggles
 * the input, so the target is the whole row in both sizes.
 *
 * Slot names, top down: `root`, `field`, `cell`, `control`, `thumb`, `glyph`,
 * `label`, `description`, `error`.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const toggleStyles = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-(--spacing-10)",
    /*
     * The disabled look lives here rather than on the input so the track, the
     * thumb and the label dim together. `has-[input:disabled]` also matches an
     * input disabled by an ancestor `<fieldset disabled>`.
     */
    field: [
      "flex min-h-6 items-start gap-(--spacing-20)",
      "cursor-pointer",
      "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60",
    ],
    cell: "relative grid h-6 shrink-0 items-center",
    control: [
      // `peer` so the thumb sibling can follow the input's checked state.
      "peer col-start-1 row-start-1 m-0 appearance-none rounded-full",
      /*
       * Off: a `--surface-raised` fill inside a 2px `--border-strong` edge. The
       * edge is what identifies the control, so 1.4.11 applies — 4.16 / 4.41:1
       * against `--background`, 5.93 / 4.83:1 against `--surface` and
       * 6.36 / 4.50:1 against the fill inside it. `--border` at 1.75 / 2.02:1
       * would fail.
       */
      "border-2 border-border-strong bg-surface-raised",
      /*
       * On: a solid `--accent` track, 6.19 / 8.87:1 on `--background` and
       * 8.82 / 9.72:1 on `--surface`.
       */
      "checked:border-accent checked:bg-accent",
      "enabled:hover:border-accent",
      "cursor-pointer disabled:cursor-not-allowed",
      "transition-colors motion-reduce:transition-none",
      // The package-wide indicator: 2px at a 2px offset, an outline so it
      // survives forced-colors mode. --focus on --background is 6.19 / 8.87:1.
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
      /*
       * Forced colors. Left alone, the browser repaints the track to `Canvas`
       * in both states and the thumb (a plain `<span>`) disappears with it.
       * Opting out and painting with system colours keeps a filled track when
       * on, as Checkbox does with its box.
       */
      "forced-colors:forced-color-adjust-none",
      "forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]",
      "forced-colors:checked:border-[SelectedItem] forced-colors:checked:bg-[SelectedItem]",
      "forced-colors:enabled:hover:border-[Highlight]",
      "forced-colors:focus-visible:outline-[Highlight]",
      "forced-colors:disabled:border-[GrayText] forced-colors:disabled:checked:bg-[GrayText]",
    ],
    /*
     * Off: a `--border-strong` disc on the `--surface-raised` track,
     * 6.36 / 4.50:1. On: an `--accent-foreground` disc on the `--accent` track,
     * 9.32 / 10.19:1. Both clear 1.4.11 against the fill they sit on.
     *
     * `ms-` and the `rtl:` translate keep "off" at the inline start in a
     * right-to-left page as well. The glyph inherits `currentColor`, which is
     * transparent until the input is checked, so there is no second element to
     * show and hide.
     */
    thumb: [
      "pointer-events-none col-start-1 row-start-1 grid place-items-center",
      "ms-(--spacing-10) justify-self-start rounded-full",
      "bg-border-strong text-transparent",
      "peer-checked:bg-accent-foreground peer-checked:text-accent",
      "transition-all motion-reduce:transition-none",
      /*
       * Forced colors: `CanvasText` off, `SelectedItemText` on the
       * `SelectedItem` track with a `SelectedItem` glyph, `GrayText` /
       * `Canvas` when disabled. `transparent` survives the opt-out, so the
       * glyph stays hidden while off.
       */
      "forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]",
      "forced-colors:peer-checked:bg-[SelectedItemText] forced-colors:peer-checked:text-[SelectedItem]",
      "forced-colors:peer-disabled:bg-[GrayText]",
      "forced-colors:peer-disabled:peer-checked:bg-[Canvas] forced-colors:peer-disabled:peer-checked:text-[GrayText]",
    ],
    // `--accent` on the `--accent-foreground` thumb: 9.32 / 10.19:1.
    glyph: "pointer-events-none",
    // The type role is set per size, below. 13.30 / 15.72:1 on --background,
    // 18.95 / 17.21:1 on --surface.
    label: "min-w-0 text-foreground",
    // 6.25 / 6.62:1 on --background, 8.91 / 7.25:1 on --surface.
    description: "m-0 text-body-sm text-foreground-muted",
    // 6.26 / 8.22:1 on --background, 8.91 / 9.00:1 on --surface. Paired with
    // `aria-invalid` and the border colour, so the error is conveyed by more
    // than red text (1.4.1).
    error: "m-0 text-body-sm font-medium text-danger",
  },
  variants: {
    /*
     * Geometry. The track has a 2px border and the thumb sits 2px inside it,
     * so the thumb is inset 4px from the outer edge and travels the track
     * width minus the thumb minus both insets:
     *
     *   sm  36 × 20 track, 12px thumb, travels 36 − 12 − 8 = 16px
     *   md  44 × 24 track, 16px thumb, travels 44 − 16 − 8 = 20px
     *
     * Both labels take `leading-6`, a 24px line, so a one-line label centres on
     * the 24px cell. It comes *after* the role: tailwind-merge treats a font
     * size as overriding an earlier line height, so the other order drops it.
     */
    size: {
      sm: {
        control: "h-5 w-9",
        thumb:
          "size-3 peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4",
        glyph: "size-2",
        label: "text-body-sm leading-6",
      },
      md: {
        control: "h-6 w-11",
        thumb:
          "size-4 peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5",
        glyph: "size-2.5",
        label: "text-body-md leading-6",
      },
    },
    /*
     * `start` puts the label before the track and spreads the row across its
     * container, so a column of settings lines its switches up at the end.
     * `end` keeps the row to its content, like Checkbox.
     */
    labelPosition: {
      start: { field: "w-full justify-between" },
      end: { field: "w-fit" },
    },
    invalid: {
      false: {},
      /*
       * The border stays red on and off, so an on switch in an invalid field
       * still reads as invalid. `--danger` is 9.56 / 8.38:1 on the
       * `--surface-raised` fill.
       */
      true: {
        control:
          "border-danger checked:border-danger enabled:hover:border-danger",
      },
    },
  },
  /*
   * Helper text lines up with the label text, never under the track: indented
   * by the track plus the gap when the label is at the end, and kept clear of
   * it when the label is at the start.
   *
   *   sm  36 + 8 = 44px  `--spacing-200`
   *   md  44 + 8 = 52px  `--spacing-400`
   */
  compoundVariants: [
    {
      size: "sm",
      labelPosition: "end",
      class: {
        description: "ps-(--spacing-200)",
        error: "ps-(--spacing-200)",
      },
    },
    {
      size: "md",
      labelPosition: "end",
      class: {
        description: "ps-(--spacing-400)",
        error: "ps-(--spacing-400)",
      },
    },
    {
      size: "sm",
      labelPosition: "start",
      class: {
        description: "pe-(--spacing-200)",
        error: "pe-(--spacing-200)",
      },
    },
    {
      size: "md",
      labelPosition: "start",
      class: {
        description: "pe-(--spacing-400)",
        error: "pe-(--spacing-400)",
      },
    },
  ],
  defaultVariants: {
    size: "md",
    labelPosition: "start",
    invalid: false,
  },
});

export { toggleStyles };
export type ToggleVariants = VariantProps<typeof toggleStyles>;
