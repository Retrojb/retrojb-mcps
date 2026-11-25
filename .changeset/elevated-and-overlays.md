---
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Components adopt the elevation tokens.

`Button` gains `elevated`: a resting `shadow-control` that lifts to
`shadow-control-hover` on hover and drops on press. `ghost` and disabled
buttons ignore it, and the button's transition now includes `box-shadow`.

`Card`, `GraphicCard` and `InteractiveCard` gain `elevated`: `shadow-raised-1`
on a `surface-raised-1` fill. Inside any ancestor with `data-surface="overlay"`
an elevated card drops its shadow and keeps its border.

The overlays always have a shadow, sit on `surface-overlay` and set
`data-surface="overlay"`: the `ComboBox` and `SearchBox` popup
(`shadow-overlay`, replacing Tailwind's `shadow-lg`), `ToastAlert`
(`shadow-overlay`) and `BrowserAlert` (`shadow-modal`). In dark mode the
overlay surface is a step lighter than before; every text and boundary pairing
on it still meets WCAG AA, and the accessibility docs carry the new ratios.

Storybook gains `Button` Elevated, `Card` Elevated and `Card` Inside an overlay
stories.
