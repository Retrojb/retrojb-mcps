import { type ReactElement } from "react";
import { HeadingBase } from "../HeadingBase";
import { pageHeadingStyles } from "./styles";
import type { IPageHeadingProps } from "./types";

/**
 * The page's title — its one `<h1>`. Drawn at `text-heading-xl`.
 *
 * ```tsx
 * <PageHeading>Billing</PageHeading>
 * ```
 *
 * Defaults to `level={1}` because that is what it nearly always is. Use one per
 * page; a screen reader user who presses `1` to jump to the main heading
 * expects exactly one answer.
 *
 * `size` redraws it at another heading role without changing the element, for
 * the cases where the outline and the design disagree. See
 * `typography/index.ts` for why this is a named component rather than a
 * `<Heading size>`.
 */
const PageHeading = ({
  level = 1,
  size,
  className,
  ...props
}: IPageHeadingProps): ReactElement => (
  <HeadingBase
    level={level}
    className={pageHeadingStyles({ size, className })}
    {...props}
  />
);

export { PageHeading };
