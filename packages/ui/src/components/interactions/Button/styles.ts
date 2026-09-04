/*
 * The variant definition, in its own module beside the component rather than
 * inside it.
 *
 * `Button.tsx` carries `"use client"`, and that directive marks everything its
 * module exports as client-only. Were `buttonStyle` declared there, calling it
 * from a server component to style an element this package does not own would
 * throw "Attempted to call buttonStyle() from the server" — and that is the
 * documented use for it. Keeping it here, in a module with no directive, leaves
 * it callable from anywhere while the React layer stays client-side.
 */

import { tv, type VariantProps } from "../../../lib/tv.js";

const buttonStyle = tv({
  base: [
    "inline-flex items-center justify-center gap-2",
    "rounded-control border border-transparent",
    "font-medium whitespace-nowrap",
    "cursor-pointer select-none",
    "transition-colors motion-reduce:transition-none",

    /*
     * One focus indicator for every intent (WCAG 2.4.7). `focus-visible` rather
     * than `focus` so it appears for keyboard and programmatic focus but not on
     * mouse click. 2px plus the offset also clears the minimum area in 2.4.13,
     * and `outline` is used over a `ring` box-shadow because outlines survive
     * forced-colors mode, where box-shadows are dropped entirely.
     */
    "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",

    /*
     * Contrast drops below 4.5:1 here, which 1.4.3 permits for disabled
     * controls. `cursor-not-allowed` and the dimming are both needed: colour is
     * never the only signal, and the `disabled` attribute already takes the
     * button out of the tab order.
     */
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],

  variants: {
    intent: {
      // 5.98:1 white on --accent in light, 8.81:1 dark text on the dark-mode
      // accent. Every pairing here is gated by `check:contrast` in apps/docs.
      primary: "bg-accent text-accent-foreground hover:bg-accent-hover",

      // `border-border-strong` rather than `border-border`: at 4.26:1 it is the
      // only one of the two that clears 1.4.11 as a control boundary, and the
      // boundary is what makes this readable as a button at all.
      secondary:
        "border-border-strong bg-surface text-foreground hover:bg-surface-raised",

      ghost: "bg-transparent text-accent-text hover:bg-surface",

      danger: "bg-danger text-danger-foreground hover:opacity-90",
    },

    size: {
      // Heights are 32/40/48px. All three clear the 24px minimum in 2.5.8 (AA).
      // Only `lg` clears the 44px enhanced target in 2.5.5 (AAA) — `md` is 40px
      // and falls 4px short, so reach for `lg` where AAA is the bar.
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    },

    fullWidth: {
      true: "w-full",
    },
  },

  defaultVariants: {
    intent: "primary",
    size: "md",
  },
});

export { buttonStyle };
export type ButtonVariants = VariantProps<typeof buttonStyle>;
