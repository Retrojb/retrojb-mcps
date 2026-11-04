/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `actions/Button/styles.ts`.
 *
 * Single element: the `<svg>` that the Lucide component renders. There are no
 * slots, because there is nothing to wrap — a wrapper `<span>` would only add a
 * box that a flex row then has to align.
 *
 *
 * SIZE
 *
 * 16 / 20 / 24px (`sm` / `md` / `lg`), `--spacing-40` to `--spacing-60`. The
 * same three steps as `Button`, `ProgressBar` and `SegmentedControl`, and no
 * `xs` or `xl`, because no sibling has them either:
 *
 *   - `sm`, 16px, sits beside `label-md` / `body-sm` text (14px, 21px line
 *     box) and inside `sm` and `md` controls;
 *   - `md`, 20px, sits beside `label-lg` / `body-md` text (16px, 24px line
 *     box) and is the default;
 *   - `lg`, 24px, is Lucide's native grid, for `lg` controls and stand-alone
 *     status icons.
 *
 * Each is set twice: as a `size-*` class here, so `className="size-8"` can
 * replace it through tailwind-merge, and as the `width` / `height` attributes
 * in `Icon.tsx`, so an app that has not loaded the stylesheet still gets the
 * right size instead of Lucide's 24px. CSS beats a presentation attribute, so
 * the class wins whenever both are present.
 *
 *
 * STROKE WIDTH
 *
 * Lucide draws on a 24-unit grid with a 2-unit stroke, and the stroke scales
 * with the icon. At 16px that is a 1.33px line, which anti-aliases across two
 * device pixels on a 1x screen and reads lighter than the colour it is drawn
 * in. The measured ratios below assume the stroke actually shows its colour,
 * so `sm` thickens to 2.25 units (1.5px). `md` and `lg` keep Lucide's 2 (1.67
 * and 2px). See `ICON_STROKE_WIDTH`.
 *
 * `absoluteStrokeWidth` is not used. In lucide-react 1.61 it is deprecated in
 * favour of `nonScalingStroke`, which sets `vector-effect: non-scaling-stroke`
 * on every path; both give one fixed pixel width at every size, which is the
 * opposite of what a 16 / 20 / 24 scale wants. A caller can still pass
 * `strokeWidth` or `nonScalingStroke`; both reach Lucide untouched.
 *
 *
 * COLOUR (1.4.11)
 *
 * Lucide paints with `stroke="currentColor"`, so with no `tone` the icon is
 * whatever colour the text around it is — inside a primary `Button` that is
 * `--accent-foreground` on `--accent` (9.32 / 10.19:1), inside an `InlineAlert`
 * it is `--foreground` on `--surface`. That inherited pairing is the one that
 * has to clear 3:1 for a meaningful icon, and it is the caller's surface, so
 * it cannot be checked here.
 *
 * `tone` sets `color` to a semantic token. Every one clears 3:1 against all
 * three page surfaces in both themes; the ratios are on the variant below.
 * Decorative icons carry no 1.4.11 requirement, but the tones do not need the
 * exemption.
 *
 *
 * FORCED COLORS
 *
 * No `forced-color-adjust: none` opt-out; one `color` reset instead.
 *
 * Browsers give `<svg>` `forced-color-adjust: preserve-parent-color` in their
 * UA stylesheet. Under it, an svg whose `color` is inherited takes the
 * parent's *forced* colour — `CanvasText`, or `LinkText` inside a link — so an
 * untoned icon follows the system text colour on its own. But an svg with its
 * own `color` keeps it, as if it had opted out. Measured in Chrome with
 * forced colors emulated: an untoned icon in a link went to the forced link
 * colour, while a `text-danger` icon stayed #900204 on the forced `Canvas`.
 * On a dark high-contrast theme that is about 2:1.
 *
 * So `forced-colors:text-current` is in the base. `color: currentColor` counts
 * as inherited under `preserve-parent-color`, so every tone falls back to the
 * forced parent colour. That is correct: tone is never the only carrier of
 * the meaning (1.4.1), and the brand colours were never measured against a
 * user-chosen background.
 *
 *
 * RIGHT-TO-LEFT
 *
 * `mirrorInRtl` flips the icon horizontally with `scale: -1 1` under
 * `dir="rtl"`. Tailwind's `rtl:` variant matches `:dir(rtl)` and any
 * `[dir="rtl"]` ancestor. Which icons should mirror is on the prop's JSDoc in
 * `types.ts`.
 */
import { tv, type VariantProps } from "../../../lib/tv";
import type { AlertTone } from "../../alerts/tone";

/** The icon's edge in CSS pixels, per size. Mirrors the `size` classes. */
const ICON_SIZE_PX = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/**
 * The stroke width in Lucide's 24-unit grid, per size — 1.5 / 1.67 / 2px
 * rendered. See STROKE WIDTH above.
 */
const ICON_STROKE_WIDTH = {
  sm: 2.25,
  md: 2,
  lg: 2,
} as const satisfies Record<keyof typeof ICON_SIZE_PX, number>;

/*
 * The colour per tone, set as `color` so Lucide's `currentColor` stroke picks
 * it up. Ratios from `checkContrast` (graphical object, 3:1), light / dark,
 * against `--background` · `--surface` · `--surface-raised`.
 *
 * `info` is `--accent` rather than `--accent-text`. An icon is a graphic, as
 * the alerts' tone bar and `ProgressBar`'s fill are, and those use `--accent`
 * too. `--accent-text` (10.76–16.43:1) would pass as well, but in the light
 * theme it is #2f1141, close enough to `--foreground` that the tone would be
 * hard to tell from an untoned icon.
 */
const ICON_TONE = {
  // No class: the stroke is the inherited `currentColor`.
  inherit: "",
  /** 6.25 · 8.91 · 9.55:1 light, 6.62 · 7.25 · 6.76:1 dark */
  muted: "text-foreground-muted",
  /** 6.19 · 8.82 · 9.45:1 light, 8.87 · 9.72 · 9.05:1 dark */
  info: "text-accent",
  /** 6.31 · 8.99 · 9.64:1 light, 8.92 · 9.77 · 9.10:1 dark */
  success: "text-success",
  /** 6.26 · 8.91 · 9.56:1 light, 8.22 · 9.00 · 8.38:1 dark */
  danger: "text-danger",
} as const satisfies Record<"inherit" | "muted" | AlertTone, string>;

const iconStyles = tv({
  /*
   * `shrink-0` so a flex row with long text squeezes the text rather than the
   * icon. `inline-block align-middle` so an icon inside running text sits on
   * the line instead of on the baseline with a descender gap under it; in a
   * flex row both are ignored and `items-center` does the aligning.
   */
  base: [
    "inline-block shrink-0 align-middle",
    // See FORCED COLORS above: tones give way to the forced parent colour.
    "forced-colors:text-current",
  ],
  variants: {
    // 16 / 20 / 24px — see SIZE above.
    size: {
      sm: "size-(--spacing-40)",
      md: "size-(--spacing-50)",
      lg: "size-(--spacing-60)",
    },
    tone: ICON_TONE,
    mirrorInRtl: {
      true: "rtl:-scale-x-100",
      false: "",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "inherit",
    mirrorInRtl: false,
  },
});

export { ICON_SIZE_PX, ICON_STROKE_WIDTH, iconStyles };
export type IconVariants = VariantProps<typeof iconStyles>;
/** The values `tone` accepts: the alert tones, plus `inherit` and `muted`. */
export type IconTone = keyof typeof ICON_TONE;
