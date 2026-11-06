import type { ComponentPropsWithRef, ReactNode } from "react";

/**
 * The props of `Strong`: every native `<strong>` prop, `ref` and `className`
 * included. There are no variants.
 *
 * @public
 */
interface IStrongProps extends ComponentPropsWithRef<"strong"> {
  /**
   * The phrase that is important, serious or urgent. Keep it short, a word or
   * a phrase rather than a whole sentence.
   */
  readonly children?: ReactNode;
}

export type { IStrongProps };
