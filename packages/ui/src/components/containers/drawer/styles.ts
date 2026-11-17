/*
 * The variant definition for `Drawer`, in its own module beside the component —
 * see the note in `actions/Button/styles.ts`. No `"use client"` here, so the
 * slot function stays callable from a server component; the directive lives on
 * `Drawer.tsx` alone.
 *
 * `drawerStyles` is a slot recipe on two elements: the native `<dialog>` (the
 * `dialog` slot) and the scrollable `panel` inside it. The `<dialog>` is the
 * surface and the thing the browser puts in the top layer; the panel holds the
 * caller's content and owns the scroll.
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
 * `transition-opacity`.
 *
 * `motion-reduce:transition-none` drops both for a user who asked for less
 * motion (2.3.3): the drawer then appears and disappears without sliding,
 * rather than being denied entirely.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const drawerStyles = tv({
  slots: {
    /*
     * The native `<dialog>`. It is the overlay surface and carries
     * `data-surface="overlay"`, which other components read — a `Card` inside a
     * drawer drops its shadow and keeps its border, because the drawer is
     * already the top surface.
     *
     * `fixed inset-y-0` pins it full height against one side; `margin` is reset
     * because a `<dialog>` centres itself by default. `max-h-dvh` keeps it
     * inside the small viewport on mobile where the URL bar steals height.
     *
     * Sizing is the caller's requirement: `min-w-[200px]` floors it, `max-w-[50vw]`
     * caps it at half the viewport, and `w-*` per size sits between the two. The
     * `max` wins over a `w-*` that would exceed it, so a wide size on a narrow
     * screen still stops at half.
     *
     * The scrim is the `::backdrop`. `backdrop:transition-opacity` fades it with
     * the panel.
     */
    dialog: [
      "group/drawer fixed inset-y-0 z-50 m-0 p-0",
      "flex max-h-dvh min-w-[200px] max-w-[50vw] flex-col",
      "overflow-hidden bg-surface-overlay text-foreground shadow-modal",
      "transition-transform duration-200 ease-out motion-reduce:transition-none",
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
     */
    panel: [
      "flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain",
      "p-(--space-4)",
    ],
  },
  variants: {
    /*
     * Which edge the drawer is anchored to, and therefore which direction it
     * slides from. `start`/`end` rather than `left`/`right` so the drawer
     * follows writing direction — `end` is the right in LTR and the left in RTL —
     * using logical `inset`/`border` properties and RTL-aware translate.
     */
    side: {
      start: [
        "start-0 border-e border-border-strong",
        "rounded-e-control",
        "data-[state=closed]:-translate-x-full rtl:data-[state=closed]:translate-x-full",
      ],
      end: [
        "end-0 border-s border-border-strong",
        "rounded-s-control",
        "data-[state=closed]:translate-x-full rtl:data-[state=closed]:-translate-x-full",
      ],
    },
    /*
     * The resting width, floored at 200px and capped at 50vw by the `dialog`
     * slot regardless of which size is chosen.
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

export { drawerStyles };
export type DrawerVariants = VariantProps<typeof drawerStyles>;
