/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * Slots rather than a single class string: `root`, `label`, `control`,
 * `description` and `error`. Exported for the cases the component does not cover
 * — a `<textarea>` or a `<select>` that has to sit in the same form and look
 * identical. Use `inputStyle().control()` on the element and the rest on the
 * surrounding markup.
 */

import { tv, type VariantProps } from "../../../lib/tv.js";

const inputStyle = tv({
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
      // sit side by side in a row — including the target-size trade noted there:
      // all three clear 2.5.8 (AA, 24px), only `lg` clears 2.5.5 (AAA, 44px).
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

export { inputStyle };
export type InputVariants = VariantProps<typeof inputStyle>;
