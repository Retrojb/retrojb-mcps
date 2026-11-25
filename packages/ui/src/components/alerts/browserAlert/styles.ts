import { tv, type VariantProps } from "../../../lib/tv";
import { ALERT_SURFACE, toneVariants } from "../tone";

const browserAlertStyles = tv({
  slots: {
    /*
     * The `<dialog>`, reduced to a positioning shell.
     *
     * `w-[calc(100%-2rem)]` rather than `w-full` so the dialog never touches the
     * viewport edges on a narrow screen, which also keeps it clear of the rounded
     * corners and safe areas on a phone.
     *
     * `backdrop:` styles the `::backdrop` pseudo-element, which only exists for a
     * dialog opened with `showModal()`. That is also what makes the rest of the page
     * inert and untabbable — the reason this component uses the platform dialog
     * instead of a positioned `<div>` and a hand-rolled focus trap.
     *
     * The backdrop is `--scrim-md`, which is dark in both themes. It replaces
     * `--neutral-9` at 60%, which is near-white in the dark theme and lightened
     * the page instead of dimming it. `::backdrop` inherits custom properties
     * from its dialog in current browsers (Chrome 122, Firefox 120, Safari 17.4);
     * older ones drop the tint and show the page undimmed, which is safe
     * because the border, not the scrim, separates the dialog from the page.
     */
    shell: [
      "m-auto w-[calc(100%-2rem)] max-w-md",
      "border-0 bg-transparent p-0 text-foreground",
      "backdrop:bg-scrim-md",
    ],
    /*
     * The dialog's visible box: the overlay surface with the `modal` shadow,
     * marked `data-surface="overlay"` in `BrowserAlert.tsx` so a card inside
     * drops its own shadow. The border, not the shadow or the scrim, is what
     * separates it from the page, and the only one left in forced-colors mode.
     */
    box: [
      ...ALERT_SURFACE,
      "bg-surface-overlay shadow-modal",
      "flex flex-col gap-(--space-3) p-(--space-5)",
    ],
    // `uppercase` is not part of the role: case is presentation the copy may
    // not want, and screen readers ignore it either way.
    label: "text-overline uppercase",
    title: "text-heading-xs text-foreground",
    message: "text-body-sm text-foreground",
    actions: "flex flex-wrap justify-end gap-(--space-2)",
  },
  variants: {
    tone: toneVariants("box", "label"),
  },
  defaultVariants: {
    tone: "info",
  },
});

export { browserAlertStyles };
export type BrowserAlertVariants = VariantProps<typeof browserAlertStyles>;
