"use client";

import { type ComponentPropsWithRef, type ReactElement } from "react";

import { link, type LinkVariants } from "../variants.js";

export interface LinkProps extends ComponentPropsWithRef<"a">, LinkVariants {
  /**
   * Opens the link in a new tab and warns assistive technology that it will.
   *
   * Sets `target` and `rel`, and appends visually hidden text to the accessible
   * name. The warning is the part that matters: WCAG 3.2.5 asks that a change of
   * context be initiated by the user or be announced first, and a new tab
   * opening with no warning is neither for a screen reader or magnifier user.
   */
  readonly external?: boolean;

  /** The announced new-tab warning. Override to translate it. */
  readonly externalLabel?: string;
}

/**
 * A text link.
 *
 * Renders an `<a>`. For client-side routing, use the exported `link()` variant
 * on the router's own link component instead — it is importable from server
 * components, which this one is not.
 */
export function Link({
  className,
  intent,
  external = false,
  externalLabel = "(opens in a new tab)",
  children,
  ...props
}: LinkProps): ReactElement {
  // Only defaulted, never forced: an explicit `target` or `rel` on the call site
  // wins, so `external` stays a convenience rather than a constraint.
  const externalProps = external
    ? {
        target: props.target ?? "_blank",
        // `noreferrer` implies `noopener` in current browsers, but not in older
        // ones, and the cost of naming both is nothing.
        rel: props.rel ?? "noreferrer noopener",
      }
    : {};

  return (
    <a className={link({ intent, className })} {...props} {...externalProps}>
      {children}
      {external ? <span className="sr-only"> {externalLabel}</span> : null}
    </a>
  );
}
