import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { GridItemVariants, PageGridVariants } from "./styles";

/**
 * The breakpoints a responsive value can name. `base` is below `sm`; each
 * other key applies from that breakpoint up until a larger key overrides it.
 * They are Tailwind's: `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl`
 * 96rem.
 *
 * @beta
 */
type GridBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * One value for every width, or a value per breakpoint. Keys left out inherit
 * from the next smaller key that is set.
 *
 * @example
 * ```ts
 * const span: GridResponsive<GridSpan> = { base: "full", md: 6, lg: 4 };
 * ```
 *
 * @beta
 */
type GridResponsive<T> = T | Readonly<Partial<Record<GridBreakpoint, T>>>;

/**
 * How many columns an item covers: a whole number from 1 to the column count
 * (12 by default), or `"full"` for the whole row.
 *
 * @beta
 */
type GridSpan = number | "full";

/**
 * The elements `PageGrid` may render as. `main` when the grid is the page's
 * main content, `header` and `footer` for those regions, `ul` or `ol` when
 * every item is a list item (then render each `GridItem` as `li`).
 *
 * @beta
 */
type PageGridElement =
  "div" | "main" | "section" | "header" | "footer" | "ul" | "ol";

/**
 * The elements `GridItem` may render as. Pick the one that matches what the
 * region is: `aside` for complementary content, `nav` for navigation, `li`
 * inside a list grid.
 *
 * @beta
 */
type GridItemElement =
  "div" | "section" | "article" | "aside" | "nav" | "header" | "footer" | "li";

/**
 * `div` props plus a ref typed as `HTMLElement`, for the same reason as
 * `CardRootProps`: `as` changes the element.
 */
type GridRootProps = ComponentPropsWithoutRef<"div"> & {
  readonly ref?: Ref<HTMLElement>;
};

/**
 * The props of `PageGrid`.
 *
 * @beta
 */
interface IPageGridProps extends GridRootProps, PageGridVariants {
  /**
   * The root element. See {@link PageGridElement}.
   *
   * @default div
   */
  readonly as?: PageGridElement;
  /** The page's regions, each a `GridItem`. */
  readonly children?: ReactNode;
}

/**
 * The props of `GridItem`.
 *
 * @beta
 */
interface IGridItemProps extends GridRootProps, GridItemVariants {
  /**
   * The root element. See {@link GridItemElement}.
   *
   * @default div
   */
  readonly as?: GridItemElement;
  /**
   * Columns covered, once or per breakpoint: `6`, or
   * `{ base: "full", md: 6, lg: 4 }`. Whole numbers only; a fraction is
   * rounded and anything below 1 becomes 1.
   *
   * @remarks
   * Keep `span` plus `offset` within the column count. More than that makes
   * the page grid add columns, and the layout overflows.
   *
   * @default full
   */
  readonly span?: GridResponsive<GridSpan>;
  /**
   * Empty columns before the item, once or per breakpoint. `0` puts the item
   * in the first column. Ignored at a breakpoint where `span` is `"full"`.
   * Leave it out to let items flow one after another.
   */
  readonly offset?: GridResponsive<number>;
  /**
   * Lays this item's children on the page grid's columns, so a nested section
   * stays aligned with the page. Place the children with `GridItem`.
   *
   * @default false
   */
  readonly subgrid?: GridItemVariants["subgrid"];
  readonly children?: ReactNode;
}

export type {
  GridBreakpoint,
  GridItemElement,
  GridResponsive,
  GridSpan,
  IGridItemProps,
  IPageGridProps,
  PageGridElement,
};
