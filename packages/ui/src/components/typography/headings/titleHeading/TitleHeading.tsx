import { type ReactElement } from "react";
import { HeadingBase } from "../HeadingBase";
import { titleHeadingStyles } from "./styles";
import type { ITitleHeadingProps } from "./types";

/**
 * The heading of a major page region. Drawn at `text-heading-lg`.
 *
 * ```tsx
 * <TitleHeading>Payment methods</TitleHeading>
 * ```
 *
 * Defaults to `level={2}`: a region directly under the page title. Inside a
 * region that already has an `<h2>`, pass `level={3}`.
 *
 * `size` redraws it at another heading role without changing the element, for
 * the cases where the outline and the design disagree. See
 * `typography/index.ts` for why this is a named component rather than a
 * `<Heading size>`.
 */
const TitleHeading = ({
  level = 2,
  size,
  className,
  ...props
}: ITitleHeadingProps): ReactElement => (
  <HeadingBase
    level={level}
    className={titleHeadingStyles({ size, className })}
    {...props}
  />
);

export { TitleHeading };
