import type { ComponentPropsWithRef, ReactNode } from "react";

/** Inline code. Every native `<code>` prop, `ref` and `className` included. */
interface ICodeProps extends ComponentPropsWithRef<"code"> {
  readonly children?: ReactNode;
}

interface ICodeBlockProps extends Omit<
  ComponentPropsWithRef<"pre">,
  "children"
> {
  /**
   * What the block contains, e.g. `"Install command"` or `"Example: tv() call"`.
   * Required, deliberately.
   *
   * The block is a keyboard-focusable scroll region (2.1.1), and a focusable
   * element with no name is announced as nothing at all. This becomes the
   * region's `aria-label`.
   */
  readonly label: string;
  /** The code. Whitespace is preserved exactly. */
  readonly children?: ReactNode;
  /** Class for the inner `<code>`. `className` goes to the `<pre>`. */
  readonly codeClassName?: string;
}

export type { ICodeBlockProps, ICodeProps };
