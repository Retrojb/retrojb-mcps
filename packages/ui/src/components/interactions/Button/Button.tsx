"use client";

import { type ReactElement } from "react";

import { buttonStyle } from "./styles.js";
import type { IButtonProps } from "./types.js";

/**
 * A button.
 *
 * `type` defaults to `"button"`. The HTML default is `"submit"`, so a button
 * dropped inside a form to open a dialog would submit the form instead — a bug
 * that only shows up once the button is reused somewhere with a form around it.
 * Pass `type="submit"` explicitly when submitting is what you want.
 */
const Button = ({
  className,
  text,
  intent,
  size,
  fullWidth,
  type = "button",
  ...props
}: IButtonProps): ReactElement => {
  return (
    <button
      type={type}
      className={buttonStyle({ intent, size, fullWidth, className })}
      {...props}
    >
      {text}
    </button>
  );
};

export { Button };
