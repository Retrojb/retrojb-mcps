import type { ComponentPropsWithRef } from "react";

import type { LinkVariants } from "./styles";

interface ILinkProps extends ComponentPropsWithRef<"a">, LinkVariants {
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

export type { ILinkProps };
