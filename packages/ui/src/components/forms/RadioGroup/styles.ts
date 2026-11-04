/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `actions/Button/styles.ts`.
 *
 * Slots for the frame only, as in `CheckboxGroup`. The radios draw themselves
 * with `radioStyles`, and the layout between them is `DynamicContainer`'s, so
 * `orientation` maps onto its `direction` and `gap` passes straight through.
 *
 *
 * RESETTING THE FIELDSET
 *
 * The same reset as `CheckboxGroup`: no preflight in this package, so the UA
 * groove border, padding and margin go, and `min-w-0` undoes the fieldset's
 * `min-inline-size: min-content`. The fieldset is not itself a flex container
 * — see the note in `CheckboxGroup/styles.ts` — so the layout is a `div` one
 * level in.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const radioGroupStyles = tv({
  slots: {
    root: "m-0 min-w-0 border-0 p-0",
    // 13.30 / 15.72:1 on --background, 18.95 / 17.21:1 on --surface.
    legend: "mb-(--spacing-20) p-0 text-label-md text-foreground",
    body: "flex min-w-0 flex-col gap-(--spacing-30)",
    // 6.25 / 6.62:1 on --background.
    description: "m-0 text-body-sm text-foreground-muted",
    // 6.26 / 8.22:1 on --background. Every member radio also turns red and
    // carries `aria-invalid`, so the error is not conveyed by text colour alone.
    error: "m-0 text-body-sm font-medium text-danger",
  },
  variants: {
    labelHidden: {
      // Visually gone, still the group's accessible name — as on
      // `SegmentedControl`.
      true: { legend: "sr-only" },
    },
  },
});

export { radioGroupStyles };
export type RadioGroupVariants = VariantProps<typeof radioGroupStyles>;
