/*
 * The variant definitions, in their own module beside the components so a
 * server component can call them; see the note in `actions/Button/styles.ts`.
 *
 *
 * HOW THE PAGE GRID IS BUILT
 *
 * Everything reads tokens from `@retrojb/tokens`: `--grid-columns` (12),
 * `--grid-gutter` and `--grid-margin` (which widen at `md` and `lg`, and
 * follow density), and `--grid-max-width` (80rem). An app changes the grid by
 * overriding those, not these classes.
 *
 * Columns are `minmax(0, 1fr)`, not `1fr`. A bare `1fr` is `minmax(auto, 1fr)`,
 * which lets a long word or a wide image force its column wider than the rest.
 *
 * The width is `min(100% - 2 * margin, max-width)` with `mx-auto`, which is the
 * margin and the cap in one declaration: below the cap the grid keeps
 * `--grid-margin` on each side, above it the grid centres.
 *
 * The column gap is capped at `100% / (columns * 2)`, so the eleven gutters
 * never take more than half the width. Without the cap, a 320px screen with
 * text at 200% has 32px gutters, eleven of them are 352px, and the grid
 * overflows the page (1.4.10). A percentage column gap resolves against the
 * grid's own width, which is what makes the cap possible. The row gap is not
 * capped: a percentage there resolves against the height.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const pageGridStyles = tv({
  base: [
    "grid min-w-0 grid-cols-[repeat(var(--grid-columns),minmax(0,1fr))]",
    "gap-x-[min(var(--grid-gutter),100%_/_(var(--grid-columns)_*_2))] gap-y-(--grid-gutter)",
    "mx-auto w-[min(100%_-_2_*_var(--grid-margin),var(--grid-max-width))]",
  ],
});

/*
 * HOW A GRID ITEM IS PLACED
 *
 * `GridItem` writes its `span` and `offset` as custom properties in `style`,
 * one per breakpoint it was given: `--gi-span`, `--gi-span-md`,
 * `--gi-start-lg` and so on. The fixed classes below read them, each
 * breakpoint falling back to the one below it, so `span={{ base: 12, md: 6 }}`
 * is 12 columns until `md` and 6 from then on.
 *
 * The classes are written out in full because Tailwind only generates classes
 * it finds as literal strings. Building them from the prop value
 * (`md:col-span-${n}`) would compile to nothing, and a lookup table of every
 * span at every breakpoint is 72 classes before offsets.
 *
 * With no span the item spans `--grid-columns`, the whole row, so a child
 * that forgets to set one does not collapse into a single column. With no
 * offset the start is `auto`, so items flow.
 */
const gridItemStyles = tv({
  base: [
    "min-w-0",
    "[grid-column-start:var(--gi-start,auto)]",
    "[grid-column-end:span_var(--gi-span,var(--grid-columns))]",
    "sm:[grid-column-start:var(--gi-start-sm,var(--gi-start,auto))]",
    "sm:[grid-column-end:span_var(--gi-span-sm,var(--gi-span,var(--grid-columns)))]",
    "md:[grid-column-start:var(--gi-start-md,var(--gi-start-sm,var(--gi-start,auto)))]",
    "md:[grid-column-end:span_var(--gi-span-md,var(--gi-span-sm,var(--gi-span,var(--grid-columns))))]",
    "lg:[grid-column-start:var(--gi-start-lg,var(--gi-start-md,var(--gi-start-sm,var(--gi-start,auto))))]",
    "lg:[grid-column-end:span_var(--gi-span-lg,var(--gi-span-md,var(--gi-span-sm,var(--gi-span,var(--grid-columns)))))]",
    "xl:[grid-column-start:var(--gi-start-xl,var(--gi-start-lg,var(--gi-start-md,var(--gi-start-sm,var(--gi-start,auto)))))]",
    "xl:[grid-column-end:span_var(--gi-span-xl,var(--gi-span-lg,var(--gi-span-md,var(--gi-span-sm,var(--gi-span,var(--grid-columns))))))]",
    "2xl:[grid-column-start:var(--gi-start-2xl,var(--gi-start-xl,var(--gi-start-lg,var(--gi-start-md,var(--gi-start-sm,var(--gi-start,auto))))))]",
    "2xl:[grid-column-end:span_var(--gi-span-2xl,var(--gi-span-xl,var(--gi-span-lg,var(--gi-span-md,var(--gi-span-sm,var(--gi-span,var(--grid-columns)))))))]",
  ],
  variants: {
    /*
     * Lays the item's children on the page grid's own columns, so a section
     * nested in the page still lines up with it. The children are placed with
     * `GridItem` too. A child spanning more columns than the item has is
     * clamped to the item's width, because a subgrid cannot add tracks.
     */
    subgrid: {
      true: "grid grid-cols-subgrid gap-y-(--grid-gutter)",
    },
  },
  defaultVariants: {
    subgrid: false,
  },
});

/**
 * The variant props of {@link pageGridStyles}. It has none today; the type
 * exists so `PageGrid` follows the same shape as every other component.
 *
 * @beta
 */
type PageGridVariants = VariantProps<typeof pageGridStyles>;

/**
 * The variant props of {@link gridItemStyles}: `subgrid`.
 *
 * @beta
 */
type GridItemVariants = VariantProps<typeof gridItemStyles>;

export { gridItemStyles, pageGridStyles };
export type { GridItemVariants, PageGridVariants };
