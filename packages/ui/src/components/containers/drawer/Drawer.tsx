"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type SyntheticEvent,
} from "react";

import { useControllableState } from "../../../hooks/useControllableState";
import { DRAWER_MAX_GROWTH, DRAWER_WIDTHS, drawerStyles } from "./styles";
import type { IDrawerProps } from "./types";

/** How far one arrow-key press moves the resize handle, in px. */
const RESIZE_KEY_STEP = 16;

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
 *
 *
 * RESIZING
 *
 * With `resizable`, a handle on the inner edge drags the drawer wider. `size`
 * is the starting width and the minimum, and the drawer can grow by half of it
 * (`DRAWER_MAX_GROWTH`), so a `md` drawer runs from 400px to 600px. The handle
 * is a `role="separator"` that is also focusable, because a drag alone would
 * leave keyboard users without the feature (2.1.1, 2.5.7): Left and Right move
 * it, Home and End jump to the ends. The width is controllable with `width` /
 * `onWidthChange`, so a caller can persist it.
 */
const Drawer = ({
  open,
  defaultOpen = false,
  onOpenChange,
  dismissOnBackdropClick = true,
  resizable = false,
  width,
  onWidthChange,
  resizeLabel = "Resize drawer",
  side,
  size,
  title,
  children,
  className,
  panelClassName,
  style,
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
      else if (ref != null)
        (ref as { current: HTMLDialogElement | null }).current = node;
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
    return () => dialog.removeEventListener("transitionend", onTransitionEnd);
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

  /*
   * Resize bounds. `size` is the starting width and the minimum; the maximum is
   * that plus `DRAWER_MAX_GROWTH` of it. `size` and `side` fall back to the
   * `defaultVariants` in `styles.ts` ("md", "end"); keep them in step.
   */
  const baseWidth = DRAWER_WIDTHS[size ?? "md"];
  const minWidth = baseWidth;
  const maxWidth = baseWidth * (1 + DRAWER_MAX_GROWTH);

  /*
   * `null` means "not resized": the width is then whatever the `size` class
   * says, and no inline width is written, so changing `size` still works. The
   * controlled `width` prop and `onWidthChange` go through the same hook as
   * `open`, so uncontrolled and controlled are one code path.
   */
  const [storedWidth, setStoredWidth] = useControllableState<number | null>({
    value: width,
    defaultValue: null,
    onChange: (next) => {
      if (next !== null) onWidthChange?.(next);
    },
  });
  const currentWidth =
    storedWidth === null
      ? baseWidth
      : Math.min(maxWidth, Math.max(minWidth, storedWidth));

  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ anchor: number; handleOnLeft: boolean } | null>(
    null,
  );

  /*
   * Which physical side the handle is on. The handle is on the inner edge: the
   * left of an `end` drawer in LTR, and the right of it in RTL, so the two
   * flags cancel when exactly one of them is set. Read at event time because
   * the direction is a computed style, not a prop.
   */
  const isHandleOnLeft = (dialog: HTMLDialogElement): boolean =>
    ((side ?? "end") === "end") !==
    (window.getComputedStyle(dialog).direction === "rtl");

  /*
   * Apply a width, held to the bounds and to half the viewport. The viewport
   * limit is the CSS `max-w-[50vw]` cap; applying it here too stops the state
   * running ahead of what is on screen, so a drag past the cap does not need to
   * come back before the drawer moves.
   */
  const commitWidth = (raw: number): void => {
    const cap = Math.max(minWidth, Math.min(maxWidth, window.innerWidth / 2));
    const next = Math.round(Math.min(cap, Math.max(minWidth, raw)));
    if (next !== currentWidth) setStoredWidth(next);
  };

  /*
   * Pointer capture sends every later move and the release to the handle even
   * when the pointer leaves it, so no document-level listeners are needed. The
   * far edge of the drawer does not move while dragging, so it is read once, on
   * press, as the anchor the new width is measured from.
   */
  const handleResizeStart = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    const dialog = dialogRef.current;
    if (dialog === null) return;

    const rect = dialog.getBoundingClientRect();
    const handleOnLeft = isHandleOnLeft(dialog);
    dragRef.current = {
      anchor: handleOnLeft ? rect.right : rect.left,
      handleOnLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
  };

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (drag === null) return;
    commitWidth(
      drag.handleOnLeft
        ? drag.anchor - event.clientX
        : event.clientX - drag.anchor,
    );
  };

  const handleResizeEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (dragRef.current === null) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizing(false);
  };

  /*
   * The keyboard path, which is what makes the drag optional (2.5.7). An arrow
   * moves the handle's edge in its own direction, so Left widens a drawer whose
   * handle is on the left and narrows one whose handle is on the right. Home and
   * End are the minimum and maximum, as for any separator.
   */
  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const handleOnLeft = isHandleOnLeft(dialog);

    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next =
          currentWidth + (handleOnLeft ? RESIZE_KEY_STEP : -RESIZE_KEY_STEP);
        break;
      case "ArrowRight":
        next =
          currentWidth + (handleOnLeft ? -RESIZE_KEY_STEP : RESIZE_KEY_STEP);
        break;
      case "Home":
        next = minWidth;
        break;
      case "End":
        next = maxWidth;
        break;
      default:
        return;
    }
    event.preventDefault();
    commitWidth(next);
  };

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
      data-resizing={resizing}
      style={storedWidth === null ? style : { ...style, width: currentWidth }}
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
      {resizable ? (
        // After the panel in the DOM so the caller's controls come first in tab
        // order and `showModal()` focuses them, not the handle. It is
        // absolutely positioned, so the order does not show.
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={resizeLabel}
          aria-valuenow={currentWidth}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          tabIndex={0}
          data-resizing={resizing}
          className={slots.handle()}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onKeyDown={handleResizeKeyDown}
        />
      ) : null}
    </dialog>
  );
};

export { Drawer };
