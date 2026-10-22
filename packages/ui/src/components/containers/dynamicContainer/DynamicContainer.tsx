"use client";

import { type ReactElement, type Ref } from "react";
import { dynamicContainerStyles } from "./styles";
import type { IDynamicContainerProps } from "./types";

/**
 * A flex layout that stacks below the `sm` breakpoint and lays out in a row
 * from `sm` up.
 *
 * ```tsx
 * <DynamicContainer as="ul" gap="lg">
 *   <li>One</li>
 *   <li>Two</li>
 * </DynamicContainer>
 * ```
 *
 * `direction="vertical"` and `"horizontal"` pin it to one axis. The row wraps,
 * so a long set of items breaks onto a second line instead of overflowing. For
 * a layout that follows its container's width rather than the viewport's, see
 * `responsiveTo` and the note in `styles.ts`.
 *
 *
 * WHY A LIST GETS `role="list"`
 *
 * The root carries `list-style: none`, and WebKit drops list semantics from a
 * `<ul>` or `<ol>` styled that way — VoiceOver in Safari stops announcing it as
 * a list. An explicit `role="list"` restores it. A caller-supplied `role` still
 * wins.
 */
const DynamicContainer = ({
  as: Root = "div",
  direction,
  responsiveTo,
  gap,
  align,
  className,
  role,
  children,
  ref,
  ...props
}: IDynamicContainerProps): ReactElement => {
  /*
   * JSX types `ref` per tag, and a union of tags narrows it to the strictest of
   * them, `HTMLDivElement`. Every element in the union is an `HTMLElement`,
   * which is all the public `ref` prop promises — the same cast as `Card`.
   */
  const Element = Root as "div";
  const isList = Root === "ul" || Root === "ol";
  return (
    <Element
      ref={ref as Ref<HTMLDivElement> | undefined}
      role={role ?? (isList ? "list" : undefined)}
      className={dynamicContainerStyles({
        direction,
        responsiveTo,
        gap,
        align,
        className,
      })}
      {...props}
    >
      {children}
    </Element>
  );
};

export { DynamicContainer };
