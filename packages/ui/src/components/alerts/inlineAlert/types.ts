import type { ComponentPropsWithRef, ReactNode } from "react";

import type { InlineAlertVariants } from "./styles";

/**
 * How urgently the message should be announced.
 *
 * This is the one prop on the component worth reading the docs for, because the
 * right answer depends on something the component cannot see: whether the message
 * was already on the page when it loaded, or arrived because the user did
 * something.
 *
 * - `"off"` — no live region. Correct for a notice that is part of the page as
 *   rendered. Nothing changed, so there is nothing to announce, and a live region
 *   here either says nothing or interrupts on load depending on the engine.
 * - `"polite"` — `role="status"`. Announced at the next pause. Correct for
 *   confirmations and progress: "Draft saved".
 * - `"assertive"` — `role="alert"`. Interrupts whatever is being read. Correct for
 *   errors that block the user, and close to rude for anything else.
 *
 * WCAG 4.1.3 (Status Messages, AA) is the criterion behind `polite` and
 * `assertive`: a message that conveys a change in state has to reach assistive
 * technology without the user having to go looking for it.
 */
type InlineAlertLiveness = "off" | "polite" | "assertive";

interface IInlineAlertProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, InlineAlertVariants {
  /**
   * The message.
   *
   * Optional, and the component still renders its live region when there is none —
   * which is what makes a later message announceable. Leaving it out is how you
   * keep the region mounted while there is nothing to say.
   */
  readonly children?: ReactNode;

  /**
   * The visible word for the tone. Defaults to `Note`, `Success` or `Error`.
   *
   * It is real text on purpose. The tone is also carried by the bar colour and the
   * label colour, but neither of those survives greyscale or a forced-colors mode,
   * so colour is never the only signal (WCAG 1.4.1). Pass something more specific
   * when you have it — `"Payment failed"` beats `"Error"`.
   */
  readonly label?: ReactNode;

  /** See {@link InlineAlertLiveness}. Defaults to `"off"`. */
  readonly live?: InlineAlertLiveness;

  /**
   * Renders a dismiss button when provided.
   *
   * Dismissal is the caller's to implement, because the component does not own
   * whether the alert exists — unmounting it here would fight whatever state put it
   * on the page.
   */
  readonly onDismiss?: () => void;

  /**
   * Accessible name for the dismiss button. Defaults to `"Dismiss"`.
   *
   * Worth setting when more than one alert can be on screen, so the names stay
   * distinguishable out of context (WCAG 2.4.6) — a screen reader user tabbing
   * through three buttons all called "Dismiss" learns nothing from any of them.
   */
  readonly dismissLabel?: string;

  /**
   * Class for the live-region wrapper. `className` goes to the visible alert.
   *
   * The wrapper is unstyled and always present, so this is mostly for layout —
   * a `mt-*`, or a grid placement that should not move when the message clears.
   */
  readonly rootClassName?: string;
}

export type { IInlineAlertProps, InlineAlertLiveness };
