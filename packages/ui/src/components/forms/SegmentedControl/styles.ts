/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * Slots: `root` is the `<fieldset role="radiogroup">`; `legend` is its label;
 * `track` is the bordered strip the segments sit in; `segment` is the `<label>`
 * for one option, a one-cell grid the `control` (the real `<input
 * type="radio">`), the `text` and the `sizer` stack in.
 *
 *
 * THE SEGMENT IS THE REAL INPUT
 *
 * The same pattern as `forms/Checkbox` and `forms/Toggle`: the native radio,
 * with `appearance-none`, is stretched over the whole segment and *is* the drawn
 * shape. Focus ring, pointer target, `FormData` and the state assistive
 * technology reads are all on that one element. The text is a
 * `pointer-events-none` sibling after it that follows its `:checked` state with
 * `peer-*` variants, so a click on the text lands on the input beneath it.
 *
 *
 * SELECTED IS MORE THAN COLOUR (1.4.1)
 *
 * Three cues change together, and any one of them identifies the selection:
 *
 *   - shape: only the selected segment has a box at all. The others are
 *     transparent on the track, so in greyscale the selection is still the one
 *     filled shape in the row;
 *   - fill: `--surface` to `--accent`, a luminance change of 8.82 / 9.72:1, not
 *     only a hue change;
 *   - weight: the text goes from the label role's 500 to 600.
 *
 * A weight change on its own would make the segment wider and shove its
 * neighbours sideways. `sizer` is an invisible, `aria-hidden` copy of the label
 * set in the selected weight, stacked in the same grid cell, so every segment
 * is always as wide as its bold self and nothing moves.
 *
 *
 * NO SLIDING INDICATOR
 *
 * Each segment draws its own selected state, so there is no separate thumb to
 * animate and nothing to measure. Only colour transitions, and they are
 * switched off under `prefers-reduced-motion` (2.3.3).
 *
 *
 * TARGET SIZE (2.5.8)
 *
 * Segments are 24 / 32 / 40px tall (`sm` / `md` / `lg`) and at least as wide as
 * their label plus 16–32px of padding, so all three clear 24 × 24 on their own.
 * None clears the 44px of 2.5.5 (AAA). The track adds 4px of padding and a 1px
 * border on every side, so its outer height is 34 / 42 / 50px.
 *
 * Slot names, top down: `root`, `legend`, `track`, `segment`, `control`,
 * `text`, `sizer`.
 */
import { tv, type VariantProps } from "../../../lib/tv";

/*
 * Concentric with the track: half of `--radius-control` inside a track with
 * 4px of padding reads as the same curve as the track's own corner. The full
 * radius on a 24px segment is nearly a pill. Derived from `--radius-control`,
 * as `Checkbox` derives its box corner, so it stays theme-overridable.
 */
const SEGMENT_RADIUS = "rounded-[calc(var(--radius-control)/2)]";

/** Shared by `text` and `sizer`, so the two always occupy the same box. */
const LABEL_BOX =
  "pointer-events-none col-start-1 row-start-1 whitespace-nowrap";

const segmentedControlStyles = tv({
  slots: {
    // The fieldset reset from `CheckboxGroup`: no UA border, padding or margin,
    // and `min-w-0` undoes `min-inline-size: min-content`.
    root: "m-0 min-w-0 border-0 p-0",
    // 13.30 / 15.72:1 on --background, 18.95 / 17.21:1 on --surface.
    legend: "mb-(--spacing-20) p-0 text-label-md text-foreground",
    /*
     * The track is a meaningful region — it is what groups the segments into
     * one control — so its edge is `--border-strong`: 4.16 / 4.41:1 against
     * `--background` outside it and 5.93 / 4.83:1 against the `--surface` fill
     * inside. `--border` at 1.75 / 2.02:1 would fail 1.4.11.
     */
    track: [
      "max-w-full items-stretch gap-(--spacing-10) p-(--spacing-10)",
      "rounded-control border border-border-strong bg-surface",
    ],
    /*
     * The disabled look lives here rather than on the input so the fill and
     * the text dim together. `has-[input:disabled]` also matches an input
     * disabled by the fieldset's own `disabled`.
     */
    segment: [
      "relative grid items-center justify-items-center",
      "cursor-pointer",
      "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60",
    ],
    control: [
      // `peer` so the text siblings can follow the input's checked state.
      "peer col-start-1 row-start-1 m-0 size-full appearance-none",
      SEGMENT_RADIUS,
      "border border-transparent bg-transparent",
      /*
       * Selected: a solid `--accent` box, 8.82 / 9.72:1 against the `--surface`
       * track it sits on, so the indicator clears 1.4.11 as a state.
       */
      "checked:border-accent checked:bg-accent",
      // Decorative hover on unselected segments only; the text, not this fill,
      // is what identifies them.
      "enabled:not-checked:hover:bg-surface-raised",
      "cursor-pointer disabled:cursor-not-allowed",
      "transition-colors motion-reduce:transition-none",
      /*
       * The package-wide indicator: 2px at a 2px offset, an outline so it
       * survives forced-colors mode. The offset ring sits on the `--surface`
       * track, 8.82 / 9.72:1, and is separated from a selected `--accent` fill
       * by a 2px band of that surface.
       */
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
      /*
       * Forced colors. Left alone, the browser repaints the input to `Canvas`
       * in both states and the selection disappears. Opting out and painting
       * with system colours gives the selected segment a `SelectedItem` box,
       * as Checkbox and Toggle do with their fills. The track is not opted out:
       * the browser draws its border in `CanvasText` on `Canvas` by itself.
       */
      "forced-colors:forced-color-adjust-none",
      "forced-colors:checked:border-[SelectedItem] forced-colors:checked:bg-[SelectedItem]",
      "forced-colors:enabled:not-checked:hover:bg-transparent",
      "forced-colors:enabled:hover:border-[Highlight]",
      "forced-colors:focus-visible:outline-[Highlight]",
      "forced-colors:disabled:checked:border-[GrayText] forced-colors:disabled:checked:bg-[GrayText]",
    ],
    /*
     * Unselected: `--foreground` on the `--surface` track, 18.95 / 17.21:1, and
     * 20.31 / 16.04:1 on the `--surface-raised` hover fill. Selected:
     * `--accent-foreground` on `--accent`, 9.32 / 10.19:1.
     */
    text: [
      LABEL_BOX,
      "text-foreground peer-checked:font-semibold peer-checked:text-accent-foreground",
      "transition-colors motion-reduce:transition-none",
      "forced-colors:forced-color-adjust-none forced-colors:text-[CanvasText]",
      "forced-colors:peer-checked:text-[SelectedItemText]",
      "forced-colors:peer-disabled:text-[GrayText]",
      "forced-colors:peer-disabled:peer-checked:text-[Canvas]",
    ],
    // Reserves the selected weight's width; never painted, never announced.
    sizer: [LABEL_BOX, "invisible font-semibold"],
  },
  variants: {
    /*
     * Segment heights 24 / 32 / 40px — see TARGET SIZE above. The type role
     * goes on `text` and `sizer` alike. `font-semibold` sets `--tw-font-weight`,
     * which the role reads before its own default, so the weight survives it.
     */
    size: {
      sm: {
        segment: "h-6",
        text: "px-(--spacing-20) text-label-md",
        sizer: "px-(--spacing-20) text-label-md",
      },
      md: {
        segment: "h-8",
        text: "px-(--spacing-30) text-label-md",
        sizer: "px-(--spacing-30) text-label-md",
      },
      lg: {
        segment: "h-10",
        text: "px-(--spacing-40) text-label-lg",
        sizer: "px-(--spacing-40) text-label-lg",
      },
    },
    /*
     * Content-sized by default. `fullWidth` stretches the track across its
     * container and shares the width equally between the segments.
     */
    fullWidth: {
      false: { track: "inline-flex" },
      true: { track: "flex w-full", segment: "flex-1" },
    },
    labelHidden: {
      // Visually gone, still the group's accessible name — as on `Input`.
      true: { legend: "sr-only" },
    },
  },
  defaultVariants: {
    size: "md",
    fullWidth: false,
  },
});

export { segmentedControlStyles };
export type SegmentedControlVariants = VariantProps<
  typeof segmentedControlStyles
>;
