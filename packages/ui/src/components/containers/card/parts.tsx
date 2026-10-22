"use client";
/*
 * The composable parts of a card: header, title, body and footer.
 *
 * Optional. A card takes any children, and these are the slots of `cardStyles()`
 * as components, so the common shape needs no class names at the call site. They
 * read the card's `size` from context and work in `Card` and `GraphicCard` alike.
 *
 * Inside an `InteractiveCard` the title, body and footer are props rather than
 * parts, because the title has to wrap the card's one real control and the footer
 * has to be lifted above its overlay — neither of which a free-floating part could
 * guarantee.
 */
import { type ReactElement } from "react";
import { useCardContext } from "./context";
import { cardStyles } from "./styles";
import type {
  ICardBodyProps,
  ICardFooterProps,
  ICardHeaderProps,
  ICardTitleProps,
} from "./types";

/** Groups the title with any eyebrow or meta line above or below it. */
const CardHeader = ({
  className,
  ...props
}: ICardHeaderProps): ReactElement => (
  <div className={cardStyles().header({ class: className })} {...props} />
);

/**
 * The card's heading. `level` defaults to `3`.
 *
 * A real heading rather than a styled `<p>`, so a screen reader user can jump
 * card to card with the heading key and hear each title (1.3.1, 2.4.6).
 */
const CardTitle = ({
  level = 3,
  className,
  ...props
}: ICardTitleProps): ReactElement => {
  const { size } = useCardContext();
  const Heading = `h${level}` as const;
  return (
    <Heading
      className={cardStyles({ size }).title({ class: className })}
      {...props}
    />
  );
};

/** Supporting copy, in the muted foreground. */
const CardBody = ({ className, ...props }: ICardBodyProps): ReactElement => {
  const { size } = useCardContext();
  return (
    <div
      className={cardStyles({ size }).body({ class: className })}
      {...props}
    />
  );
};

/**
 * Actions or meta, pinned to the bottom of the card with `mt-auto` so a row of
 * cards with unequal copy still lines its footers up.
 */
const CardFooter = ({
  className,
  ...props
}: ICardFooterProps): ReactElement => (
  <div className={cardStyles().footer({ class: className })} {...props} />
);

export { CardBody, CardFooter, CardHeader, CardTitle };
