import type { ComponentPropsWithRef, ReactNode } from "react";

import type { ToastAlertVariants, ToastRegionVariants } from "./styles";

interface IToastRegionProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, ToastRegionVariants {
  /** The toasts. Usually a `.map()` over whatever state owns them. */
  readonly children?: ReactNode;

  /**
   * Accessible name for the region. Required, deliberately.
   *
   * `role="region"` is only exposed as a landmark when it has a name, so an unnamed
   * one is a container a screen reader user cannot navigate to and cannot identify
   * when they land in it (WCAG 1.3.1, 2.4.6). Making it a required prop means the
   * type checker catches the omission rather than an audit catching it later — the
   * same call `Input` makes about `label` and `Table` about `caption`.
   *
   * `"Notifications"` is the usual answer.
   */
  readonly label: string;

  /**
   * How urgently additions are announced. Defaults to `"polite"`.
   *
   * `"polite"` waits for a pause, which is what almost every toast wants.
   * `"assertive"` interrupts, and is only right when the message is about something
   * the user must deal with before continuing — at which point a toast that can
   * scroll off screen is probably the wrong component and `BrowserAlert` is the
   * right one.
   */
  readonly live?: "polite" | "assertive";
}

interface IToastAlertProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, ToastAlertVariants {
  /** The message. */
  readonly children?: ReactNode;

  /**
   * The visible word for the tone. Defaults to `Note`, `Success` or `Error`.
   *
   * Real text, so the tone survives greyscale and forced-colors mode where the bar
   * does not (WCAG 1.4.1). Something specific beats the default: `"Upload complete"`
   * tells the user more than `"Success"`.
   */
  readonly label?: ReactNode;

  /**
   * Renders a dismiss button when provided.
   *
   * Also the handler the auto-dismiss timer calls, so a toast with a `duration` and
   * no `onDismiss` never goes away — there is nothing for the timer to invoke.
   */
  readonly onDismiss?: () => void;

  /**
   * Accessible name for the dismiss button. Defaults to `"Dismiss"`.
   *
   * Worth setting per toast when several can be on screen: three buttons all called
   * "Dismiss" tell a screen reader user nothing about which is which out of context
   * (WCAG 2.4.6).
   */
  readonly dismissLabel?: string;

  /**
   * Milliseconds before the toast dismisses itself. Omit it — the default — and it
   * never does.
   *
   * Off by default because a self-dismissing message is a time limit on reading it,
   * which is what WCAG 2.2.1 (Timing Adjustable, A) is about. Nothing here can know
   * how long the user needs, and the safe default is not to guess.
   *
   * When you do set it, the timer pauses while the pointer is over the toast and
   * while focus is anywhere inside it, so a user who is reading or tabbing does not
   * lose the message mid-sentence. That covers 2.2.1's "extend" allowance for a
   * pointer or keyboard user. It cannot cover a touch user, who has no hover — one
   * more reason errors should keep the default and stay until dismissed.
   */
  readonly duration?: number | null;
}

export type { IToastAlertProps, IToastRegionProps };
