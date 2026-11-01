"use client";

import { type ReactElement } from "react";
import { ICON_SIZE_PX, ICON_STROKE_WIDTH, iconStyles } from "./styles";
import type { IIconProps } from "./types";

/**
 * A Lucide icon, sized, coloured and exposed to assistive technology the way
 * the rest of this package expects.
 *
 * ```tsx
 * import { Icon } from "@retrojb/ui";
 * import { Search, TriangleAlert } from "@retrojb/ui/icons";
 *
 * // Decorative: the button's own name is what is announced.
 * <button type="button" aria-label="Search">
 *   <Icon icon={Search} />
 * </button>
 *
 * // Meaningful: nothing else says "Warning".
 * <Icon icon={TriangleAlert} label="Warning" tone="danger" />
 * ```
 *
 *
 * WHY `role="img"` + `aria-label`, NOT `<title>`
 *
 * Both name an SVG. `role="img"` with `aria-label` is the commonly recommended
 * combination because it names the element directly. Support for a `<title>`
 * child has historically been patchier, with some browser / screen reader
 * pairs only reading it when `aria-labelledby` points at it. A `<title>` also
 * pops a native tooltip on hover that cannot be styled or dismissed, and adds a
 * DOM child to an element Lucide otherwise builds itself. `role="img"` also
 * makes the `<svg>` a single leaf, so the paths inside it are never walked.
 *
 * The trade: `aria-label` is not picked up by some page-translation tools,
 * where `<title>` text is. A translated app passes an already-translated
 * `label`.
 *
 *
 * WHY THE ARIA ATTRIBUTES ARE SET AFTER THE SPREAD
 *
 * The types already refuse `aria-label`, `aria-hidden`, `role`, `focusable`
 * and `tabIndex`, but a cast or a spread of untyped props can still deliver
 * them. Writing ours last means the decorative / labelled contract holds at
 * runtime too, and an icon can never become a tab stop.
 *
 *
 * NO STRING NAMES
 *
 * `icon` is a component, not `"search"`. A name lookup needs every icon in one
 * map, and a bundler cannot drop what a map can reach, so every app would ship
 * the whole set. See `IIconBaseProps.icon`.
 */
const Icon = ({
  icon: IconComponent,
  label,
  size,
  tone,
  mirrorInRtl,
  strokeWidth,
  className,
  ...props
}: IIconProps): ReactElement => {
  const resolvedSize = size ?? "md";
  const accessibleName =
    typeof label === "string" && label.trim().length > 0 ? label : undefined;
  const a11yProps =
    accessibleName === undefined
      ? ({
          role: undefined,
          "aria-label": undefined,
          "aria-labelledby": undefined,
          "aria-hidden": true,
          focusable: false,
        } as const)
      : ({
          role: "img",
          "aria-label": accessibleName,
          "aria-labelledby": undefined,
          "aria-hidden": undefined,
          focusable: false,
        } as const);

  return (
    <IconComponent
      width={ICON_SIZE_PX[resolvedSize]}
      height={ICON_SIZE_PX[resolvedSize]}
      strokeWidth={strokeWidth ?? ICON_STROKE_WIDTH[resolvedSize]}
      {...props}
      className={iconStyles({ size, tone, mirrorInRtl, className })}
      {...a11yProps}
      tabIndex={undefined}
    />
  );
};

export { Icon };
