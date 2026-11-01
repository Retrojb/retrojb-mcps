/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * Slots: `root` wraps everything; `header` is the row holding the `label` and
 * the visible `value` readout; `track` is the `role="progressbar"` element and
 * the bordered box that shows the whole range; `indicator` is the fill inside
 * it; `description` is the helper text under the bar.
 *
 *
 * WHY THE TRACK HAS A BORDER (1.4.11)
 *
 * In a determinate bar the reader judges "how far along" by comparing the fill
 * with the space left over, so the track's extent is information, not
 * decoration. It needs an edge that clears 3:1 against what the bar sits on,
 * and its fill cannot provide one: `--surface` on `--background` is 1.42 /
 * 1.09:1. So the edge is `--border-strong`: 4.16 / 4.41:1 on `--background`,
 * 5.93 / 4.83:1 on `--surface` and 6.36 / 4.50:1 on `--surface-raised`.
 * `--border` at 1.75 / 2.02:1 on `--background` would fail.
 *
 * The edge that carries the *value* is where the fill ends and the empty
 * track begins. Every tone's fill clears 3:1 against the `--surface` track by a
 * wide margin; the measured ratios are on the `tone` variant below.
 *
 * The fill meets the track border at the ends, and that pairing is low
 * (`--accent` on `--border-strong` is 1.48 / 2.00:1). It carries nothing: the
 * outer extent is read from the border against the page, and the value from
 * the fill against the empty track.
 *
 *
 * TONE IS NOT THE MESSAGE (1.4.1)
 *
 * `tone` recolours the fill and nothing else. "Upload failed" has to be said in
 * the `label`, the `valueText` or the `description` as well. A red bar on its
 * own reads as a green bar in greyscale and as `Highlight` in forced colors.
 *
 *
 * INDETERMINATE, AND REDUCED MOTION (2.3.1, 2.3.3)
 *
 * With no value the indicator is a 40%-wide segment that slides across the
 * track once every 1.8s (`animate-progress-indeterminate`, defined in
 * `styles/theme.css`). It is a smooth translation, not a flash, so 2.3.1 does
 * not come into it: nothing changes luminance in place, let alone three times a
 * second.
 *
 * Under `prefers-reduced-motion: reduce` the animation is switched off and the
 * indicator becomes a still, full-width band of diagonal stripes in the tone
 * colour. It does not move at all, and it still differs from every
 * determinate state: a solid full bar would read as "done", and an empty one
 * as "not started". Stripes are the conventional "working, amount unknown"
 * pattern, and they read that way without motion. The stripes are the tone
 * colour on the `--surface` track, so the same ratios apply.
 *
 *
 * RIGHT-TO-LEFT
 *
 * The determinate fill is a block with an `inline-size`, so it starts at the
 * inline start on its own: the left in LTR, the right under `dir="rtl"`. The
 * indeterminate segment is placed with `start-0` and moved with a transform,
 * and transforms are physical. `--retrojb-progress-direction` flips to `-1`
 * under `rtl:` and the keyframes multiply by it, so the segment travels from
 * the inline start to the inline end in both directions.
 *
 *
 * FORCED COLORS
 *
 * Left alone, the browser repaints backgrounds to `Canvas` and the fill
 * disappears. The track and the indicator opt out and paint with system
 * colours: a `CanvasText` edge on a `Canvas` track, and a `Highlight` fill (or
 * `Highlight` stripes, under reduced motion).
 *
 *
 * THICKNESS
 *
 * The track is 8 / 12 / 16px (`sm` / `md` / `lg`), `--spacing-20` to
 * `--spacing-40`, border included (`box-border`). It is not a control, so
 * 2.5.8 does not apply to it.
 *
 * Slot names, top down: `root`, `header`, `label`, `value`, `track`,
 * `indicator`, `description`.
 */
import { tv, type VariantProps } from "../../../lib/tv";
import type { AlertTone } from "../tone";

/*
 * The fill colour per tone, set as `color` so `bg-current` and the reduced-
 * motion stripes (`currentColor`) both pick it up from one class. Ratios are
 * against the `--surface` track, light / dark, from `checkContrast`.
 *
 * The same three tones as the alerts, for the same reason: there is no
 * `--warning` token. See the note on `ALERT_TONE` in `../tone.ts`.
 */
const PROGRESS_TONE = {
  /** 8.82 / 9.72:1 */
  info: { indicator: "text-accent" },
  /** 8.99 / 9.77:1 */
  success: { indicator: "text-success" },
  /** 8.91 / 9.00:1 */
  danger: { indicator: "text-danger" },
} as const satisfies Record<AlertTone, { indicator: string }>;

const progressBarStyles = tv({
  slots: {
    root: "min-w-0 flex-col",
    header: "flex min-w-0 items-baseline gap-(--spacing-20)",
    // 13.30 / 15.72:1 on --background, 18.95 / 17.21:1 on --surface.
    label: "min-w-0 text-foreground",
    /*
     * 6.25 / 6.62:1 on --background, 8.91 / 7.25:1 on --surface.
     * `tabular-nums` so the readout does not jitter as the digits change, and
     * `ms-auto` keeps it at the inline end when the label is hidden.
     */
    value: "ms-auto shrink-0 text-foreground-muted tabular-nums",
    track: [
      "relative box-border w-full overflow-hidden",
      "rounded-control border border-border-strong bg-surface",
      "forced-colors:forced-color-adjust-none",
      "forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]",
    ],
    indicator: [
      "block h-full bg-current",
      "forced-colors:forced-color-adjust-none forced-colors:text-[Highlight]",
    ],
    // 6.25 / 6.62:1 on --background, 8.91 / 7.25:1 on --surface.
    description: "m-0 text-body-sm text-foreground-muted",
  },
  variants: {
    // Track 8 / 12 / 16px — see THICKNESS above.
    size: {
      sm: {
        root: "gap-(--spacing-10)",
        label: "text-label-sm",
        value: "text-label-sm",
        track: "h-(--spacing-20)",
      },
      md: {
        root: "gap-(--spacing-20)",
        label: "text-label-md",
        value: "text-label-md",
        track: "h-(--spacing-30)",
      },
      lg: {
        root: "gap-(--spacing-20)",
        label: "text-label-lg",
        value: "text-label-lg",
        track: "h-(--spacing-40)",
      },
    },
    tone: PROGRESS_TONE,
    /*
     * A block that fills its container by default. `false` gives the bar a
     * 20rem inline size, capped at the container, for a bar that sits in a
     * row beside other content; `rootClassName` sets any other width.
     */
    fullWidth: {
      true: { root: "flex w-full" },
      false: { root: "inline-flex w-xs max-w-full" },
    },
    labelHidden: {
      // Visually gone, still the bar's accessible name — as on `Input`.
      true: { label: "sr-only" },
    },
    /** Computed: a visible readout is rendered. Not a caller prop. */
    showValue: {
      true: {},
      false: {},
    },
    /** Computed from `value`. Not a caller prop. */
    indeterminate: {
      /*
       * The width is set inline from the value. Animating `inline-size`
       * rather than a `scaleX` transform keeps the fill's end square and its
       * stripes undistorted; it only lays out the indicator itself.
       */
      false: {
        indicator:
          "transition-[inline-size] duration-300 ease-out motion-reduce:transition-none",
      },
      true: {
        indicator: [
          "absolute inset-y-0 start-0 w-2/5",
          "[--retrojb-progress-direction:1] rtl:[--retrojb-progress-direction:-1]",
          "animate-progress-indeterminate",
          // See INDETERMINATE, AND REDUCED MOTION above.
          "motion-reduce:animate-none motion-reduce:w-full motion-reduce:bg-transparent",
          "motion-reduce:bg-[image:repeating-linear-gradient(135deg,currentColor_0_4px,transparent_4px_8px)]",
        ],
      },
    },
  },
  compoundVariants: [
    /*
     * A hidden label with no readout leaves the header empty. Taking the
     * header out of flow (it still holds the label, so the name survives)
     * drops the gap it would otherwise leave above the track.
     */
    {
      labelHidden: true,
      showValue: false,
      class: { header: "sr-only" },
    },
  ],
  defaultVariants: {
    size: "md",
    tone: "info",
    fullWidth: true,
    labelHidden: false,
    showValue: false,
    indeterminate: false,
  },
});

export { progressBarStyles };
export type ProgressBarVariants = VariantProps<typeof progressBarStyles>;
