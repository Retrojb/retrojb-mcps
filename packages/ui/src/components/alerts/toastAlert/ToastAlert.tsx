"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

import { ALERT_TONE_LABELS } from "../tone";
import { toastAlertStyles } from "./styles";
import type { IToastAlertProps } from "./types";

/**
 * One message inside a {@link ToastRegion}.
 *
 * ```tsx
 * <ToastAlert tone="success" onDismiss={remove}>Draft saved.</ToastAlert>
 * ```
 *
 * It must be rendered inside a `ToastRegion`. Outside one it still draws correctly and
 * announces nothing at all, because the live region is the region's job — see the note
 * in `ToastRegion.tsx` for why it cannot be this component's.
 *
 * Note what is *not* here: no `role`. A `role="alert"` or `role="status"` on the toast
 * itself would make it a live region nested inside the region's live region, and
 * engines that honour both announce the message twice. The container announces;
 * the item is just content.
 */
const ToastAlert = ({
  children,
  tone = "info",
  label,
  onDismiss,
  dismissLabel = "Dismiss",
  duration,
  className,
  ...props
}: IToastAlertProps): ReactElement => {
  const slots = toastAlertStyles({ tone });

  /*
   * Paused while the pointer is over the toast or focus is inside it.
   *
   * Pointer events rather than mouse events so a pen behaves like a cursor, and React's
   * `onFocus`/`onBlur` rather than the DOM's, because React's are delegated from
   * `focusin`/`focusout` and therefore bubble — which is what lets a listener up here
   * notice focus landing on the dismiss button inside.
   */
  const [paused, setPaused] = useState(false);

  /*
   * Time left, kept in a ref so pausing does not restart the countdown.
   *
   * The timer effect below re-runs whenever `paused` flips. If the remaining time lived
   * in state or were recomputed from `duration`, every pause would hand the user a
   * fresh full duration and a toast could be kept alive indefinitely by a cursor
   * resting nearby. Decrementing on cleanup means a pause resumes where it stopped.
   */
  const remainingRef = useRef<number>(duration ?? 0);
  const startedAtRef = useRef<number>(0);

  // A new `duration` is a new countdown. Declared before the timer effect so the reset
  // lands before the timer reads it, since effects run in source order.
  useEffect(() => {
    remainingRef.current = duration ?? 0;
  }, [duration]);

  useEffect(() => {
    // `== null` covers both `undefined` (prop omitted) and an explicit `null`, which is
    // the documented way to say "never dismiss itself".
    if (duration == null || onDismiss === undefined || paused) return;
    if (remainingRef.current <= 0) return;

    startedAtRef.current = Date.now();
    const timer = window.setTimeout(onDismiss, remainingRef.current);

    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAtRef.current),
      );
    };
  }, [duration, onDismiss, paused]);

  return (
    <div
      {...props}
      className={slots.box({ class: className })}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={slots.content()}>
        <p className={slots.label()}>{label ?? ALERT_TONE_LABELS[tone]}</p>
        <div className={slots.message()}>{children}</div>
      </div>

      {onDismiss === undefined ? null : (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className={slots.dismiss()}
        >
          {/*
           * Decorative. `aria-label` above is the button's accessible name (WCAG
           * 4.1.2) — leaving the glyph exposed would have it announced as
           * "multiplication sign" alongside that name.
           */}
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
};

export { ToastAlert };
