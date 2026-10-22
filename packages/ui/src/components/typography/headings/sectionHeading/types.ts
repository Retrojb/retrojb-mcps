import type { HeadingLevel, IHeadingProps } from "../types";

interface ISectionHeadingProps extends IHeadingProps {
  /**
   * The rendered element, `<h1>`–`<h6>`. Defaults to `2`.
   *
   * Set from the document outline, independently of `size` (1.3.1).
   */
  readonly level?: HeadingLevel;
}

export type { ISectionHeadingProps };
