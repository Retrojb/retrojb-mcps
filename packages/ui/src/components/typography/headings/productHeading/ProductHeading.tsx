import { type ReactElement } from "react";
import { HeadingBase } from "../HeadingBase";
import { productHeadingStyles } from "./styles";
import type { IProductHeadingProps } from "./types";

/**
 * The largest heading: a product name or a hero headline. Drawn at `text-
 * display`.
 *
 * ```tsx
 * <ProductHeading>Retro Studio</ProductHeading>
 * ```
 *
 * Usually the page's `<h1>` on a landing or marketing page. Where the page has
 * its own `PageHeading` as well, the product name is the one that steps down —
 * `level={2}` or below — since a page has one `<h1>`.
 *
 * `size` redraws it at another heading role without changing the element, for
 * the cases where the outline and the design disagree. See
 * `typography/index.ts` for why this is a named component rather than a
 * `<Heading size>`.
 */
const ProductHeading = ({
  level = 1,
  size,
  className,
  ...props
}: IProductHeadingProps): ReactElement => (
  <HeadingBase
    level={level}
    className={productHeadingStyles({ size, className })}
    {...props}
  />
);

export { ProductHeading };
