/*
 * The variant definition for `Drawer`, in its own module beside the component —
 * see the note in `actions/Button/styles.ts`. No `"use client"` here, so the
 * slot function stays callable from a server component; the directive lives on
 * `Drawer.tsx` alone.
 *
 * `drawerStyles` is a slot recipe on three elements: the native `<dialog>` (the
 * `dialog` slot), the scrollable `panel` inside it, and the `handle` that
 * resizes it. The `<dialog>` is the surface and the thing the browser puts in
 * the top layer; the panel holds the caller's content and owns the scroll.
 *
 * Every variant value here is an object keyed by slot (`{ dialog: ... }`). A
 * bare string or array on a slotted recipe goes to the implicit `base` slot,
 * which this recipe does not use, so it would be dropped without an error.
 *
 *
 * WHY A NATIVE <dialog>
 *
 * `showModal()` gives three things this component would otherwise have to build
 * and keep correct: the focus trap, the Escape-to-close, and top-layer stacking
 * that sits above every `z-index` on the page without this package inventing a
 * scale. The `::backdrop` pseudo-element is the scrim, and the theme already
 * wires `backdrop:bg-scrim-md` for exactly this. See `Drawer.tsx` for the parts
 * the element does *not* give for free (scroll lock, focus restore, animated
 * close).
 *
 *
 * THE ANIMATION, AND REDUCED MOTION
 *
 * The panel slides in from its edge. The resting state is `translate-x-0`; the
 * closed state (`data-state="closed"`, set by `Drawer.tsx` for the frame between
 * the close request and the element actually closing) translates it fully off
 * its edge — `-translate-x-full` on the left, `translate-x-full` on the right.
 * `transition-transform` animates between them, and the backdrop fades with
 * `transition-opacity`. Only `transform` is transitioned, so a resize drag
 * changes the width immediately instead of lagging behind the pointer.
 *
 * `motion-reduce:transition-none` drops both for a user who asked for less
 * motion (2.3.3): the drawer then appears and disappears without sliding,
 * rather than being denied entirely.
 */
import { tv, type VariantProps } from "../../../lib/tv";

/**
 * The starting width in px of each `size`.
 *
 * Kept in step by hand with the `w-[...]` classes in the `size` variant below,
 * because Tailwind only emits a class it can read as a literal string.
 * `Drawer.tsx` reads these for the resize bounds: a resizable drawer can be no
 * narrower than its starting width and no wider than that plus
 * {@link DRAWER_MAX_GROWTH} of it.
 */
const DRAWER_WIDTHS = { sm: 320, md: 400, lg: 560 } as const;

/**
 * How far a resizable drawer may grow beyond its starting width, as a fraction
 * of it. `0.5` lets a 400px drawer reach 600px.
 */
const DRAWER_MAX_GROWTH = 0.5;

const drawerStyles = tv({
  slots: {
    /*
     * The native `<dialog>`. It is the overlay surface and carries
     * `data-surface="overlay"`, which other components read — a `Card` inside a
     * drawer drops its shadow and keeps its border, because the drawer is
     * already the top surface.
     *
     * `fixed inset-y-0 h-dvh` pins it full height against one side. The height
     * has to be explicit: a `<dialog>` is `height: fit-content` by default, so
     * `inset-y-0` alone leaves it as tall as its content. `margin` is reset
     * because a `<dialog>` centres itself by default. `max-h-dvh` keeps it
     * inside the small viewport on mobile where the URL bar steals height.
     * `box-border` because the package ships no preflight, so the border would
     * otherwise add to the width.
     *
     * Sizing is the caller's requirement: `min-w-[200px]` floors it, `max-w-[50vw]`
     * caps it at half the viewport, and `w-*` per size sits between the two. The
     * `max` wins over a `w-*` that would exceed it, so a wide size on a narrow
     * screen still stops at half. A dragged width is an inline `width`, which
     * those same floor and cap still bound.
     *
     * The scrim is the `::backdrop`. `backdrop:transition-opacity` fades it with
     * the panel.
     */
    dialog: [
      "group/drawer fixed inset-y-0 z-50 m-0 box-border h-dvh p-0",
      "flex max-h-dvh min-w-[200px] max-w-[50vw] flex-col",
      "overflow-hidden bg-surface-overlay text-foreground shadow-modal",
      "transition-transform duration-200 ease-out motion-reduce:transition-none",
      "data-[resizing=true]:select-none",
      "backdrop:bg-scrim-md backdrop:transition-opacity backdrop:duration-200",
      "backdrop:motion-reduce:transition-none",
      "data-[state=closed]:backdrop:opacity-0",
      "focus-visible:outline-none",
    ],
    /*
     * The scrollable content region. The scroll lives here, not on the
     * `<dialog>`, so the surface stays put while the content moves and a sticky
     * header a caller adds has something to stick to. `overscroll-contain`
     * stops a scroll chaining out to the page behind once the panel hits its
     * end.
     *
     * `box-border` and `min-w-0`: the package ships no preflight, so elements
     * are `content-box` by default and a `w-full` panel with padding would be
     * wider than the dialog by the padding. `Card` does the same. `min-w-0`
     * lets a flex child shrink below its content width instead of forcing the
     * panel wider.
     */
    panel: [
      "box-border flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain",
      "p-(--space-4)",
    ],
    /*
     * The resize handle, a strip on the drawer's inner edge. It sits inside the
     * dialog because the dialog clips its overflow, so a handle straddling the
     * border would be cut in half. `touch-none` stops a touch drag scrolling
     * the page instead of resizing. Transparent at rest, so the drawer's own
     * border is the visible edge, and filled with the accent on hover and while
     * dragging.
     *
     * The focus outline is drawn inward (`-outline-offset-2`) rather than with
     * the shared 2px outward offset: the dialog's `overflow-hidden` would clip
     * an outline outside this strip. It is still a 2px `outline`, so it
     * survives forced-colors mode.
     */
    handle: [
      "absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none",
      "bg-transparent hover:bg-accent/50 data-[resizing=true]:bg-accent",
      "transition-colors motion-reduce:transition-none",
      "-outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
    ],
  },
  variants: {
    /*
     * Which edge the drawer is anchored to, and therefore which direction it
     * slides from. `start`/`end` rather than `left`/`right` so the drawer
     * follows writing direction — `end` is the right in LTR and the left in RTL —
     * using logical `inset`/`border` properties and RTL-aware translate.
     *
     * The opposite inset is set to `auto` because a `<dialog>` has both
     * `inset-inline-start` and `inset-inline-end` at 0 by default. Setting only
     * one leaves the box over-constrained, and in LTR the start inset wins.
     *
     * The handle goes on the inner edge: the `start` side of an `end` drawer.
     */
    side: {
      start: {
        dialog: [
          "start-0 end-auto border-e border-border-strong",
          "rounded-e-control",
          "data-[state=closed]:-translate-x-full rtl:data-[state=closed]:translate-x-full",
        ],
        handle: "end-0",
      },
      end: {
        dialog: [
          "end-0 start-auto border-s border-border-strong",
          "rounded-s-control",
          "data-[state=closed]:translate-x-full rtl:data-[state=closed]:-translate-x-full",
        ],
        handle: "start-0",
      },
    },
    /*
     * The starting width, floored at 200px and capped at 50vw by the `dialog`
     * slot regardless of which size is chosen. When the drawer is `resizable`
     * this is also the narrowest it can be dragged to, and it can grow by half
     * of it. See `DRAWER_WIDTHS`.
     */
    size: {
      sm: { dialog: "w-[320px]" },
      md: { dialog: "w-[400px]" },
      lg: { dialog: "w-[560px]" },
    },
  },
  defaultVariants: {
    side: "end",
    size: "md",
  },
});

export { DRAWER_MAX_GROWTH, DRAWER_WIDTHS, drawerStyles };
export type DrawerVariants = VariantProps<typeof drawerStyles>;
