import type { ComponentPropsWithRef, ReactNode } from "react";

import type { BrowserAlertVariants } from "./styles";

interface IBrowserAlertProps
  extends
    Omit<ComponentPropsWithRef<"dialog">, "children" | "open" | "title">,
    BrowserAlertVariants {
  /** Whether the dialog is open. Controlled — the caller owns this. */
  readonly open: boolean;

  /**
   * Called whenever the dialog closes, by any route: the confirm button, the cancel
   * button, or Escape.
   *
   * Escape is the one that catches people out. The platform closes a modal `<dialog>`
   * on Escape whether or not React knows about it, so without this the element would
   * be shut while `open` stayed `true` and the dialog could never be reopened.
   * Closing on Escape is not optional, either — trapping the user inside with no
   * keyboard way out is WCAG 2.1.2.
   */
  readonly onClose: () => void;

  /**
   * The headline. Required, because it is the dialog's accessible name.
   *
   * A dialog with no name is announced as just "dialog", which tells a screen reader
   * user that something has taken over the page and nothing about what (WCAG 4.1.2,
   * 2.4.6). Required means the type checker catches it — the same call `Input` makes
   * about `label` and `Table` about `caption`.
   *
   * Phrase it as the question or the problem: `"Delete workspace?"`, not `"Confirm"`.
   *
   * The intrinsic `title` attribute is omitted from this interface so the name can be
   * used for the visible headline. A tooltip on a modal dialog is not a thing anyone
   * needs.
   */
  readonly title: string;

  /** The explanation under the title. Becomes the dialog's accessible description. */
  readonly children?: ReactNode;

  /**
   * The eyebrow above the title. Defaults to `Note`, `Success` or `Error`.
   *
   * Part of the accessible name along with `title`, so the tone is announced rather
   * than being carried by the bar colour alone (WCAG 1.4.1).
   */
  readonly label?: string;

  /** Label for the confirming action. Defaults to `"OK"`. */
  readonly confirmLabel?: string;

  /**
   * What the confirming action does. Defaults to just closing.
   *
   * It does not close the dialog for you. The caller owns `open`, so an action that
   * needs to stay open — a request in flight, a validation failure — can leave it
   * open, and one that is done calls `onClose` itself.
   */
  readonly onConfirm?: () => void;

  /**
   * Label for the dismissing action. Providing this or `onCancel` is what turns the
   * dialog from an acknowledgement into a confirmation. Defaults to `"Cancel"` once
   * either is present.
   */
  readonly cancelLabel?: string;

  /** What the dismissing action does. Defaults to just closing. */
  readonly onCancel?: () => void;

  /** Class for the inner box. `className` goes to the `<dialog>` shell. */
  readonly boxClassName?: string;
}

export type { IBrowserAlertProps };
