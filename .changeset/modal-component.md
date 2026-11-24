---
"@retrojb/ui": minor
---

Add `Modal`: a centered dialog over a scrim for capturing a small amount of
input, such as a login or sign-up form, built on the native `<dialog>` element
and `showModal()`.

The platform gives the focus trap, the inert background, Escape-to-close, focus
restoration and the top layer; the component adds scroll lock, an animated close
that holds the exit transition before the element leaves the top layer (dropped
under reduced motion), and backdrop-click dismissal. Name it with exactly one of
`title` (a visible heading, preferred) or `aria-label`, enforced as a
compile-time union. Drive it with the controlled pair `open` / `onOpenChange` or
`defaultOpen` alone; `onOpenChange(false)` fires on every close path. `size` is
`sm`, `md` or `lg` (320, 420 and 560px maximum width). It keeps the implicit
`dialog` role; use `BrowserAlert` for a confirmation. Exported as experimental:
`Modal`, `modalStyles`, `IModalProps` and `ModalVariants`.

`Link`: reformat the anchor's props across lines. No behaviour change.
