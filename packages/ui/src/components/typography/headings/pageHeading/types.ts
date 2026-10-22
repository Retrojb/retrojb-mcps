import type { HeadingLevel, IHeadingProps } from "../types";

interface IPageHeadingProps extends IHeadingProps {
  /**
   * The rendered element, `<h1>`–`<h6>`. Defaults to `1`.
   *
   * Set from the document outline, independently of `size` (1.3.1).
   */
  readonly level?: HeadingLevel;
}

export type { IPageHeadingProps };
