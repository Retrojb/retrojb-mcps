"use client";

import { type ReactElement } from "react";

import { linkStyle } from "./styles";
import type { ILinkProps } from "./types";

/**
 * A text link.
 *
 * Renders an `<a>`. For client-side routing, use the exported `linkStyle()`
 * variant on the router's own link component instead — it is importable from
 * server components, which this one is not.
 */
const Link = ({
  className,
  intent,
  external = false,
  externalLabel = "(opens in a new tab)",
  children,
  ...props
}: ILinkProps): ReactElement => {
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
    <a className={linkStyle({ intent, className })} {...props} {...externalProps}>
      {children}
      {external ? <span className="sr-only"> {externalLabel}</span> : null}
    </a>
  );
};

export { Link };
