/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * `inlineAlertStyles` is exported for the case this component does not cover: a
 * server-rendered notice in prose that should look like an alert without being
 * announced as one. Every slot is callable from a server component.
 *
 * The surface, the tone map and the dismiss affordance come from `../tone`, which is
 * where their measured contrast ratios are documented. This file owns only what is
 * specific to an alert that sits in the page flow: the live-region wrapper and the
 * padding scale.
 *
 *
 * ON THE SPACING
 *
 * Padding is written `p-(--spacing-40)` rather than `p-4`. Both compute to 16px, but
 * the token form resolves through `--spacing-40` in `tokens.css`, so the scale is the
 * one the design system publishes rather than Tailwind's built-in one.
 *
 * It has to be the arbitrary-property form. Registering `--spacing-40` in `@theme`
 * would generate a `p-40` utility colliding with Tailwind's own numeric `p-40`
 * (10rem) — v4 derives `p-<number>` from the single `--spacing` base unit, so a
 * *named* spacing token cannot join that scale without ambiguity. `p-(--spacing-40)`
 * sidesteps it by emitting `padding: var(--spacing-40)` directly.
 *
 * Note the leading `--`. `p-(spacing-40)`, without it, compiles to nothing at all
 * and does so silently, which is how the scaffolded version of this file ended up
 * with no padding.
 */

import { tv, type VariantProps } from "../../../lib/tv";
import { ALERT_DISMISS, ALERT_SURFACE, toneVariants } from "../tone";

const inlineAlertStyles = tv({
  slots: {
    /*
     * The live region, and deliberately styleless.
     *
     * This element is always rendered, even with no message in it, and that is the
     * whole reason it is a separate slot from `box`. A screen reader announces
     * changes *inside* a region it was already tracking — insert the region and its
     * content in the same commit and most engines announce nothing. Keeping this
     * wrapper mounted is what makes the announcement work when the message arrives.
     * See the long note in `InlineAlert.tsx`.
     */
    root: "",

    /** The visible alert. Tone supplies the inline-start edge colour. */
    box: [...ALERT_SURFACE, "flex items-start justify-between"],

    content: "flex min-w-0 flex-col",

    /*
     * The tone, as words.
     *
     * "Note" / "Success" / "Error" is text, so the tone survives greyscale, colour
     * blindness, and a forced-colors mode that discards the bar (WCAG 1.4.1). The
     * colour here is reinforcement and never the signal.
     */
    label: "font-semibold",

    message: "min-w-0",

    dismiss: ALERT_DISMISS,
  },

  variants: {
    tone: toneVariants("box", "label"),

    size: {
      sm: {
        box: "gap-(--spacing-20) p-(--spacing-30) text-sm",
        content: "gap-(--spacing-10)",
        label: "text-sm",
      },
      md: {
        box: "gap-(--spacing-30) p-(--spacing-40) text-sm",
        content: "gap-(--spacing-10)",
        label: "text-base",
      },
    },
  },

  defaultVariants: {
    tone: "info",
    size: "md",
  },
});

export { inlineAlertStyles };
export type InlineAlertVariants = VariantProps<typeof inlineAlertStyles>;
