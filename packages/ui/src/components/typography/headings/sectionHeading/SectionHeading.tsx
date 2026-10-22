import { type ReactElement } from "react";
import { HeadingBase } from "../HeadingBase";
import { sectionHeadingStyles } from "./styles";
import type { ISectionHeadingProps } from "./types";

/**
 * The heading of a section. Drawn at `text-heading-md`.
 *
 * ```tsx
 * <SectionHeading>Invoices</SectionHeading>
 * ```
 *
 * Defaults to `level={2}`, the same level as `TitleHeading` and a step smaller.
 * Most pages need only one of the two at the `<h2>` level; under a
 * `TitleHeading`, pass `level={3}`.
 *
 * `size` redraws it at another heading role without changing the element, for
 * the cases where the outline and the design disagree. See
 * `typography/index.ts` for why this is a named component rather than a
 * `<Heading size>`.
 */
const SectionHeading = ({
  level = 2,
  size,
  className,
  ...props
}: ISectionHeadingProps): ReactElement => (
  <HeadingBase
    level={level}
    className={sectionHeadingStyles({ size, className })}
    {...props}
  />
);

export { SectionHeading };
