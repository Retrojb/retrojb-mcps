import { type ReactElement } from "react";
import { HeadingBase } from "../HeadingBase";
import { subHeadingStyles } from "./styles";
import type { ISubHeadingProps } from "./types";

/**
 * The heading of a subsection. Drawn at `text-heading-sm`.
 *
 * ```tsx
 * <SubHeading>Past due</SubHeading>
 * ```
 *
 * Defaults to `level={3}`, under a `<h2>` section. Deeper outlines pass
 * `level={4}` and below, and may drop to `size="heading-xs"`.
 *
 * `size` redraws it at another heading role without changing the element, for
 * the cases where the outline and the design disagree. See
 * `typography/index.ts` for why this is a named component rather than a
 * `<Heading size>`.
 */
const SubHeading = ({
  level = 3,
  size,
  className,
  ...props
}: ISubHeadingProps): ReactElement => (
  <HeadingBase
    level={level}
    className={subHeadingStyles({ size, className })}
    {...props}
  />
);

export { SubHeading };
