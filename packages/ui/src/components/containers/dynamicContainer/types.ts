import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { DynamicContainerVariants } from "./styles";

/**
 * The elements the container may render as.
 *
 * `div` for a plain layout, `ul` / `ol` when the items are a list — a screen
 * reader then announces the count ("list, 4 items") before the first one.
 * `section` for a titled region laid out the same way.
 *
 * Deliberately not `fieldset`. A fieldset's `<legend>` has to be its first child
 * and would become a flex item beside the controls, and flex layout on a
 * fieldset itself has a long history of engine bugs. Put the container *inside*
 * the fieldset, after the legend — which is exactly what `CheckboxGroup` does.
 */
type DynamicContainerElement = "div" | "ul" | "ol" | "section";

/**
 * `div` props plus a ref typed as `HTMLElement`, for the same reason as
 * `CardRootProps`: `as` can make the root a `<ul>` or a `<section>`, and a ref
 * typed for `HTMLDivElement` would be lying about what it points at.
 */
type DynamicContainerRootProps = ComponentPropsWithoutRef<"div"> & {
  readonly ref?: Ref<HTMLElement>;
};

interface IDynamicContainerProps
  extends DynamicContainerRootProps, DynamicContainerVariants {
  /** The root element. Defaults to `"div"`. See {@link DynamicContainerElement}. */
  readonly as?: DynamicContainerElement;
  readonly children?: ReactNode;
}

export type { DynamicContainerElement, IDynamicContainerProps };
