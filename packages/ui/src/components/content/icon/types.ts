import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithRef } from "react";
import type { IconVariants } from "./styles";

/**
 * What `Icon` takes from the `<svg>`, and what it does not.
 *
 * Everything that decides how the icon reaches assistive technology is taken
 * out and owned by `Icon`: `role`, `aria-label`, `aria-labelledby`,
 * `aria-hidden` and `focusable` are set from `label`, and `tabIndex` is gone
 * because the icon is never a tab stop. `children` is gone because a `<title>`
 * or any other child would give the graphic a second, competing name.
 */
type IconSvgProps = Omit<
  ComponentPropsWithRef<"svg">,
  | "aria-hidden"
  | "aria-label"
  | "aria-labelledby"
  | "children"
  | "focusable"
  | "role"
  | "tabIndex"
>;

interface IIconBaseProps extends IconSvgProps, IconVariants {
  /*
   * Restated as `never`, not only omitted above. TypeScript does not check a
   * hyphenated JSX attribute that the props type does not declare, so with the
   * `Omit` alone `<Icon aria-label="…" />` would still compile. Declaring them
   * as `never` makes it an error, and points to `label`.
   */
  /** Not allowed: use `label`. */
  readonly "aria-label"?: never;
  /** Not allowed: use `label`. */
  readonly "aria-labelledby"?: never;
  /** Not allowed: icons are hidden unless `label` is set. */
  readonly "aria-hidden"?: never;
  /**
   * The Lucide icon component to draw — `Search`, `ChevronRight`, `X`.
   *
   * A component, not a name. `icon="search"` would need a map from every name
   * to every icon, and a bundler cannot drop an icon that is reachable through
   * a map, so every app would ship all ~1,900 of them. Passing the component
   * means only the icons an app imports end up in its bundle. Import them from
   * `@retrojb/ui/icons` (or from `lucide-react` directly; it is the same
   * module).
   */
  readonly icon: LucideIcon;
  /**
   * Flips the icon horizontally under `dir="rtl"`.
   *
   * Mirror icons whose meaning is a direction along the reading order: arrows
   * and chevrons for back / forward / next / previous, `Undo` / `Redo`, list
   * indent and outdent, a "send" arrow, a text-alignment icon that means
   * "start". In a right-to-left page "forward" points left.
   *
   * Do not mirror icons that show a real-world object or a physical
   * direction: a clock or a refresh arrow (clocks turn the same way in every
   * locale), media play / fast-forward (they follow the tape, not the text),
   * a checkmark, a search magnifier, a download arrow pointing down, logos,
   * and anything containing Latin letters or digits.
   */
  readonly mirrorInRtl?: boolean;
}

/**
 * A decorative icon: the default.
 *
 * Rendered with `aria-hidden="true"` and `focusable="false"`, so assistive
 * technology skips it. That is the right choice for most icons, because the
 * meaning is already in text next to them or in the name of the control they
 * sit in:
 *
 *   - an icon beside visible text ("🔍 Search") repeats the text, and naming it
 *     too would announce "Search, Search";
 *   - an icon-only button gets its name from the button — `aria-label` on the
 *     `<button>` — and the icon inside it stays decorative. Naming the control
 *     itself keeps the name on the element that is focused and operated,
 *     rather than computing it from a child graphic's text.
 */
interface IIconDecorativeProps extends IIconBaseProps {
  readonly label?: never;
}

/**
 * A meaningful icon: one that carries information nothing else on the page
 * says, such as a status icon in a table cell with no text beside it.
 */
interface IIconLabelledProps extends IIconBaseProps {
  /**
   * The icon's accessible name. Setting it makes the icon meaningful.
   *
   * Rendered as `role="img"` with `aria-label` on the `<svg>`. Describe what
   * the icon *means* here, not what it looks like: "Payment failed", not
   * "Red circle with an X". An empty or whitespace-only string is treated as
   * no label, and the icon is decorative.
   *
   * A meaningful icon is a graphical object under 1.4.11 and needs 3:1
   * against what it sits on. Every `tone` clears that on the package's
   * surfaces; an inherited colour is only as good as the text colour around
   * it.
   */
  readonly label: string;
}

/**
 * A type alias rather than an interface because it is a union — an interface
 * cannot be one. The union is what enforces the contract: `aria-label` is not
 * on either half, so the only way to name an icon is `label`, and the only way
 * to leave `label` off is to be decorative.
 */
type IIconProps = IIconDecorativeProps | IIconLabelledProps;

export type { IIconDecorativeProps, IIconLabelledProps, IIconProps };
