"use client";

import { type ReactElement, type Ref } from "react";
import { CardContext } from "./context";
import { cardStyles } from "./styles";
import type { IGraphicCardProps } from "./types";

/**
 * A card with a media region — an image, a `<picture>`, a video or an SVG — and
 * content beside or below it.
 *
 * ```tsx
 * <GraphicCard
 *   orientation="horizontal"
 *   media={<img src="/trail.jpg" alt="A ridge path above the tree line at dusk" />}
 * >
 *   <CardHeader>
 *     <CardTitle>Ridge trail</CardTitle>
 *   </CardHeader>
 *   <CardBody>9.4 km, 620 m of climbing.</CardBody>
 * </GraphicCard>
 * ```
 *
 *
 * WHY ONE COMPONENT WITH AN `orientation` VARIANT
 *
 * Rather than a `VerticalGraphicCard` and a `HorizontalGraphicCard`. This package
 * splits components when the *contract* differs — the alerts are three because
 * they reach assistive technology three different ways, `ComboBox` and `SearchBox`
 * are two because one commits a value and the other does not. Orientation changes
 * nothing but layout: same markup, same reading order, same semantics. That is
 * what a style variant is for, the way `Button` has `intent` rather than a
 * `PrimaryButton`. And a horizontal card already *is* a vertical one below 28rem,
 * so two components would be one component whose name is wrong half the time.
 *
 *
 * WHY IT RESPONDS TO ITS CONTAINER, NOT THE VIEWPORT
 *
 * The root is an `@container` and the horizontal layout switches at `@md`, the
 * card's own width. A card does not know where it will be placed — a three-up
 * grid, a sidebar, a modal — and the viewport says nothing about any of them. It
 * fills whatever it is given (`w-full min-w-0 h-full`) and lays itself out for
 * that width.
 *
 * Media comes first in the DOM as well as on screen, so reading order and visual
 * order agree (1.3.2) in both orientations.
 */
const GraphicCard = ({
  as: Root = "div",
  media,
  size,
  orientation,
  mediaRatio,
  className,
  contentClassName,
  children,
  ref,
  ...props
}: IGraphicCardProps): ReactElement => {
  const slots = cardStyles({ size, orientation, mediaRatio });
  // See the note on the same cast in `Card.tsx`.
  const Element = Root as "div";
  return (
    <CardContext value={{ size: size ?? "md" }}>
      <Element
        ref={ref as Ref<HTMLDivElement> | undefined}
        className={slots.root({ class: className })}
        {...props}
      >
        <div className={slots.layout()}>
          <div className={slots.media()}>{media}</div>
          <div className={slots.content({ class: contentClassName })}>
            {children}
          </div>
        </div>
      </Element>
    </CardContext>
  );
};

export { GraphicCard };
