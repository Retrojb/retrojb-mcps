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
     * colour. `bg-surface-base` is the fill every pairing below was measured on.
     * `max-w-full` and `wrap-break-word` let a long label wrap at 320 CSS px
     * (1.4.10) instead of overflowing.
     */
    "inline-flex max-w-full items-center",
    "rounded-control border bg-surface-base",
    "wrap-break-word",
    /*
     * Deliberately absent: `cursor-*`, `hover:`, `focus-visible:` and
     * `transition-*`. A tag is not a control, so it has no state to show. The
     * interactive sibling is `Chip`.
     */
  ],

  variants: {
    /*
     * Ratios are `checkContrast` from `@retrojb/wcag-a11y-scanner`, light / dark.
     * Text needs 4.5:1 (1.4.3) and the border 3:1 (1.4.11), and each is measured
     * on `--surface-base` (the tag's own fill, behind the text) and on `--background`
     * (the page, which the border also touches on its outer edge).
     *
     * The word is the signal, not the colour (1.4.1): a tag always carries its
     * text, so greyscale and forced-colors lose nothing.
     */
    tone: {
      // Text `--foreground`: 18.95 / 17.21:1 on --surface-base, 13.30 / 15.72:1 on
      // --background. Border `--border-strong`: 5.93 / 4.83:1 on --surface-base,
      // 4.16 / 4.41:1 on --background. `--border` would fail 1.4.11 here.
      neutral: "border-border-strong text-foreground",

      // Text `--accent-text`: 15.33 / 14.50:1 on --surface-base, 10.76 / 13.24:1 on
      // --background. Border `--accent`: 8.82 / 9.72:1 on --surface-base, 6.19 /
      // 8.87:1 on --background.
      info: "border-accent text-accent-text",

      // Text and border `--success`: 8.99 / 9.77:1 on --surface-base, 6.31 / 8.92:1
      // on --background.
      success: "border-success text-success",

      // Text and border `--danger`: 8.91 / 9.00:1 on --surface-base, 6.26 / 8.22:1
      // on --background.
      danger: "border-danger text-danger",
    },

    /*
     * `label-*` type roles, which carry the weight. A tag is not a pointer
     * target, so the 24px minimum in 2.5.8 does not apply and the heights
     * (about 20px and 28px) are set by the text.
     */
    size: {
      sm: "px-(--space-2) py-0 text-label-sm",
      md: "px-(--space-3) py-(--space-1) text-label-md",
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
