/*
 * The variant definition, in its own module beside the component — see the
 * note in `interactions/Button/styles.ts`. `Paragraph` itself has no
 * `"use client"` either, so both render and run in a server component.
 *
 * One element, so a base class list rather than slots.
 */
import { tv, type VariantProps } from "../../../../lib/tv";

const paragraphStyles = tv({
  base: [
    // No preflight here, so a `<p>` keeps its UA `1em` block margins.
    "m-0 min-w-0",
    /*
     * `text-pretty` stops a paragraph ending on a single short word; unlike
     * `text-balance` it leaves every line but the last few at full width, which
     * is what running text wants. `wrap-break-word` keeps a long URL from
     * overflowing at 320 CSS px (1.4.10).
     */
    "text-pretty wrap-break-word",
  ],
  variants: {
    /*
     * The body roles. All three set a unitless line height of 1.5 or more, which
     * is the 1.4.12 floor — a user stylesheet applying it reflows nothing — and
     * sizes in `rem`, so browser text zoom scales them (1.4.4).
     */
    size: {
      lg: "text-body-lg",
      md: "text-body-md",
      sm: "text-body-sm",
    },
    tone: {
      // 13.30 / 15.72:1 on --background, 18.95 / 17.22:1 on --surface, in light
      // / dark.
      default: "text-foreground",
      // 6.25 / 6.63:1 on --background, 8.91 / 7.26:1 on --surface, 9.55 / 6.76:1
      // on --surface-raised. Clears 1.4.3 (4.5:1) on every surface and 1.4.6
      // (7:1) on --surface in both themes.
      muted: "text-foreground-muted",
    },
    /*
     * A readable line length. `max-w-prose` is 65ch — in the 45–75 character
     * band that keeps long-form copy comfortable to track — and `ch` is relative
     * to the paragraph's own font, so the measure grows with text zoom rather
     * than squeezing more zoomed text into a fixed width.
     *
     * Off by default: a paragraph inside a card or a table cell already has a
     * narrower container, and a cap there only leaves a ragged gap.
     */
    measure: {
      true: "max-w-prose",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "default",
    measure: false,
  },
});

export { paragraphStyles };
export type ParagraphVariants = VariantProps<typeof paragraphStyles>;
