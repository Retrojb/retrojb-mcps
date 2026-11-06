import { tv } from "../../../../lib/tv";

/**
 * The class recipe behind `Strong`, callable on its own to style an element
 * this package does not own.
 *
 * @remarks
 * ### Why it lives outside `Strong.tsx`
 *
 * Neither file carries `"use client"`, so both render in a server component.
 * The recipe still sits in its own module, as every `styles.ts` in this package
 * does, so adding a hook to `Strong` later cannot turn `strongStyles` into a
 * client-only export.
 *
 * ### Why there is no `StrongVariants` type
 *
 * The recipe is a base class list with no variants, like `codeStyles`, so there
 * is nothing for a variants type to describe. Weight is fixed on purpose: a
 * caller who could pick a weight would pick it for looks, and `Strong` exists
 * to mark importance.
 *
 * @example
 * ```tsx
 * <b className={strongStyles()}>Do not unplug the device.</b>
 * ```
 *
 * @see packages/ui/src/components/typography/body/strong/StrongSpec.yaml
 *
 * @public
 */
const strongStyles = tv({
  base: [
    /*
     * Only the weight. Colour, size, line height and family are inherited from
     * the surrounding text, so there is no colour pairing to measure here: the
     * parent's component already measured it (1.4.3).
     *
     * `font-bold` reads `--font-weight-bold`, which `theme.css` maps to
     * `--font-weight-700` (700). It is an absolute weight, not `bolder`, so the
     * result does not depend on the parent's weight; inside a 600 heading it is
     * a step heavier, and inside a 700 heading (`display`, `heading-xl`) it is
     * no different.
     */
    "font-bold",
  ],
});

export { strongStyles };
