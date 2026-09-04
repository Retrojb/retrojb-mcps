"use client";

import { type ComponentPropsWithRef, type ReactElement } from "react";

import { button, type ButtonVariants } from "../variants.js";

export interface ButtonProps
  extends ComponentPropsWithRef<"button">, ButtonVariants {}

/**
 * A button.
 *
 * `type` defaults to `"button"`. The HTML default is `"submit"`, so a button
 * dropped inside a form to open a dialog would submit the form instead — a bug
 * that only shows up once the button is reused somewhere with a form around it.
 * Pass `type="submit"` explicitly when submitting is what you want.
 */
export function Button({
  className,
  intent,
  size,
  fullWidth,
  type = "button",
  ...props
}: ButtonProps): ReactElement {
  return (
    <button
      type={type}
      className={button({ intent, size, fullWidth, className })}
      {...props}
    />
  );
}
