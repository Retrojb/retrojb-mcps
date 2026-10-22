import type { HeadingLevel, IHeadingProps } from "../types";

interface ISubHeadingProps extends IHeadingProps {
  /**
   * The rendered element, `<h1>`–`<h6>`. Defaults to `3`.
   *
   * Set from the document outline, independently of `size` (1.3.1).
   */
  readonly level?: HeadingLevel;
}

export type { ISubHeadingProps };
