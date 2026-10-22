/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * One element, so a base class list rather than slots. `dynamicContainerStyles()`
 * is callable from a server component, which is the point of exporting it: a
 * server-rendered `<ul>` of links can take the same stack-then-row layout without
 * becoming a client module.
 *
 *
 * WHY THE VIEWPORT `sm:` BREAKPOINT AND NOT A CONTAINER QUERY
 *
 * The default `direction="responsive"` switches from a column to a row at the
 * Tailwind `sm` breakpoint (40rem of *viewport*), because that is the behaviour
 * asked for: the layout follows the page breakpoints the rest of an app is
 * already built around, and it works with no ancestor set up for it.
 *
 * A container query is the better tool when the same group can land in a wide
 * main column and a narrow sidebar on one page, which is why `Card` uses one for
 * its orientation. It is opt-in here through `responsiveTo="container"`. That
 * mode reads the nearest ancestor marked `@container` (a `Card` root already is
 * one) and switches at `@sm`, 24rem of that ancestor's width. With no such
 * ancestor the query never matches and the container simply stays a column —
 * which is the safe failure, since a column never overflows.
 *
 * The element cannot be its own query container: a container query styles a
 * container's descendants, never the container itself.
 *
 *
 * NO PREFLIGHT
 *
 * This package ships none, so a `<ul>` or `<ol>` root would keep its UA margin,
 * padding and markers. `m-0 p-0 list-none` removes them and is a no-op on a
 * `<div>`. `list-style` inherits, so the `<li>` children lose their markers too.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const dynamicContainerStyles = tv({
  base: ["flex min-w-0", "m-0 p-0 list-none"],
  variants: {
    direction: {
      /*
       * Wrapping only once it is a row. A column has nothing to wrap, and
       * `flex-wrap` on a column with a constrained height would start a second
       * column, which is never what a stacked layout means.
       */
      responsive: "",
      vertical: "flex-col",
      horizontal: "flex-row flex-wrap",
    },
    responsiveTo: {
      viewport: "",
      container: "",
    },
    /*
     * Steps on the spacing scale in `styles/tokens.css`. Named by size rather
     * than by token number so a caller reads intent, and so the mapping can be
     * retuned here once. One value for both axes: a wrapped row's second line
     * should sit as far from the first as the items sit from each other.
     */
    gap: {
      none: "gap-(--spacing-0)",
      xs: "gap-(--spacing-10)", // 4px
      sm: "gap-(--spacing-20)", // 8px
      md: "gap-(--spacing-30)", // 12px
      lg: "gap-(--spacing-40)", // 16px
      xl: "gap-(--spacing-60)", // 24px
    },
    /*
     * Cross-axis alignment. `stretch` is the flex default and stated anyway so
     * the variant always emits a class and a caller's `items-*` override has
     * something for tailwind-merge to replace.
     */
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      baseline: "items-baseline",
      stretch: "items-stretch",
    },
  },
  compoundVariants: [
    {
      direction: "responsive",
      responsiveTo: "viewport",
      class: "flex-col sm:flex-row sm:flex-wrap",
    },
    {
      direction: "responsive",
      responsiveTo: "container",
      class: "flex-col @sm:flex-row @sm:flex-wrap",
    },
  ],
  defaultVariants: {
    direction: "responsive",
    responsiveTo: "viewport",
    gap: "md",
    align: "stretch",
  },
});

export { dynamicContainerStyles };
export type DynamicContainerVariants = VariantProps<
  typeof dynamicContainerStyles
>;
