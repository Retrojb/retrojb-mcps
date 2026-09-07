/*
 * Two variant definitions, because a toast is two elements with different jobs.
 *
 * `toastRegionStyles` positions the container that holds the stack.
 * `toastAlertStyles` styles one message inside it.
 *
 * They are separate rather than slots of one definition because they are rendered by
 * separate components with separate lifetimes — that split is the whole point of the
 * component and is argued in `ToastRegion.tsx`.
 *
 * Both are directive-free and callable from a server component, though a toast that
 * never changes is a strange thing to want.
 */

import { tv, type VariantProps } from "../../../lib/tv";
import { ALERT_DISMISS, ALERT_SURFACE, toneVariants } from "../tone";

const toastRegionStyles = tv({
  base: [
    "fixed z-50 flex w-full max-w-sm flex-col",
    "gap-(--spacing-20) p-(--spacing-40)",

    /*
     * The region spans a corner of the viewport whether or not it holds anything, so
     * it would sit on top of the page and swallow clicks. `pointer-events-none` lets
     * them through; each toast turns them back on for itself.
     */
    "pointer-events-none",
  ],

  variants: {
    /*
     * Logical insets (`start`/`end`) rather than left/right, so the stack lands on the
     * same side as the reading direction under `dir="rtl"`.
     *
     * The bottom placements reverse the flex direction so the newest toast — last in
     * the DOM, because appending is the only order that lets a live region announce
     * additions — is the one nearest the edge of the screen.
     */
    placement: {
      "top-start": "top-0 start-0",
      "top-end": "top-0 end-0",
      "bottom-start": "bottom-0 start-0 flex-col-reverse",
      "bottom-end": "bottom-0 end-0 flex-col-reverse",
    },
  },

  defaultVariants: {
    placement: "bottom-end",
  },
});

const toastAlertStyles = tv({
  slots: {
    /*
     * One message.
     *
     * `pointer-events-auto` undoes the region's `pointer-events-none` for the toast
     * itself, so the dismiss button is clickable while the page underneath the rest of
     * the region stays usable.
     *
     * No shadow. The palette ships no elevation token, and the `--border-strong` edge
     * from `ALERT_SURFACE` is what separates the toast from whatever is behind it —
     * which it has to do anyway, since `--surface` against `--background` is 1.42:1 in
     * light and 1.09:1 in dark and reads as no boundary at all.
     */
    box: [
      ...ALERT_SURFACE,
      "pointer-events-auto",
      "flex items-start justify-between",
      "gap-(--spacing-30) p-(--spacing-40) text-sm",
    ],

    content: "flex min-w-0 flex-col gap-(--spacing-10)",

    /*
     * The tone as words, for the same reason as in `InlineAlert`: the bar colour and
     * the label colour both vanish in greyscale and in forced-colors mode, so neither
     * can be the only thing saying which kind of message this is (WCAG 1.4.1).
     */
    label: "font-semibold",

    message: "min-w-0",

    dismiss: ALERT_DISMISS,
  },

  variants: {
    tone: toneVariants("box", "label"),
  },

  defaultVariants: {
    tone: "info",
  },
});

export { toastAlertStyles, toastRegionStyles };
export type ToastAlertVariants = VariantProps<typeof toastAlertStyles>;
export type ToastRegionVariants = VariantProps<typeof toastRegionStyles>;
