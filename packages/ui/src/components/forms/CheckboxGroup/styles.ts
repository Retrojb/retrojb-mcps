/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * Slots for the frame only. The checkboxes draw themselves with
 * `checkboxStyles`, and the layout between them is `DynamicContainer`'s, so the
 * `direction` and `gap` props pass straight through to it rather than being
 * restated here.
 *
 *
 * RESETTING THE FIELDSET
 *
 * No preflight in this package, so a `<fieldset>` keeps its UA groove border,
 * padding and margin, and `min-inline-size: min-content` — which stops it
 * shrinking below its widest child and is the usual cause of a fieldset
 * overflowing a narrow column. `min-w-0` undoes that. The legend's UA padding
 * goes too.
 *
 * The fieldset is not itself a flex container. Flex on `<fieldset>` has a long
 * history of engine bugs, and the `<legend>` would become a flex item. The
 * layout is a `div` one level in.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const checkboxGroupStyles = tv({
  slots: {
    root: "m-0 min-w-0 border-0 p-0",
    // 13.30 / 15.72:1 on --background, 18.95 / 17.21:1 on --surface.
    legend: "mb-(--spacing-20) p-0 text-label-md text-foreground",
    body: "flex min-w-0 flex-col gap-(--spacing-30)",
    // 6.25 / 6.62:1 on --background.
    description: "m-0 text-body-sm text-foreground-muted",
    // 6.26 / 8.22:1 on --background. Every member checkbox also turns red and
    // carries `aria-invalid`, so the error is not conveyed by text colour alone.
    error: "m-0 text-body-sm font-medium text-danger",
  },
});

export { checkboxGroupStyles };
export type CheckboxGroupVariants = VariantProps<typeof checkboxGroupStyles>;
