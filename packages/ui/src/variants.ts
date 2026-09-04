/**
 * Every variant definition in the package, deliberately apart from the
 * components that use them.
 *
 * This module has no `"use client"` directive, and that is the point. The
 * components do — `Input` calls `useId`, and marking all three keeps their
 * behaviour consistent — but a directive makes *everything* a module exports
 * unreachable from server code, and these are pure functions that return a
 * string. Colocating them with the components would mean
 * `<NextLink className={link()}>` throwing "Attempted to call link() from the
 * server", which is the single most common way this package is meant to be
 * used, in the rendering environment that is the default in App Router.
 *
 * So: class-name logic here, React there.
 */

import { tv, type VariantProps } from "./lib/tv.js";

// -----------------------------------------------------------------------------
// button
// -----------------------------------------------------------------------------

export const button = tv({
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
      // Heights are 32/40/48px. The two larger sizes clear the 44px AAA target
      // in 2.5.5; all three clear the 24px minimum in 2.5.8.
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

export type ButtonVariants = VariantProps<typeof button>;

// -----------------------------------------------------------------------------
// link
// -----------------------------------------------------------------------------

/**
 * Variant definition for `Link`.
 *
 * This is the seam for framework routers. `Link` renders a plain `<a>`, which in
 * a Next.js app means a full page load rather than a client-side transition.
 * Rather than making the component polymorphic, apply these classes to whatever
 * link component the router provides:
 *
 * ```tsx
 * import NextLink from "next/link";
 * import { link } from "@retrojb/ui";
 *
 * <NextLink href="/docs" className={link({ intent: "standalone" })}>Docs</NextLink>
 * ```
 */
export const link = tv({
  base: [
    "rounded-sm outline-offset-2",
    "transition-colors motion-reduce:transition-none",
    // Matches the button's indicator so focus looks the same everywhere.
    "focus-visible:outline-2 focus-visible:outline-focus",
  ],

  variants: {
    intent: {
      /*
       * Underlined, and deliberately not optional.
       *
       * A link sitting in a paragraph that is distinguished from the text around
       * it by colour alone fails WCAG 1.4.1 unless the colour contrast between
       * link and body text is at least 3:1 — which --accent-text against
       * --foreground is not. The underline is what makes this conformant, so it
       * is in the variant rather than something a caller turns off.
       */
      inline: [
        "text-accent-text underline",
        "underline-offset-[0.15em] decoration-[0.08em]",
        "hover:text-accent-hover hover:decoration-[0.14em]",
      ],

      /*
       * No underline, for links that are unambiguous on their own — nav items,
       * cards, buttons-that-are-links. 1.4.1 does not apply when the link is not
       * embedded in a block of text.
       */
      standalone: "text-foreground no-underline hover:text-accent-text",

      muted: "text-foreground-muted underline hover:text-foreground",
    },
  },

  defaultVariants: {
    intent: "inline",
  },
});

export type LinkVariants = VariantProps<typeof link>;

// -----------------------------------------------------------------------------
// input
// -----------------------------------------------------------------------------

/**
 * Variant definition for `Input`, as slots: `root`, `label`, `control`,
 * `description` and `error`.
 *
 * Exported for the cases the component does not cover — a `<textarea>` or a
 * `<select>` that has to sit in the same form and look identical. Use
 * `input().control()` on the element and the rest on the surrounding markup.
 */
export const input = tv({
  slots: {
    root: "flex flex-col gap-1.5",

    label: "text-sm font-medium text-foreground",

    control: [
      "w-full rounded-control border bg-surface-raised",
      "text-foreground placeholder:text-foreground-muted",
      "transition-colors motion-reduce:transition-none",

      // Same indicator as Button and Link. The border colour also changes on
      // focus, so focus is never signalled by the ring alone.
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",

      "disabled:cursor-not-allowed disabled:opacity-60",
    ],

    description: "text-sm text-foreground-muted",

    // 6.53:1 on --background. Paired with `aria-invalid` and the border colour,
    // so the error is conveyed by more than red text (WCAG 1.4.1).
    error: "text-sm font-medium text-danger",
  },

  variants: {
    size: {
      // Matches Button's 32/40/48px so an input and a button line up when they
      // sit side by side in a row.
      sm: { control: "h-8 px-2.5 text-sm" },
      md: { control: "h-10 px-3 text-sm" },
      lg: { control: "h-12 px-4 text-base" },
    },

    invalid: {
      // `border-border-strong` at 4.26:1 and `border-danger` at 6.53:1 both
      // clear 1.4.11, which applies to the input's boundary because the boundary
      // is what identifies the control.
      false: { control: "border-border-strong focus-visible:border-accent" },
      true: { control: "border-danger" },
    },

    labelHidden: {
      // Visually gone, still in the accessibility tree and still the input's
      // accessible name. `hidden` or `display: none` would remove it from both.
      true: { label: "sr-only" },
    },
  },

  defaultVariants: {
    size: "md",
    invalid: false,
  },
});

export type InputVariants = VariantProps<typeof input>;
