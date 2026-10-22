/*
 * The shared heading recipe. Internal: each named heading extends it with its
 * own default `size` and exports that, so `pageHeadingStyles()` and friends are
 * the public style functions and this one is the single place the base lives.
 *
 * No `"use client"` here or anywhere in `typography/`. None of these components
 * uses a hook, so they render in a server component as-is, and the style
 * functions are callable from one too — see `interactions/Button/styles.ts` for
 * why the directive would get in the way of that.
 *
 *
 * SIZE IS NOT LEVEL
 *
 * `size` picks a heading type role; `level` (on the component) picks `<h1>`–
 * `<h6>`. They are independent on purpose. The document outline is what a
 * screen reader user navigates by (1.3.1, 2.4.6), and it must not skip or invert
 * levels just because a design wants an `<h2>` drawn small, or an `<h3>` drawn
 * large.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const headingStyles = tv({
  base: [
    // No preflight in this package, so a bare `<h2>` keeps its UA margins and
    // UA font size. The role sets the size; the margin is the layout's job.
    "m-0 min-w-0",
    // 13.30 / 15.72:1 on --background, 18.95 / 17.22:1 on --surface, in light /
    // dark. Clears 1.4.6 (AAA, 7:1) everywhere it can sit.
    "text-foreground",
    /*
     * `text-balance` evens out the line lengths of a wrapped heading so a
     * two-line title does not end on one orphaned word. `wrap-break-word` lets
     * a long unbroken word (a product name, a URL) wrap rather than overflow at
     * 320 CSS px, which `display` at 48px would otherwise do (1.4.10).
     */
    "text-balance wrap-break-word",
  ],
  variants: {
    /*
     * The heading type roles, named as the roles themselves so the class a
     * caller reads in devtools (`text-heading-md`) matches the prop they passed.
     * Restricted to the heading roles: body, label and caption roles are not a
     * heading's to take.
     */
    size: {
      display: "text-display",
      "heading-xl": "text-heading-xl",
      "heading-lg": "text-heading-lg",
      "heading-md": "text-heading-md",
      "heading-sm": "text-heading-sm",
      "heading-xs": "text-heading-xs",
    },
  },
  defaultVariants: { size: "heading-md" },
});

export { headingStyles };
export type HeadingVariants = VariantProps<typeof headingStyles>;
