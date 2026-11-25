import { tv, type VariantProps } from "../../../lib/tv";

/**
 * The class recipe behind `Tag`, callable on its own to style an element this
 * package does not own.
 *
 * @remarks
 * ### Why it lives outside `Tag.tsx`
 *
 * `Tag` has no hooks, so neither file carries `"use client"` and both render in
 * a server component. The recipe still sits in its own module, as every
 * `styles.ts` in this package does, so adding a hook to `Tag` later cannot turn
 * `tagStyles` into a client-only export.
 *
 * ### Why there is no `warning` tone
 *
 * The palette ships no `--warning` token. The reasoning is in
 * `alerts/tone.ts`: an amber solved for 4.5:1 on `--surface-base` has no headroom
 * left for the other surfaces, so a fourth tone needs its own ramp first.
 *
 * @example
 * ```tsx
 * <span className={tagStyles({ tone: "success" })}>Shipped</span>
 * ```
 *
 * @see packages/ui/src/components/content/tag/TagSpec.yaml
 *
 * @public
 */
const tagStyles = tv({
  base: [
    /*
     * A real `border`, not a box-shadow, so the edge survives forced-colors
     * mode, where shadows are dropped and borders are repainted in a system
     * colour. Each `tone` sets its own fill, so there is no `bg-*` here: a
     * sentiment tag is a filled surface (a soft tint, or the saturated
     * `--danger`), and the text and border were measured on that fill below.
     * `max-w-full` and `wrap-break-word` let a long label wrap at 320 CSS px
     * (1.4.10) instead of overflowing.
     */
    "inline-flex max-w-full items-center px-(--space-2)",
    "rounded-control border",
    "wrap-break-word",
    /*
     * Deliberately absent: `cursor-*`, `hover:`, `focus-visible:` and
     * `transition-*`. A tag is not a control, so it has no state to show. The
     * interactive sibling is `Chip`.
     */
  ],

  variants: {
    /*
     * Each tone is a filled surface. `neutral`, `info` and `success` take a soft
     * tint and keep their existing dark text and border; `danger` fills with the
     * saturated `--danger` and reverses to `--danger-foreground`, so an error
     * tag cannot be mistaken for the quieter three. The tints live in
     * `@retrojb/tokens` (`--tag-*-surface`); `danger-foreground` reverses by
     * theme, near-white on the light deep-red fill and near-black on the dark
     * pink one.
     *
     * The word is the signal, not the colour (1.4.1): a tag always carries its
     * text, so greyscale and forced-colors lose nothing. Text clears 4.5:1
     * (1.4.3) and the border 3:1 (1.4.11) in both themes; the measured pairings
     * live in `TagSpec.yaml` and are gated by `check:contrast`.
     */
    tone: {
      // Fill `--tag-neutral-surface`, text `--foreground`, border `--border-strong`.
      neutral: "border-border-strong bg-tag-neutral-surface text-foreground",

      // Fill `--tag-info-surface`, text `--accent-text`, border `--accent`.
      info: "border-accent bg-tag-info-surface text-accent-text",

      // Fill `--tag-success-surface`, text and border `--success`.
      success: "border-success bg-tag-success-surface text-success",

      // Saturated fill and border `--danger`, text `--danger-foreground`. The
      // one tone that fills solid, matching `Button`'s danger.
      danger: "border-danger bg-danger text-danger-foreground",
    },

    /*
     * `label-*` type roles, which carry the weight. A tag is not a pointer
     * target, so the 24px minimum in 2.5.8 does not apply and the heights
     * (about 20px and 28px) are set by the text.
     */
    size: {
      sm: "px-(--space-3) py-0 text-label-md",
      md: "px-(--space-4) py-(--space-1) text-label-lg",
    },
  },

  defaultVariants: {
    tone: "neutral",
    size: "sm",
  },
});

/**
 * The variant props of {@link tagStyles}: `tone` and `size`.
 *
 * @remarks
 * `ITagProps` extends this and redeclares each variant with a description, so
 * the values here are the single list. Add a variant to `tagStyles` and
 * redeclare it in `types.ts`.
 *
 * @public
 */
type TagVariants = VariantProps<typeof tagStyles>;

export { tagStyles };
export type { TagVariants };
