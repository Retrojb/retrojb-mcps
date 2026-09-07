"use client";

import { type ReactElement } from "react";

import { ALERT_TONE_LABELS } from "../tone";
import { inlineAlertStyles } from "./styles";
import type { IInlineAlertProps, InlineAlertLiveness } from "./types";

/**
 * `role` carries the liveness, and nothing else does.
 *
 * `role="alert"` already implies `aria-live="assertive"` and `aria-atomic="true"`;
 * `role="status"` implies `polite` and `atomic`. Setting both the role and a
 * matching `aria-live` is the common version of this and it is redundant at best —
 * where the two disagree, engines split on which wins, so there is only one of them
 * here.
 */
const LIVE_ROLES = {
  off: undefined,
  polite: "status",
  assertive: "alert",
} as const satisfies Record<InlineAlertLiveness, string | undefined>;

/**
 * An alert that sits in the page flow, beside the thing it is about.
 *
 * ```tsx
 * <InlineAlert tone="danger" live="assertive" label="Payment failed">
 *   The card was declined. Try another card or contact your bank.
 * </InlineAlert>
 * ```
 *
 *
 * WHY THE WRAPPER IS ALWAYS RENDERED
 *
 * This is the part that makes the component worth having over a styled `<div>`.
 *
 * A screen reader announces changes *inside* a live region it is already watching.
 * Mount the region and its text in the same commit — which is what
 * `{error && <Alert>{error}</Alert>}` does — and the region is new, so most engines
 * have nothing to compare against and say nothing at all. It is the single most
 * common way an "accessible" alert fails to be one, and it fails silently: the
 * markup looks right, `role="alert"` is present, and no announcement happens.
 *
 * So the live region is a separate element from the visible box, and it stays
 * mounted whether or not there is a message. Render the component unconditionally
 * and let `children` be the thing that changes:
 *
 * ```tsx
 * // Announces. The region was already there when the text arrived.
 * <InlineAlert tone="danger" live="assertive">{error}</InlineAlert>
 *
 * // Often silent. The region and the text arrive together.
 * {error ? <InlineAlert tone="danger" live="assertive">{error}</InlineAlert> : null}
 * ```
 *
 * With no `children` the component renders an empty, invisible wrapper — no box, no
 * border, no padding — so keeping it mounted costs nothing visually.
 *
 * None of this applies when `live="off"`, which is the default and is right for a
 * notice that was already on the page. There is no announcement to get wrong.
 */
const InlineAlert = ({
  children,
  tone = "info",
  size,
  label,
  live = "off",
  onDismiss,
  dismissLabel = "Dismiss",
  className,
  rootClassName,
  ...props
}: IInlineAlertProps): ReactElement => {
  const slots = inlineAlertStyles({ tone, size });

  /*
   * `!= null` rather than a truthiness test, so a message of `0` still renders.
   * `false` is excluded on purpose: `{flag && "text"}` collapses to `false`, and
   * treating that as content would draw an empty box.
   */
  const hasMessage = children != null && children !== false;

  return (
    <div
      role={LIVE_ROLES[live]}
      className={slots.root({ class: rootClassName })}
    >
      {hasMessage ? (
        <div {...props} className={slots.box({ class: className })}>
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
               * The glyph is decorative — `aria-label` above is the button's
               * accessible name (WCAG 4.1.2). Announcing "multiplication sign"
               * alongside it is what leaving this exposed would do.
               */}
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export { InlineAlert };
