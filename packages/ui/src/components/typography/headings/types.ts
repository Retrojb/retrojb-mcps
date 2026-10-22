import type { ComponentPropsWithRef } from "react";
import type { HeadingVariants } from "./styles";

/**
 * A heading level: `1` renders `<h1>`, `6` renders `<h6>`.
 *
 * Choose it from the document outline, not from how large the heading should
 * look — that is `size`. Levels should not skip on the way down (an `<h2>`
 * section's subsections are `<h3>`), and a page has one `<h1>` (1.3.1).
 */
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** The type roles a heading may be drawn at. */
type HeadingSize = NonNullable<HeadingVariants["size"]>;

/**
 * The props every named heading shares.
 *
 * `h1` props stand in for all six levels: every `<h1>`–`<h6>` has the same
 * attributes and the same `HTMLHeadingElement` interface, so the ref is typed
 * correctly whichever `level` is rendered.
 */
interface IHeadingProps extends ComponentPropsWithRef<"h1">, HeadingVariants {
  /** The rendered element, `<h1>`–`<h6>`. Each component documents its default. */
  readonly level?: HeadingLevel;
}

/** Internal: what `HeadingBase` needs once a component has resolved its classes. */
interface IHeadingBaseProps extends Omit<IHeadingProps, "size" | "level"> {
  readonly level: HeadingLevel;
}

export type { HeadingLevel, HeadingSize, IHeadingBaseProps, IHeadingProps };
