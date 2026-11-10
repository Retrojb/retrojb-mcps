import { tv, type VariantProps } from "../../../lib/tv";

/**
 * The class recipe behind `Button`, callable on its own to style an element
 * this package does not own.
 *
 * @remarks
 * ### Why it lives outside `Button.tsx`
 *
 * `Button.tsx` carries `"use client"`, and that directive marks everything its
 * module exports as client-only. Were `buttonStyle` declared there, calling it
 * from a server component to style an element this package does not own would
 * throw "Attempted to call buttonStyle() from the server", and that is the
 * documented use for it. Keeping it here, in a module with no directive, leaves
 * it callable from anywhere while the React layer stays client-side.
 *
 * Other `styles.ts` files in this package point here for the same reason.
 *
 * @example
 * ```tsx
 * <a className={buttonStyle({ intent: "ghost" })} href="/docs">
 *   Docs
 * </a>
 * ```
 *
 * @see packages/ui/src/components/actions/Button/ButtonSpec.yaml
 *
 * @public
 */
const buttonStyle = tv({
  base: [
    "inline-flex items-center justify-center gap-(--space-2)",
    "rounded-control border border-transparent",
    // Weight comes from the `label-*` type role in `size`.
    "whitespace-nowrap",
    "cursor-pointer select-none",
    // Colours plus `box-shadow`, so an `elevated` button's lift animates with its
    // fill. `transition-colors` leaves the shadow out.
    "transition-[color,background-color,border-color,outline-color,box-shadow] motion-reduce:transition-none",

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
        "border-border-strong bg-surface-base text-foreground hover:bg-surface-raised-1",

      ghost: "bg-transparent text-accent-text hover:bg-surface-base",

      danger: "bg-danger text-danger-foreground hover:opacity-90",
    },

    size: {
      // Heights are 32/40/48px (`--control-height-*`), and density does not
      // change them, only the inline padding. All three clear the 24px minimum
      // in 2.5.8 (AA).
      // Only `lg` clears the 44px enhanced target in 2.5.5 (AAA) — `md` is 40px
      // and falls 4px short, so reach for `lg` where AAA is the bar.
      sm: "h-(--control-height-sm) px-(--space-3) text-label-md",
      md: "h-(--control-height-md) px-(--space-4) text-label-md",
      lg: "h-(--control-height-lg) px-(--space-6) text-label-lg",
    },

    fullWidth: {
      true: "w-full",
    },

    /*
     * A resting shadow that lifts on hover and drops on press, so the press
     * reads as the button going down. Off by default: a flat button with its
     * border is the house style, and a shadow is extra depth on top of an edge
     * that already identifies the control (1.4.11). Forced-colors mode removes
     * the shadow and leaves that edge.
     *
     * `primary` and `danger` have `border-transparent`, which forced-colors
     * mode repaints as a visible edge, so they keep a boundary there too.
     *
     * `ghost` has no surface to lift and `disabled` cannot be pressed, so the
     * compound variants below take the shadow off both.
     */
    elevated: {
      true: "shadow-control hover:shadow-control-hover active:shadow-none",
    },
  },

  compoundVariants: [
    {
      elevated: true,
      intent: "ghost",
      class: "shadow-none hover:shadow-none",
    },
    {
      elevated: true,
      class: "disabled:shadow-none disabled:hover:shadow-none",
    },
  ],

  defaultVariants: {
    intent: "primary",
    size: "md",
    elevated: false,
  },
});

/**
 * The variant props of {@link buttonStyle}: `intent`, `size`, `fullWidth` and
 * `elevated`.
 *
 * @remarks
 * `IButtonProps` extends this and redeclares each variant with a description,
 * so the values here are the single list. Add a variant to `buttonStyle` and
 * redeclare it in `types.ts`.
 *
 * @public
 */
type ButtonVariants = VariantProps<typeof buttonStyle>;

export { buttonStyle };
export type { ButtonVariants };
