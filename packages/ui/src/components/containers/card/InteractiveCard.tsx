"use client";

import { type ReactElement, type ReactNode, useId } from "react";
import { CardContext } from "./context";
import { cardStyles, type CardVariants } from "./styles";
import type {
  CardElement,
  CardHeadingLevel,
  IInteractiveCardButtonProps,
  IInteractiveCardLinkProps,
  IInteractiveCardProps,
} from "./types";

/** `href` is what picks the mode. See {@link IInteractiveCardProps}. */
const isLinkProps = (
  props: IInteractiveCardProps,
): props is IInteractiveCardLinkProps => typeof props.href === "string";

/** Composes the description id with any caller-supplied `aria-describedby`. */
const joinIds = (
  ...ids: ReadonlyArray<string | undefined>
): string | undefined =>
  ids
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ") || undefined;

interface IFrameProps extends Pick<
  CardVariants,
  "size" | "orientation" | "mediaRatio"
> {
  readonly as: CardElement;
  readonly headingLevel: CardHeadingLevel;
  readonly media: ReactNode;
  readonly description: ReactNode;
  readonly descriptionId: string;
  readonly actions: ReactNode;
  readonly disabled: boolean;
  readonly rootClassName: string | undefined;
  /** The `<a>` or `<button>`, already built by the mode that owns it. */
  readonly control: ReactElement;
}

/**
 * The markup both modes share. Everything but the control itself.
 */
const InteractiveCardFrame = ({
  as: Root,
  headingLevel,
  media,
  description,
  descriptionId,
  actions,
  disabled,
  size,
  orientation,
  mediaRatio,
  rootClassName,
  control,
}: IFrameProps): ReactElement => {
  const slots = cardStyles({
    size,
    orientation,
    mediaRatio,
    interactive: true,
    disabled,
  });
  const Heading = `h${headingLevel}` as const;
  // `!= null` rather than truthiness, so `0` still renders; `false` is what
  // `{flag && …}` collapses to and is not content.
  const hasMedia = media != null && media !== false;
  const hasDescription = description != null && description !== false;
  const hasActions = actions != null && actions !== false;
  return (
    <CardContext value={{ size: size ?? "md" }}>
      <Root className={slots.root({ class: rootClassName })}>
        <div className={slots.layout()}>
          {hasMedia ? <div className={slots.media()}>{media}</div> : null}
          <div className={slots.content()}>
            <Heading className={slots.title()}>{control}</Heading>
            {hasDescription ? (
              <div id={descriptionId} className={slots.body()}>
                {description}
              </div>
            ) : null}
            {hasActions ? (
              <div className={slots.footer({ class: slots.raised() })}>
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </Root>
    </CardContext>
  );
};

const LinkCard = ({
  as = "div",
  title,
  headingLevel = 3,
  media,
  children,
  actions,
  size,
  orientation,
  mediaRatio,
  rootClassName,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: IInteractiveCardLinkProps): ReactElement => {
  const descriptionId = `${useId()}-description`;
  const hasDescription = children != null && children !== false;
  const slots = cardStyles({ interactive: true });
  return (
    <InteractiveCardFrame
      as={as}
      headingLevel={headingLevel}
      media={media}
      description={children}
      descriptionId={descriptionId}
      actions={actions}
      disabled={false}
      size={size}
      orientation={orientation}
      mediaRatio={mediaRatio}
      rootClassName={rootClassName}
      control={
        <a
          {...props}
          aria-describedby={joinIds(
            hasDescription ? descriptionId : undefined,
            ariaDescribedBy,
          )}
          className={slots.action({ class: className })}
          data-card-action=""
        >
          {title}
        </a>
      }
    />
  );
};

const ButtonCard = ({
  as = "div",
  title,
  headingLevel = 3,
  media,
  children,
  actions,
  size,
  orientation,
  mediaRatio,
  rootClassName,
  className,
  disabled,
  type = "button",
  "aria-describedby": ariaDescribedBy,
  ...props
}: IInteractiveCardButtonProps): ReactElement => {
  const descriptionId = `${useId()}-description`;
  const hasDescription = children != null && children !== false;
  const slots = cardStyles({ interactive: true });
  return (
    <InteractiveCardFrame
      as={as}
      headingLevel={headingLevel}
      media={media}
      description={children}
      descriptionId={descriptionId}
      actions={actions}
      disabled={disabled === true}
      size={size}
      orientation={orientation}
      mediaRatio={mediaRatio}
      rootClassName={rootClassName}
      control={
        <button
          {...props}
          type={type}
          disabled={disabled}
          aria-describedby={joinIds(
            hasDescription ? descriptionId : undefined,
            ariaDescribedBy,
          )}
          className={slots.action({ class: className })}
          data-card-action=""
        >
          {title}
        </button>
      }
    />
  );
};

/**
 * A card that is one click target, built so it is also one *control*.
 *
 * ```tsx
 * <InteractiveCard
 *   href="/projects/atlas"
 *   title="Atlas"
 *   actions={<Button intent="ghost" size="sm" text="Star Atlas" onClick={star} />}
 * >
 *   Mapping pipeline · updated 2 hours ago
 * </InteractiveCard>
 *
 * <InteractiveCard title="Start from a blank project" onClick={create} />
 * ```
 *
 * Pass `href` for a link, `onClick` (and no `href`) for a button. Native props,
 * `ref` and `className` go to that `<a>` or `<button>`; `rootClassName` goes to the
 * card.
 *
 *
 * WHY THE CARD IS NOT THE LINK
 *
 * The two obvious builds both fail. Wrapping the card in `<a>` makes its entire
 * text content the link's accessible name — a screen reader reads title, copy,
 * date and button labels as one run-on link, on every card, every time — and any
 * button inside it becomes interactive content nested in interactive content,
 * which is invalid HTML with undefined click behaviour. Putting `onClick` on a
 * `<div>` gives no role, no keyboard access and no focus (2.1.1, 4.1.2), and
 * patching each of those back by hand is how half of them get missed.
 *
 * So there is exactly one real `<a>` or `<button>`, inside the heading, named by
 * the title alone. Its `::after` is stretched over the whole card, so a click
 * anywhere lands on it. The supporting copy is attached with `aria-describedby`
 * rather than folded into the name. The `actions` sit above the overlay with
 * `z-index`, so each is its own control, reached after the primary one in the tab
 * order.
 *
 * The focus ring is drawn on the overlay, so it outlines the card — the shape the
 * control visibly is — with the same 2px outline at a 2px offset as every other
 * focusable thing in this package.
 *
 * The cost: text under the overlay cannot be selected by dragging. That is the
 * standard trade for this pattern, and it is the reason `actions` exists — anything
 * a user needs to interact with separately belongs there, or carries
 * `cardStyles().raised()`.
 */
const InteractiveCard = (props: IInteractiveCardProps): ReactElement =>
  isLinkProps(props) ? <LinkCard {...props} /> : <ButtonCard {...props} />;

export { InteractiveCard };
