"use client";

import { useEffect, useId, useRef, type ReactElement } from "react";

import { Button } from "../../interactions/Button";
import { ALERT_TONE_LABELS } from "../tone";
import { browserAlertStyles } from "./styles";
import type { IBrowserAlertProps } from "./types";

/**
 * A modal alert dialog — the replacement for `window.alert()` and
 * `window.confirm()`.
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <BrowserAlert
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   tone="danger"
 *   title="Delete workspace?"
 *   confirmLabel="Delete"
 *   onConfirm={deleteWorkspace}
 *   cancelLabel="Keep it"
 * >
 *   Every project and invoice in it goes too. This cannot be undone.
 * </BrowserAlert>
 * ```
 *
 *
 * BUILT ON THE PLATFORM DIALOG, DELIBERATELY
 *
 * This renders a real `<dialog>` and opens it with `showModal()`, which is a decision
 * worth stating because the alternative — a positioned `<div>` with `aria-modal` — is
 * the more common one and is much harder to get right. `showModal()` gives, from the
 * browser:
 *
 *   - a focus trap, with no `keydown` handler to write and no sentinel nodes;
 *   - the rest of the document made inert, so nothing behind the dialog is clickable
 *     or reachable by Tab, and screen reader virtual cursors stay inside;
 *   - Escape to close (WCAG 2.1.2 — a modal with no keyboard exit is a trap);
 *   - focus restored to whatever was focused before, on close;
 *   - the top layer, so it cannot be clipped by an ancestor's `overflow` or lose a
 *     `z-index` fight;
 *   - a `::backdrop` to style.
 *
 * Every one of those is a bug in most hand-rolled modals, and none of them is code
 * here.
 *
 *
 * `role="alertdialog"` RATHER THAN THE IMPLICIT `dialog`
 *
 * `alertdialog` tells assistive technology this interrupts for something that needs a
 * response, and prompts it to announce the description immediately rather than waiting
 * to be explored. It comes with a requirement: an `alertdialog` must contain at least
 * one focusable control, which is why the confirm button always renders even in
 * acknowledge-only mode.
 *
 * Use it for what its name says. A dialog that is merely *modal* — a form, a picker —
 * should be `role="dialog"`, and this is the wrong component for it.
 */
const BrowserAlert = ({
  open,
  onClose,
  title,
  children,
  tone = "info",
  label,
  confirmLabel = "OK",
  onConfirm,
  cancelLabel,
  onCancel,
  className,
  boxClassName,
  ...props
}: IBrowserAlertProps): ReactElement => {
  const slots = browserAlertStyles({ tone });

  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  /*
   * `useId` rather than hand-written ids, so the `aria-labelledby` and
   * `aria-describedby` wiring survives a second dialog on the same page and matches
   * between the server and client render.
   */
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;

  const isConfirmation = cancelLabel !== undefined || onCancel !== undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    /*
     * Guarded both ways, because `close()` fires a `close` event, which calls
     * `onClose`, which flips `open`, which re-runs this effect. Without the checks the
     * two would take turns calling each other.
     */
    if (open && !dialog.open) {
      dialog.showModal();

      /*
       * Focus the dismissive action when there is one.
       *
       * `showModal()` focuses the first focusable descendant, which here is the
       * cancel button only because of the order they are rendered in — and relying on
       * DOM order for something this consequential is how a confirm dialog ends up
       * with "Delete" pre-focused and one Enter keypress away. Naming the target makes
       * it explicit: for a confirmation the safe default is the way out, and for an
       * acknowledgement there is only one button anyway.
       */
      (cancelRef.current ?? confirmRef.current)?.focus();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      {...props}
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={`${labelId} ${titleId}`}
      aria-describedby={children == null ? undefined : descriptionId}
      className={slots.shell({ class: className })}
      /*
       * The platform closes the dialog on Escape by itself and reports it through
       * `close`. Listening here is what keeps React's `open` in step with the element's
       * real state, and it covers every route out — Escape, either button, or a
       * programmatic `close()` — with one handler.
       */
      onClose={onClose}
    >
      <div className={slots.box({ class: boxClassName })}>
        <p className={slots.label()} id={labelId}>
          {label ?? ALERT_TONE_LABELS[tone]}
        </p>

        {/*
         * An `<h2>`, not a styled paragraph. The dialog's headline is a heading, and
         * making it one means it shows up in a screen reader's heading list and in the
         * document outline (WCAG 1.3.1). `<h2>` rather than `<h1>` because the page
         * behind still owns its `<h1>`.
         */}
        <h2 className={slots.title()} id={titleId}>
          {title}
        </h2>

        {children == null ? null : (
          <div className={slots.message()} id={descriptionId}>
            {children}
          </div>
        )}

        <div className={slots.actions()}>
          {/*
           * Cancel first in the DOM so it comes first in the tab order, which puts the
           * non-destructive option in the user's path before the destructive one.
           */}
          {isConfirmation ? (
            <Button
              ref={cancelRef}
              intent="secondary"
              text={cancelLabel ?? "Cancel"}
              onClick={onCancel ?? onClose}
            />
          ) : null}

          <Button
            ref={confirmRef}
            // A destructive confirmation gets the danger fill, so the button that does
            // the irreversible thing looks like it.
            intent={tone === "danger" ? "danger" : "primary"}
            text={confirmLabel}
            onClick={onConfirm ?? onClose}
          />
        </div>
      </div>
    </dialog>
  );
};

export { BrowserAlert };
