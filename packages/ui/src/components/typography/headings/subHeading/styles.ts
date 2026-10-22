/*
 * `SubHeading`'s style function: the shared heading recipe in `../styles.ts` with
 * `size` defaulting to `"heading-sm"`.
 *
 * Exported for markup this package does not own — a router's link styled as a
 * heading-sized title, a `<legend>` that has to match the headings around it —
 * and callable from a server component. Pass `size` to draw at another heading
 * role.
 */
import { tv, type VariantProps } from "../../../../lib/tv";
import { headingStyles } from "../styles";

const subHeadingStyles = tv({
  extend: headingStyles,
  defaultVariants: { size: "heading-sm" },
});

export { subHeadingStyles };
export type SubHeadingVariants = VariantProps<typeof subHeadingStyles>;
