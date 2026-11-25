---
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Add `Drawer`: a panel that slides in from the start or end edge of the viewport
over a scrim, built on the native `<dialog>` element and `showModal()`.

The platform gives the focus trap, the inert background, Escape-to-close, focus
restoration and the top layer; the component adds scroll lock, an animated close
that holds the exit transition before the element leaves the top layer (dropped
under reduced motion), and backdrop-click dismissal. Name it with exactly one of
`title` (a visible heading, preferred) or `aria-label`, enforced as a
compile-time union. Drive it with the controlled pair `open` / `onOpenChange` or
`defaultOpen` alone; `onOpenChange(false)` fires on every close path. `side` is
`start` or `end` (logical, so `end` is the right in LTR) and `size` is `sm`,
`md` or `lg`, floored at 200px and capped at 50vw. With `resizable` a handle on
the inner edge drags the drawer wider: `size` is the starting width and the
minimum, and it can grow by half of it. The handle is a focusable separator, so
arrows, Home and End resize it too; `width` / `onWidthChange` control it.
Exported as experimental:
`Drawer`, `drawerStyles`, `IDrawerProps` and `DrawerVariants`. Storybook gains
the `Drawer` stories and accessibility page.
