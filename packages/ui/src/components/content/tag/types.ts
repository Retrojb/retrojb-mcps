import type { ComponentPropsWithRef } from "react";
import type { TagVariants } from "./styles";

/**
 * The props of `Tag`: a native `<span>`'s props, the two variants, and the
 * required `text` label.
 *
 * @remarks
 * Extends {@link TagVariants} so a variant added to `styles.ts` still reaches
 * callers. Each variant is redeclared below only to give it a description and
 * default, since a type produced by `VariantProps` carries neither.
 *
 * @public
 */
interface ITagProps extends ComponentPropsWithRef<"span">, TagVariants {
  /**
   * The visible label. Required because the word, not the colour, is what
   * tells the reader the tag's meaning (WCAG 1.4.1).
   */
  readonly text: string;

  /**
   * The colour family. `neutral` is a plain category, `info` is accent,
   * `success` and `danger` state an outcome. The text must still say which.
   *
   * @default neutral
   */
  readonly tone?: TagVariants["tone"];

  /**
   * Type size: `sm` uses the `label-sm` role and `md` uses `label-md`.
   *
   * @default sm
   */
  readonly size?: TagVariants["size"];
}

export type { ITagProps };
