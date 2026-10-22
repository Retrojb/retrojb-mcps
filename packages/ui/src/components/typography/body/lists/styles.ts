/*
 * The variant definitions for `List` and `ListItem`, in their own module beside
 * the components — see the note in `interactions/Button/styles.ts`. Neither
 * component has `"use client"`.
 *
 *
 * MARKERS STAY
 *
 * `DynamicContainer` renders `ul`/`ol` for layout and strips the markers with
 * `list-none`, because there the list is a row of controls. This is the other
 * case: a list in running text, where the bullet or number is part of the
 * content. The marker style is set explicitly (`list-disc` / `list-decimal`)
 * rather than left to the UA, so a nested list does not switch to circles and a
 * consumer's reset cannot silently remove them.
 *
 * Keeping the markers also keeps the semantics in Safari, which drops list
 * semantics from a `ul` whose `list-style` is `none` — the reason
 * `DynamicContainer` has to restore `role="list"` and this does not.
 */
import { tv, type VariantProps } from "../../../../lib/tv";

const listStyles = tv({
  base: [
    // No preflight, so the UA `1em` block margin is removed here. The inline
    // padding is the marker's gutter and is restated in the token scale.
    "m-0 min-w-0 ps-(--spacing-60)",
    // 13.30 / 15.72:1 on --background, 18.95 / 17.22:1 on --surface.
    "text-foreground",
    /*
     * Markers in the muted foreground: 6.25 / 6.63:1 on --background and
     * 8.91 / 7.26:1 on --surface, so a number in an ordered list — which is
     * content, not decoration — still clears 1.4.3.
     */
    "marker:text-foreground-muted",
    // Space between items, and above a list nested in an item.
    "space-y-(--spacing-10) [&_ul]:mt-(--spacing-10) [&_ol]:mt-(--spacing-10)",
  ],
  variants: {
    // The body roles; see `body/paragraph/styles.ts`. Items inherit the size.
    size: {
      lg: "text-body-lg",
      md: "text-body-md",
      sm: "text-body-sm",
    },
    ordered: {
      true: "list-decimal",
      false: "list-disc",
    },
  },
  defaultVariants: {
    size: "md",
    ordered: false,
  },
});

const listItemStyles = tv({
  // `ps` nudges the text off the marker; `text-pretty` as on `Paragraph`.
  base: "min-w-0 ps-(--spacing-10) text-pretty wrap-break-word",
});

export { listItemStyles, listStyles };
export type ListVariants = VariantProps<typeof listStyles>;
