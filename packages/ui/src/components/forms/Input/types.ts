import type { ComponentPropsWithRef, ReactNode } from "react";

import type { InputVariants } from "./styles.js";

interface IInputProps
  extends
    Omit<ComponentPropsWithRef<"input">, "size">,
    Omit<InputVariants, "invalid"> {
  /**
   * The visible label. Required, deliberately.
   *
   * An input with no label is the single most common WCAG failure there is
   * (4.1.2, and 3.3.2 for the missing instruction). Making this a required prop
   * means the type checker catches it, rather than an audit catching it later.
   * Use `labelHidden` when the design has no room for visible label text — the
   * label still exists for assistive technology.
   */
  readonly label: ReactNode;

  /** Helper text, wired to the input with `aria-describedby`. */
  readonly description?: ReactNode;

  /**
   * The validation message. Presence switches the control into its invalid
   * state and sets `aria-invalid`, so there is no way to show the styling
   * without announcing it.
   */
  readonly error?: ReactNode;

  /** Wrapper class. `className` goes to the input itself. */
  readonly rootClassName?: string;
}

export type { IInputProps };
