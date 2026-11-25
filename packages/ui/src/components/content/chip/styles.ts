import { tv, type VariantProps } from "../../../lib/tv";

/**
 * The class recipe behind `Chip`, callable on its own to style an element this
 * package does not own.
 *
 * @remarks
 * ### Why it lives outside `Chip.tsx`
 *
 * `Chip.tsx` carries `"use client"`, and that directive marks everything its
 * module exports as client-only. Keeping the recipe here, in a module with no
 * directive, leaves `chipStyles` callable from a server component while the
 * React layer stays client-side. See `buttonStyle` in `actions/Button/styles.ts`
 * for the same note.
 *
 * ### Why the selected style keys off `aria-pressed`
 *
 * The selected look is written as `aria-pressed:` classes, not as a variant.
 * The painted state and the announced state then read from the same attribute,
 * so they cannot disagree, and a caller who styles another element with
 * `chipStyles` and sets `aria-pressed` on it gets the selected look too.
 *
 * @example
 * ```tsx
 * <button type="button" aria-pressed="true" className={chipStyles()}>
 *   Open
 * </button>
 * ```
 *
 * @see packages/ui/src/components/content/chip/ChipSpec.yaml
 *
 * @public
 */
const chipStyles = tv({
  base: [
    "inline-flex max-w-full items-center justify-center",
    "rounded-control border",
    "cursor-pointer select-none whitespace-nowrap",
    "transition-colors motion-reduce:transition-none",
    /*
     * Unselected: `bg-surface-base`, `text-foreground` and `border-border-strong`.
     * Ratios are `checkContrast` from `@retrojb/wcag-a11y-scanner`, light / dark.
     * Text needs 4.5:1 (1.4.3); the border and the focus outline need 3:1
     * (1.4.11, 2.4.7).
     *
     *   Text `--foreground`
     *     on --surface-base            18.95 / 17.21:1
     *     on --background         13.30 / 15.72:1
     *     on --surface-raised-1     20.31 / 16.04:1  (hover fill)
     *   Border `--border-strong`
     *     on --surface-base             5.93 /  4.83:1
     *     on --background          4.16 /  4.41:1
     *     on --surface-raised-1      6.36 /  4.50:1
     *
     * `--border` would fail 1.4.11 on every surface, so it is not used. The
     * border is what shows where an unselected chip begins.
     */
    "border-border-strong bg-surface-base text-foreground",
    "enabled:hover:bg-surface-raised-1",
    /*
     * Selected: `bg-accent` with `text-accent-foreground`, as Button's primary,
     * and a border in the same `--accent` so the box does not change size.
     *
     *   Text `--accent-foreground` on --accent        9.32 / 10.19:1
     *   Text `--accent-foreground` on --accent-hover 16.21 / 15.21:1
     *   Fill and border `--accent`
     *     on --surface-base                                 8.82 /  9.72:1
     *     on --background                              6.19 /  8.87:1
     *   Hover fill `--accent-hover`
     *     on --surface-base                                15.33 / 14.50:1
     *     on --background                             10.76 / 13.24:1
     *
     * The fill is not the only cue (1.4.1): `Chip` also draws a check icon when
     * selected, in the same `--accent-foreground`. The icon is 9.32 / 10.19:1
     * on the fill, over the 3:1 a graphic needs.
     */
    "aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground",
    "enabled:aria-pressed:hover:bg-accent-hover",
    /*
     * One focus indicator for every control (2.4.7, 2.4.13). `--focus-ring` is
     * `--primary-8`, so the outline is the same 6.19 / 8.87:1 on --background
     * and 8.82 / 9.72:1 on --surface-base as the `--accent` row above. It sits two
     * pixels outside the border, on the page, so a selected chip's accent
     * fill never has to be told apart from it.
     */
    "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
    /*
     * Contrast drops below 4.5:1 here, which 1.4.3 permits for disabled
     * controls. The cursor and the dimming are both needed so colour is never
     * the only signal, and the `disabled` attribute takes the chip out of the
     * tab order. `enabled:hover:` above keeps a disabled chip from reacting.
     */
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  variants: {
    /*
     * Chip is a pointer target, so 2.5.8 (AA) applies: both heights clear its
     * 24px minimum. Neither clears the 44px enhanced target in 2.5.5 (AAA); `md`
     * is 32px and falls 12px short. A chip that must meet AAA needs padding or a
     * larger hit area from the caller. `label-*` type roles carry the weight.
     */
    size: {
      sm: "h-(--control-height-xs) gap-(--space-1) px-(--space-2) text-label-sm",
      md: "h-(--control-height-sm) gap-(--space-2) px-(--space-3) text-label-md",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

/**
 * The variant props of {@link chipStyles}: `size`.
 *
 * @remarks
 * `IChipProps` extends this and redeclares `size` with a description and a
 * default, so the values here are the single list. Add a variant to
 * `chipStyles` and redeclare it in `types.ts`.
 *
 * @public
 */
type ChipVariants = VariantProps<typeof chipStyles>;

export { chipStyles };
export type { ChipVariants };
