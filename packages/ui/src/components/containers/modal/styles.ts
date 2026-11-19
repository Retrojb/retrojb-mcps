/*
 * The variant definition for `Modal`, in its own module beside the component —
 * see the note in `actions/Button/styles.ts`. No `"use client"` here, so the
 * slot function stays callable from a server component; the directive lives on
 * `Modal.tsx` alone.
 *
 * `modalStyles` is a slot recipe on two elements: the native `<dialog>` (the
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
 * wires `backdrop:bg-scrim-md` for exactly this. `Drawer` and `BrowserAlert`
 * are built the same way, for the same reasons. See `Modal.tsx` for the parts
 * the element does *not* give for free (scroll lock, focus restore, animated
 * close).
 *
 *
 * CENTERED, NOT EDGE-ANCHORED
 *
 * A `<dialog>` opened with `showModal()` centers itself in the viewport by the
 * user-agent `margin: auto`, which `m-auto` keeps. This is the one difference
 * from `Drawer`, which pins itself to an edge: a modal for a short form reads as
 * a card floating over the dimmed page, so it sits in the middle and is sized by
 * a `max-width` rather than a fixed edge width.
 *
 *
 * THE ANIMATION, AND REDUCED MOTION
 *
 * The panel scales up from 96% and fades in. The resting state is
 * `scale-100 opacity-100`; the closed state (`data-state="closed"`, set by
 * `Modal.tsx` for the frame between the close request and the element actually
 * closing) drops it to `scale-95 opacity-0`. `transition` animates between them,
 * and the backdrop fades with `backdrop:transition-opacity`.
 *
 * `motion-reduce:transition-none` drops both for a user who asked for less
 * motion (2.3.3): the modal then appears and disappears without the scale and
 * fade, rather than being denied entirely.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const modalStyles = tv({
  slots: {
    /*
     * The native `<dialog>`. It is the overlay surface and carries
     * `data-surface="overlay"` (set in `Modal.tsx`), which other components
     * read — a `Card` inside a modal drops its shadow and keeps its border,
     * because the modal is already the top surface.
     *
     * `m-auto` keeps the user-agent centering of a modal `<dialog>`.
     * `w-[calc(100%-2rem)]` rather than `w-full` so the modal never touches the
     * viewport edges on a narrow screen, which also keeps it clear of the
     * rounded corners and safe areas on a phone; the per-size `max-w-*` caps the
     * width on a wide one. `max-h-[calc(100dvh-2rem)]` keeps it inside the small
     * viewport on mobile where the URL bar steals height.
     *
     * The scrim is the `::backdrop`. `backdrop:transition-opacity` fades it with
     * the panel.
     */
    dialog: [
      "group/modal m-auto box-border w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] p-0",
      "flex flex-col overflow-hidden",
      "rounded-control border border-border-strong",
      "bg-surface-overlay text-foreground shadow-modal",
      "transition duration-200 ease-out motion-reduce:transition-none",
      "data-[state=closed]:scale-95 data-[state=closed]:opacity-0",
      "backdrop:bg-scrim-md backdrop:transition-opacity backdrop:duration-200",
      "backdrop:motion-reduce:transition-none",
      "data-[state=closed]:backdrop:opacity-0",
      "focus-visible:outline-none",
    ],
    /*
     * The scrollable content region. The scroll lives here, not on the
     * `<dialog>`, so the surface stays put while the content moves and a sticky
     * header a caller adds has something to stick to. `overscroll-contain` stops
     * a scroll chaining out to the page behind once the panel hits its end.
     */
    panel: [
      "box-border flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain",
      "p-(--space-5)",
    ],
  },
  variants: {
    /*
     * The maximum width. Capped at `calc(100% - 2rem)` by the `dialog` slot
     * regardless of which size is chosen, so a wide size on a narrow screen
     * still leaves a margin. Sized for a short form: `sm` for a single field,
     * `md` for a login or sign-up form, `lg` where the form has two columns.
     */
    size: {
      sm: { dialog: "max-w-[320px]" },
      md: { dialog: "max-w-[420px]" },
      lg: { dialog: "max-w-[560px]" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export { modalStyles };
export type ModalVariants = VariantProps<typeof modalStyles>;
