"use client";

import { type ReactElement, type Ref } from "react";
import { CardContext } from "./context";
import { cardStyles } from "./styles";
import type { ICardProps } from "./types";

/**
 * A static content container.
 *
 * ```tsx
 * <Card as="article">
 *   <CardHeader>
 *     <CardTitle level={2}>Usage this month</CardTitle>
 *   </CardHeader>
 *   <CardBody>1,204 of 5,000 requests.</CardBody>
 * </Card>
 * ```
 *
 * One element: the root is the box and carries the content padding too, so a
 * plain card adds no wrapper divs. For media, use `GraphicCard`; for a card that is
 * itself a link or a button, `InteractiveCard`.
 *
 */
const Card = ({
  as: Root = "div",
  size,
  className,
  children,
  ref,
  ...props
}: ICardProps): ReactElement => {
  const slots = cardStyles({ size });

  const Element = Root as "div";

  return (
    <CardContext value={{ size: size ?? "md" }}>
      <Element
        ref={ref as Ref<HTMLDivElement> | undefined}
        className={slots.root({ class: [slots.content(), className] })}
        {...props}
      >
        {children}
      </Element>
    </CardContext>
  );
};

export { Card };
