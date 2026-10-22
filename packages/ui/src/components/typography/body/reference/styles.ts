/*
 * The variant definition for `Reference`, in its own module beside the
 * component — see the note in `interactions/Button/styles.ts`. No
 * `"use client"`.
 *
 * Slotted: the `<figure>` root, the `<blockquote>`, and the `<figcaption>`
 * attribution with its `<cite>`.
 */
import { tv, type VariantProps } from "../../../../lib/tv";

const referenceStyles = tv({
  slots: {
    /*
     * The bar on the inline-start edge marks the quotation visually. It is not
     * the only cue — the `<blockquote>` element carries the structure (1.3.1)
     * — but it is drawn in `border-border-strong`, 4.17 / 4.42:1 on
     * --background, so it is visible rather than a hint: `--border` would be
     * 1.75–2.67:1. `border-s-4` is a logical edge, so it moves to the right in a
     * right-to-left document.
     */
    root: [
      "m-0 min-w-0 flex flex-col gap-(--spacing-20)",
      "border-s-4 border-border-strong ps-(--spacing-40)",
    ],
    // No preflight: a `<blockquote>` keeps a UA `40px` inline margin otherwise.
    // 13.30 / 15.72:1 on --background, 18.95 / 17.22:1 on --surface.
    quote: "m-0 text-foreground text-pretty wrap-break-word",
    // 6.25 / 6.63:1 on --background, 8.91 / 7.26:1 on --surface.
    attribution: "m-0 text-body-sm text-foreground-muted",
    // A `<cite>` is italic in the UA stylesheet; stated so it survives a reset.
    work: "italic",
  },
  variants: {
    // The body roles for the quotation itself. The attribution stays `body-sm`.
    size: {
      lg: { quote: "text-body-lg" },
      md: { quote: "text-body-md" },
    },
  },
  defaultVariants: { size: "md" },
});

export { referenceStyles };
export type ReferenceVariants = VariantProps<typeof referenceStyles>;
