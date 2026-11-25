import { tv, type VariantProps } from "../../../lib/tv";

/**
 * The class recipe behind `Avatar`: the frame, the picture and the initials,
 * as slots. Callable on its own to style an avatar this package does not
 * render.
 *
 * @remarks
 * ### Why it lives outside `Avatar.tsx`
 *
 * `Avatar` uses state to fall back when the picture fails, so it is a client
 * component. The recipe has no directive, so a server component can still
 * call it.
 *
 * ### Why sizes are fixed, not spacing
 *
 * An avatar is a picture with a size, so `sm`, `md` and `lg` are Tailwind
 * size utilities and density does not change them.
 *
 * @example
 * ```tsx
 * const slots = avatarStyles({ shape: "square", size: "lg" });
 * <span className={slots.root()}>…</span>
 * ```
 *
 * @see packages/ui/src/components/content/avatar/AvatarSpec.yaml
 *
 * @public
 */
const avatarStyles = tv({
  slots: {
    /*
     * The frame. `overflow-hidden` clips the picture to the shape; it does not
     * clip the element's own `elevated` shadow, which is drawn outside the box.
     *
     * `--border` and not `--border-strong`: an avatar is not a control and its
     * edge identifies nothing, so 1.4.11 does not apply. The border is there so
     * the shape survives forced-colors mode, which removes the fill.
     *
     * `--surface-sunken` behind `--foreground` initials: 16.57 / 18.24:1
     * (1.4.3), measured by `check:contrast`.
     */
    root: [
      "relative inline-grid shrink-0 place-items-center overflow-hidden",
      "box-border border border-border bg-surface-sunken text-foreground",
      "select-none align-middle",
    ],
    // Fills the frame and crops to it, whatever the picture's aspect ratio.
    image: "size-full object-cover",
    initials: "leading-none uppercase",
    // Lucide's person glyph, for a name that yields no initials.
    glyph: "size-[60%]",
  },

  variants: {
    /*
     * `round` is a circle. `square` keeps a small radius that grows with the
     * size, so a 24px and a 64px square read as the same shape.
     */
    shape: {
      round: { root: "rounded-circle" },
      square: {},
    },

    /*
     * 24 / 40 / 64px. The initials use the label and heading type roles, which
     * carry the weight.
     */
    size: {
      sm: { root: "size-6", initials: "text-label-sm" },
      md: { root: "size-10", initials: "text-label-md" },
      lg: { root: "size-16", initials: "text-heading-sm" },
    },

    /*
     * The `raised-1` shadow, dropped inside an overlay (`data-surface="overlay"`)
     * like an elevated `Card`. Decoration only: forced-colors mode removes it
     * and the border stays.
     */
    elevated: {
      true: { root: "shadow-raised-1 in-data-[surface=overlay]:shadow-none" },
    },
  },

  compoundVariants: [
    { shape: "square", size: "sm", class: { root: "rounded-xs" } },
    { shape: "square", size: ["md", "lg"], class: { root: "rounded-sm" } },
  ],

  defaultVariants: {
    shape: "round",
    size: "md",
    elevated: false,
  },
});

/**
 * The variant props of {@link avatarStyles}: `shape`, `size` and `elevated`.
 *
 * @remarks
 * `IAvatarProps` extends this and redeclares each variant with a description,
 * so the values here are the single list.
 *
 * @public
 */
type AvatarVariants = VariantProps<typeof avatarStyles>;

export { avatarStyles };
export type { AvatarVariants };
