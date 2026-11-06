import { tv } from "../../../../lib/tv";

/**
 * The class recipe behind `Emphasis`, callable on its own to style an element
 * this package does not own.
 *
 * @remarks
 * ### Why it lives outside `Emphasis.tsx`
 *
 * Neither file carries `"use client"`, so both render in a server component.
 * The recipe still sits in its own module, as every `styles.ts` in this package
 * does, so adding a hook to `Emphasis` later cannot turn `emphasisStyles` into
 * a client-only export.
 *
 * ### Why there is no `EmphasisVariants` type
 *
 * The recipe is a base class list with no variants, like `codeStyles`, so there
 * is nothing for a variants type to describe.
 *
 * @example
 * ```tsx
 * <i className={emphasisStyles()}>never</i>
 * ```
 *
 * @see packages/ui/src/components/typography/body/emphasis/EmphasisSpec.yaml
 *
 * @public
 */
const emphasisStyles = tv({
  base: [
    /*
     * Only the slant. Colour, size, line height and family are inherited from
     * the surrounding text, so there is no colour pairing to measure here: the
     * parent's component already measured it (1.4.3). A UA stylesheet makes
     * `<em>` italic already; the class states it so it survives a CSS reset.
     */
    "italic",
  ],
});

export { emphasisStyles };
