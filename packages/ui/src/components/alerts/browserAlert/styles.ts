/*
 * The variant definition for the modal alert dialog.
 *
 * Directive-free and callable from a server component, though a dialog that never
 * opens is not much use — the export is mostly here for parity with the rest of the
 * package, and for styling a `<dialog>` this component does not own.
 *
 *
 * WHY THE SHELL AND THE BOX ARE SEPARATE SLOTS
 *
 * Because `<dialog>` arrives with user-agent styles that have to be undone before
 * anything else is true of it. The UA sheet gives it `position: fixed`, `inset: 0`,
 * `width: fit-content`, `margin: auto`, a solid border, `padding: 1em`, and
 * `background: Canvas` — and this package deliberately ships no Tailwind preflight,
 * so none of that is reset for us the way it would be in an app with a global reset.
 *
 * So `shell` is the `<dialog>` itself, stripped back to a transparent positioning
 * box, and `box` is a plain `<div>` inside it carrying the alert's actual appearance.
 * Trying to make the `<dialog>` be both means fighting `padding: 1em` and
 * `background: Canvas` in every theme.
 */

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

    /** The visible alert. Tone supplies the inline-start edge colour. */
    box: [
      ...ALERT_SURFACE,
      "flex flex-col gap-(--spacing-30) p-(--spacing-50)",
    ],

    /*
     * The tone, as words, above the title.
     *
     * Same reasoning as the other two alerts: the bar colour is the only other thing
     * carrying the tone and it does not survive greyscale or forced-colors mode, so
     * the word has to be there (WCAG 1.4.1). It is also part of the dialog's
     * accessible name — see the `aria-labelledby` in `BrowserAlert.tsx`, which points
     * at this and the title together, so the name reads "Error, Delete workspace?"
     * rather than dropping the severity.
     */
    label: "text-sm font-semibold tracking-wide uppercase",

    title: "text-lg font-semibold text-foreground",

    message: "text-sm text-foreground",

    /*
     * `flex-wrap` and `justify-end`, so two long labels stack instead of overflowing
     * at 200% zoom or in a narrow window (WCAG 1.4.10).
     */
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
