import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ReactNode,
  Ref,
} from "react";
import type { CardVariants } from "./styles";

/**
 * The elements a card root may render as.
 *
 * Block containers only. `article` for a self-contained item (a post, a product),
 * `section` for a titled region of a page, `li` when the cards are a list — which
 * they usually are, and a `<ul>` of `<li>` cards gives a screen reader user the
 * count ("list, 6 items") for free. Never `a` or `button`: wrapping a whole card
 * in an interactive element is what `InteractiveCard` exists to avoid.
 */
type CardElement = "div" | "article" | "section" | "li";

/** Heading levels a card title may take. `h1` is the page's, not a card's. */
type CardHeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * The root's native props.
 *
 * `div` props plus a ref typed as `HTMLElement`, because `as` can make the root an
 * `<li>` or an `<article>` and a ref typed for `HTMLDivElement` would be lying about
 * what it points at. Every element in {@link CardElement} accepts the global
 * attributes `div` does.
 */
type CardRootProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  readonly ref?: Ref<HTMLElement>;
};

interface ICardProps extends CardRootProps, Pick<CardVariants, "size"> {
  /** The root element. Defaults to `"div"`. See {@link CardElement}. */
  readonly as?: CardElement;
  readonly children?: ReactNode;
}

type ICardHeaderProps = ComponentPropsWithRef<"div">;

interface ICardTitleProps extends ComponentPropsWithRef<"h3"> {
  /**
   * The heading level. Defaults to `3`.
   *
   * There is no default that is right everywhere — it depends on the heading above
   * the cards. Pick the one that keeps the outline unbroken (1.3.1): cards under an
   * `<h2>` section take `3`.
   */
  readonly level?: CardHeadingLevel;
}

type ICardBodyProps = ComponentPropsWithRef<"div">;

type ICardFooterProps = ComponentPropsWithRef<"div">;

/**
 * What a card shares with its parts. Only the size: `CardTitle` and `CardBody`
 * scale their type with the card they sit in, so `size` is set once on the card
 * rather than repeated on every part.
 */
interface ICardContextValue {
  readonly size: NonNullable<CardVariants["size"]>;
}

/**
 * Props shared by the cards that render the full slot structure.
 */
interface ICardLayoutProps {
  /** The root element. Defaults to `"div"`. See {@link CardElement}. */
  readonly as?: CardElement;
  /**
   * An image, `<picture>`, `<video>` or SVG, filled into the media region and
   * cropped with `object-cover`.
   *
   * Alt text is the caller's, and it is the decision that matters here (1.1.1):
   *
   * - A meaningful image needs `alt` that says what it shows — what a sighted user
   *   would lose if the image failed to load.
   * - A decorative one — a stock photo restating the title — takes `alt=""`, which
   *   removes it from the accessibility tree. An `<img>` with *no* `alt` is not the
   *   same thing: most screen readers fall back to reading the file name.
   * - An inline SVG that is decorative takes `aria-hidden="true"`; one that carries
   *   meaning takes `role="img"` and an `aria-label`.
   */
  readonly media?: ReactNode;
  /** Class for the root element. */
  readonly rootClassName?: string;
}

interface IGraphicCardProps
  extends
    CardRootProps,
    Pick<CardVariants, "size" | "orientation" | "mediaRatio">,
    Omit<ICardLayoutProps, "media" | "rootClassName"> {
  /** Required — a graphic card without a graphic is a `Card`. See {@link ICardLayoutProps.media}. */
  readonly media: ReactNode;
  /** The content beside or below the media: usually `CardHeader`, `CardBody`, `CardFooter`. */
  readonly children?: ReactNode;
  /** Class for the content region. `className` goes to the root. */
  readonly contentClassName?: string;
}

/**
 * Everything both `InteractiveCard` modes share.
 */
interface IInteractiveCardBaseProps
  extends
    ICardLayoutProps,
    Pick<CardVariants, "size" | "orientation" | "mediaRatio"> {
  /**
   * The card's title, rendered inside the link or button. Required, deliberately.
   *
   * It is the control's accessible name (4.1.2, 2.4.4). A card whose only link is
   * a stretched overlay with no text would be announced as "link" and nothing
   * else, so the type checker refuses it.
   */
  readonly title: ReactNode;
  /**
   * The heading level the title sits in. Defaults to `3`. See
   * {@link ICardTitleProps.level}.
   */
  readonly headingLevel?: CardHeadingLevel;
  /**
   * Supporting copy. Also wired to the control's `aria-describedby`, so a screen
   * reader user tabbing card to card hears it after the title.
   *
   * Keep it non-interactive. It sits under the overlay, so a link in here is
   * unclickable unless it carries `cardStyles().raised()`.
   */
  readonly children?: ReactNode;
  /**
   * Secondary controls — "Save", "Share", a menu. Rendered in the footer and lifted
   * above the overlay, so each stays independently clickable and comes after the
   * primary control in the tab order.
   */
  readonly actions?: ReactNode;
}

/** Link mode: the primary control is an `<a href>`. */
interface IInteractiveCardLinkProps
  extends
    IInteractiveCardBaseProps,
    // `media` is also a (long-obsolete) `<a>` attribute; the card's slot wins.
    Omit<ComponentPropsWithRef<"a">, "title" | "children" | "href" | "media"> {
  readonly href: string;
  /** Not available in link mode — an `<a>` has no disabled state. */
  readonly disabled?: never;
}

/** Button mode: the primary control is a `<button>`. */
interface IInteractiveCardButtonProps
  extends
    IInteractiveCardBaseProps,
    Omit<ComponentPropsWithRef<"button">, "title" | "children"> {
  readonly href?: never;
}

/**
 * `href` picks the mode. With one, the primary control is a link and the native
 * props are the anchor's; without, it is a button and they are the button's.
 *
 * A type alias rather than an interface because it is a union — an interface cannot
 * express "one of these two".
 */
type IInteractiveCardProps =
  IInteractiveCardLinkProps | IInteractiveCardButtonProps;

export type {
  CardElement,
  CardHeadingLevel,
  ICardBodyProps,
  ICardContextValue,
  ICardFooterProps,
  ICardHeaderProps,
  ICardProps,
  ICardTitleProps,
  IGraphicCardProps,
  IInteractiveCardButtonProps,
  IInteractiveCardLinkProps,
  IInteractiveCardProps,
};
