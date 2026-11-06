import type { ComponentPropsWithRef, ReactNode } from "react";

/**
 * The props of `Emphasis`: every native `<em>` prop, `ref` and `className`
 * included. There are no variants.
 *
 * @public
 */
interface IEmphasisProps extends ComponentPropsWithRef<"em"> {
  /**
   * The word or phrase to stress, the one you would lean on when speaking. Keep
   * it short: italic is harder to read at length.
   */
  readonly children?: ReactNode;
}

export type { IEmphasisProps };
