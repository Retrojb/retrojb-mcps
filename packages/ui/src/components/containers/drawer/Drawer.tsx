"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type SyntheticEvent,
} from "react";

import { useControllableState } from "../../../hooks/useControllableState";
import { drawerStyles } from "./styles";
import type { IDrawerProps } from "./types";

/**
 * A panel that slides in from the start or end edge of the viewport, over a
 * scrim, built on the native `<dialog>` element.
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <Drawer open={open} onOpenChange={setOpen} title="Filters" side="end">
 *   <FilterForm />
 * </Drawer>
 * ```
 *
 * Give it an accessible name with either `title` (a visible heading, preferred)
 * or `aria-label` (when there is no room for one), never both. Drive it with the
 * controlled pair `open` / `onOpenChange`, or leave both off and pass
 * `defaultOpen` to let it own the state. `onOpenChange(false)` fires on every
 * close path — Escape, a backdrop click, or your own close control.
 *
 *
 * BUILT ON THE PLATFORM DIALOG, DELIBERATELY
 *
 * Opened with `showModal()`, as `BrowserAlert` is, and for the same reasons: the
 * browser gives the focus trap, the inert background, Escape-to-close (2.1.2),
 * focus restoration on close, the top layer, and a `::backdrop` to style — none
 * of which is code here. See `styles.ts` for the styling side of that split.
 *
 *
 * WHAT THE ELEMENT DOES NOT GIVE, AND IS HERE
 *
 *   - Scroll lock. `showModal()` makes the background inert but still lets it
 *     scroll behind the drawer. `overflow: hidden` on the document element while
 *     open stops that, and is restored to whatever it was on close.
 *   - An animated close. `dialog.close()` removes the element from the top layer
 *     in the same frame, so a CSS exit transition never runs. Instead the close
 *     request sets `data-state="closed"` (which `styles.ts` translates the panel
 *     off its edge and fades the backdrop), and `.close()` is deferred until that
 *     transition ends — or run immediately when the user prefers reduced motion,
 *     since there is no transition to wait for.
 *
 * The native `close` event is the single source of truth: Escape, a backdrop
 * click and a programmatic close all end there, and that is the one place
 * `onOpenChange(false)` is called.
 */
const Drawer = ({
  open,
  defaultOpen = false,
  onOpenChange,
  dismissOnBackdropClick = true,
  side,
  size,
  title,
  children,
  className,
  panelClassName,
  ref,
  ...props
}: IDrawerProps): ReactElement => {
  const slots = drawerStyles({ side, size });

  const dialogRef = useRef<HTMLDialogElement>(null);

  /*
   * The open state goes through `useControllableState` so an uncontrolled
   * caller (just `defaultOpen`) and a controlled one (`open` + `onOpenChange`)
   * are the same code path. `onOpenChange` fires in both modes — an uncontrolled
   * drawer is still worth observing — and `setOpen(false)` is the single exit
   * the native `close` handler calls.
   */
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const generatedId = useId();
  const titleId = `${generatedId}-title`;

  /*
   * Merge the caller's ref with the internal one: the component needs the node
   * to call `showModal()` / `close()`, and the caller may want it too.
   */
  const setDialogRef = useCallback(
    (node: HTMLDialogElement | null): void => {
      dialogRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref != null) (ref as { current: HTMLDialogElement | null }).current = node;
    },
    [ref],
  );

  /*
   * Open on the frame `isOpen` becomes true. `showModal()` is guarded by
   * `dialog.open` so the `close`-event round trip (close → setOpen(false) →
   * effect) cannot re-enter it. Opening resets `data-state` to "open" in case a
   * previous close left it "closed".
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (isOpen && !dialog.open) {
      dialog.dataset.state = "open";
      dialog.showModal();
    }
  }, [isOpen]);

  /*
   * Close with an exit animation. When `isOpen` goes false while the element is
   * still open, flip `data-state` to "closed" to start the slide-out, then call
   * `.close()` once the panel's transform transition ends. Under reduced motion
   * there is no transition, so close in the next frame instead of waiting for a
   * `transitionend` that never fires.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || isOpen || !dialog.open) return;

    dialog.dataset.state = "closed";

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      const frame = window.requestAnimationFrame(() => dialog.close());
      return () => window.cancelAnimationFrame(frame);
    }

    /*
     * `transitionend` fires once per animated property; `propertyName` filters
     * it to the panel's transform so the backdrop's opacity transition does not
     * close early. `target === dialog` ignores transitions bubbling from the
     * content inside.
     */
    const onTransitionEnd = (event: TransitionEvent): void => {
      if (event.target === dialog && event.propertyName === "transform") {
        dialog.close();
      }
    };
    dialog.addEventListener("transitionend", onTransitionEnd);
    return () =>
      dialog.removeEventListener("transitionend", onTransitionEnd);
  }, [isOpen]);

  /*
   * The one place a close is reported. The platform fires `close` for Escape and
   * for the `.close()` calls above alike, so routing every exit through it keeps
   * React's state in step with the element whatever closed it. Guarded against
   * the state already being false so Escape (which does not pass through the
   * animation effect) still reports exactly once.
   */
  const handleClose = useCallback((): void => {
    if (isOpen) setOpen(false);
  }, [isOpen, setOpen]);

  /*
   * A click on the backdrop lands on the `<dialog>` itself, because the panel
   * fills the element and stops clicks inside it from reaching here. Compare the
   * pointer to the element's own box rather than trusting `event.target`, since
   * a click on the panel's padding is still a click on a child.
   */
  const handleClick = useCallback(
    (event: SyntheticEvent<HTMLDialogElement, MouseEvent>): void => {
      if (!dismissOnBackdropClick) return;
      const dialog = dialogRef.current;
      if (dialog === null || event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const { clientX, clientY } = event.nativeEvent;
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      if (!inside) setOpen(false);
    },
    [dismissOnBackdropClick, setOpen],
  );

  /*
   * Scroll lock. `showModal()` makes the background inert but leaves it
   * scrollable, so a wheel or trackpad gesture over the scrim still moves the
   * page. Pin the document while open and restore the previous inline value on
   * close, so a caller that set its own `overflow` gets it back.
   */
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const { documentElement } = document;
    const previous = documentElement.style.overflow;
    documentElement.style.overflow = "hidden";
    return () => {
      documentElement.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <dialog
      {...props}
      ref={setDialogRef}
      aria-labelledby={title == null ? undefined : titleId}
      // The drawer is the top surface: `data-surface="overlay"` is what a `Card`
      // or `SearchBox` inside it reads to drop its own shadow. `styles.ts`
      // documents the dialog slot as carrying it.
      data-surface="overlay"
      data-state="closed"
      className={slots.dialog({ class: className })}
      onClose={handleClose}
      onCancel={handleClose}
      onClick={handleClick}
    >
      <div className={slots.panel({ class: panelClassName })}>
        {title == null ? null : (
          // An `<h2>`, not a styled paragraph: the drawer's headline is a real
          // heading, so it shows in a screen reader's heading list and the
          // document outline (1.3.1). `<h2>` because the page behind keeps its
          // `<h1>`. Same choice as `BrowserAlert`.
          <h2 id={titleId} className="text-heading-sm mb-(--space-3)">
            {title}
          </h2>
        )}
        {children}
      </div>
    </dialog>
  );
};

export { Drawer };
