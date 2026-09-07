"use client";

import { type ReactElement } from "react";

import { toastRegionStyles } from "./styles";
import type { IToastRegionProps } from "./types";

/**
 * The container a `ToastAlert` has to live in.
 *
 * ```tsx
 * <ToastRegion label="Notifications">
 *   {toasts.map((toast) => (
 *     <ToastAlert key={toast.id} tone={toast.tone} onDismiss={() => remove(toast.id)}>
 *       {toast.message}
 *     </ToastAlert>
 *   ))}
 * </ToastRegion>
 * ```
 *
 *
 * WHY THIS IS A SEPARATE COMPONENT
 *
 * Because a toast cannot announce itself. A live region only reports changes that
 * happen *inside* it while assistive technology is already watching — mount the
 * region and its first message together and most engines have no previous state to
 * diff against, so they say nothing. A self-contained `<Toast>` that appears, gets
 * read out, and disappears is therefore not implementable: the thing that appears
 * cannot be the thing that is being watched.
 *
 * So the region is mounted once, near the root of the app, and stays there empty for
 * as long as there is nothing to say. Toasts are appended into it. That is the only
 * arrangement in which the announcement actually happens, and it is why this
 * component exists rather than being folded into `ToastAlert`.
 *
 *
 * WHY `aria-live` AND NOT `role="status"`
 *
 * `role="status"` looks like the obvious choice and is the wrong one here. It implies
 * `aria-atomic="true"`, which tells a screen reader to re-read the *entire* region
 * whenever any part of it changes — so a second toast makes it read the first one
 * again, and a third makes it read all three. With four toasts on screen, dismissing
 * one re-reads the other three.
 *
 * `aria-live` set directly leaves `aria-atomic` at its default of `false`, so only
 * the node that was added gets announced. `aria-relevant="additions"` then keeps
 * removals quiet, which matters because a toast being dismissed is not news.
 *
 * `role="region"` is still here, for a different reason: it makes the stack a
 * landmark, so a keyboard or screen reader user can navigate to it deliberately
 * rather than only hearing it in passing. A region is only exposed as a landmark when
 * it has an accessible name, which is why `label` is required.
 */
const ToastRegion = ({
  children,
  label,
  live = "polite",
  placement,
  className,
  ...props
}: IToastRegionProps): ReactElement => {
  return (
    <div
      {...props}
      role="region"
      aria-label={label}
      aria-live={live}
      /*
       * Both stated rather than left to the defaults. `aria-atomic="false"` is the
       * default for a bare `aria-live`, but writing it down is what stops someone
       * "tidying" this into `role="status"` and silently reintroducing the re-read.
       */
      aria-atomic="false"
      aria-relevant="additions"
      className={toastRegionStyles({ placement, class: className })}
    >
      {children}
    </div>
  );
};

export { ToastRegion };
