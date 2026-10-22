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
     */
    shell: [
      "m-auto w-[calc(100%-2rem)] max-w-md",
      "border-0 bg-transparent p-0 text-foreground",
      "backdrop:bg-neutral-9/60",
    ],
    box: [
      ...ALERT_SURFACE,
      "flex flex-col gap-(--spacing-30) p-(--spacing-50)",
    ],
    // `uppercase` is not part of the role: case is presentation the copy may
    // not want, and screen readers ignore it either way.
    label: "text-overline uppercase",
    title: "text-heading-xs text-foreground",
    message: "text-body-sm text-foreground",
    actions: "flex flex-wrap justify-end gap-(--spacing-20)",
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
