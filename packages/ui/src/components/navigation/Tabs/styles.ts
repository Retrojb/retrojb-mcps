/*
 * The variant definition, in its own module beside the components rather than
 * inside them — see the note in `interactions/Button/styles.ts`.
 *
 * One slot recipe for the whole compound, as `cardStyles` is for the cards.
 * `TabGroup` sets the variants once and every part reads them from context, so
 * a `Tab` twelve levels down is sized and oriented like the group it is in.
 *
 * Slots: `root` is the `TabGroup` element; `scroller` is the wrapper `TabList`
 * renders around the tab list so a long row can scroll; `list` is the
 * `role="tablist"` element itself; `tab` is one `<button role="tab">`, a
 * one-cell grid the `text` and the `sizer` stack in; `panel` is one
 * `role="tabpanel"`.
 *
 *
 * SELECTED IS MORE THAN COLOUR (1.4.1)
 *
 * Three cues change together, and any one of them identifies the selected tab:
 *
 *   - shape: only the selected tab has an indicator bar, 3px of `--accent` on
 *     the edge facing the panels (the bottom when horizontal, the inline end
 *     when vertical). In greyscale it is still the one tab with a bar;
 *   - weight: the text goes from the label role's 500 to 600;
 *   - colour: `--foreground-muted` to `--accent-text`. This is the weakest of
 *     the three and is never the only one.
 *
 * A weight change on its own would make the tab wider and shove its neighbours
 * sideways. `sizer` is the `SegmentedControl` fix: an invisible, `aria-hidden`
 * copy of the label in the selected weight, stacked in the same grid cell, so
 * every tab is always as wide as its bold self.
 *
 *
 * THE INDICATOR AND THE BASELINE (1.4.11)
 *
 * The list draws a 1px baseline along the same edge, in `--border`. That line
 * identifies nothing — it is a separator between the tab row and the panels —
 * so it is the decorative token on purpose, and 1.4.11 does not apply to it.
 * What does have to clear 3:1 is the selected indicator, against everything it
 * touches: `--accent` measures 6.19 / 8.87:1 on `--background`, 8.82 / 9.72:1 on
 * `--surface`, 9.45 / 9.05:1 on `--surface-raised`, and 3.53 / 4.39:1 against
 * the `--border` baseline it sits directly on. Unselected tabs have no
 * boundary; their text identifies them, which 1.4.11 allows for an inactive
 * state.
 *
 * Hover on an unselected tab draws the bar in `--border-strong` (4.16 / 4.41:1
 * on `--background`) and darkens the text to `--foreground`. Decorative: it
 * previews the click, it does not carry state.
 *
 *
 * WHY THE LIST IS WRAPPED IN A SCROLLER
 *
 * A row of tabs does not wrap — a second row of tabs breaks the "row of
 * labels above one panel" model and makes the indicator ambiguous. So when the
 * row is longer than its container, `scroller` scrolls it sideways rather than
 * letting it overflow the page (1.4.10). The scroller is not itself focusable,
 * unlike `CodeBlock`: everything it scrolls is a tab, the arrow keys reach every
 * tab, and `focus()` scrolls the focused tab into view, so a keyboard user can
 * already reach all of it (2.1.1). `scroll-px` keeps a tab reached that way a
 * little in from the edge rather than flush against it.
 *
 * Scrolling has a cost: `overflow-x: auto` forces `overflow-y` to `auto` as
 * well, so the scroller clips on every side, and the focus ring sits 4px
 * outside the tab (2px offset plus 2px width). The scroller's 4px of padding is
 * that ring's room; without it the ring is cut off at the top and bottom of
 * every tab and at the outer edge of the first and last. The padding is also
 * why the baseline is on `list`, not on `scroller` — inside the padding, so the
 * indicator sits right on it.
 *
 *
 * TARGET SIZE (2.5.8)
 *
 * Tabs are at least 32 / 40 / 48px tall (`sm` / `md` / `lg`), the `Button`
 * heights, and at least their label plus 24–48px of padding wide, so every size
 * clears 24 × 24 on its own. `lg` clears the 44px of 2.5.5 (AAA) vertically.
 * `min-h` rather than `h`, so 1.4.12 text-spacing overrides grow the tab instead
 * of clipping it.
 *
 * Slot names, top down: `root`, `scroller`, `list`, `tab`, `text`, `sizer`,
 * `panel`.
 */
import { tv, type VariantProps } from "../../../lib/tv";

/** The package-wide focus indicator — see `interactions/Button/styles.ts`. */
const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";

/** Shared by `text` and `sizer`, so the two always occupy the same box. */
const LABEL_BOX = "col-start-1 row-start-1 whitespace-nowrap";

const tabGroupStyles = tv({
  slots: {
    root: "flex min-w-0",
    scroller: "max-w-full p-(--spacing-10)",
    list: "flex gap-(--spacing-10)",
    tab: [
      "relative grid shrink-0 items-center",
      /*
       * The button reset. The stylesheet ships no preflight, so the UA's
       * button face, its 2px outset border and its own font family would all
       * show through. `border-0` comes before the orientation's single-side
       * width, which then sets only the indicator edge.
       */
      "m-0 appearance-none border-0 bg-transparent [font-family:inherit]",
      "cursor-pointer border-transparent",
      /*
       * Unselected: `--foreground-muted`, 6.25 / 6.62:1 on `--background`,
       * 8.91 / 7.25:1 on `--surface` and 9.55 / 6.76:1 on `--surface-raised`.
       * Hovered: `--foreground`, 13.30 / 15.72:1 on `--background`.
       */
      "text-foreground-muted",
      "enabled:not-aria-selected:hover:border-border-strong enabled:not-aria-selected:hover:text-foreground",
      /*
       * Selected: the `--accent` bar (see THE INDICATOR AND THE BASELINE) and
       * `--accent-text`, 10.76 / 13.24:1 on `--background` and 15.33 / 14.50:1
       * on `--surface`. `font-semibold` sets `--tw-font-weight`, which the
       * label role reads before its own default, so the weight survives it.
       */
      "aria-selected:border-accent aria-selected:font-semibold aria-selected:text-accent-text",
      "disabled:cursor-not-allowed disabled:opacity-60",
      "transition-colors motion-reduce:transition-none",
      /*
       * The package-wide indicator: 2px at a 2px offset, an outline so it
       * survives forced-colors mode. `--focus-ring` is 6.19 / 8.87:1 on
       * `--background` and 8.82 / 9.72:1 on `--surface`.
       */
      FOCUS_RING,
      /*
       * Forced colors. Left alone, the browser repaints the indicator and the
       * hover bar in `CanvasText`, and the transparent bars of the other tabs
       * may be repainted too, so every tab would wear a bar and the selection
       * would vanish. Opting out and painting with system colours keeps the
       * transparent bars transparent and gives the selected tab a
       * `SelectedItem` bar, as `SegmentedControl` gives its selected segment a
       * `SelectedItem` box. The list is not opted out: the browser draws its
       * baseline in `CanvasText` by itself.
       */
      "forced-colors:forced-color-adjust-none forced-colors:text-[CanvasText]",
      // Each state restated in system colours: the state rules above outrank
      // the bare `forced-colors:text-[CanvasText]` on specificity.
      "forced-colors:aria-selected:border-[SelectedItem] forced-colors:aria-selected:text-[CanvasText]",
      "forced-colors:enabled:not-aria-selected:hover:border-[Highlight] forced-colors:enabled:not-aria-selected:hover:text-[CanvasText]",
      "forced-colors:focus-visible:outline-[Highlight]",
      "forced-colors:disabled:text-[GrayText]",
      "forced-colors:disabled:aria-selected:border-[GrayText] forced-colors:disabled:aria-selected:text-[GrayText]",
    ],
    text: LABEL_BOX,
    // Reserves the selected weight's width; never painted, never announced.
    sizer: [LABEL_BOX, "invisible font-semibold"],
    /*
     * A panel is a tab stop by default — see `TabPanel` for why — so it takes
     * the same indicator as the tabs. `rounded-control` so the ring has the
     * package's corner rather than a square one.
     *
     * `[&[hidden]]:hidden` restates `display: none` for an inactive panel. The
     * UA's `[hidden]` rule loses to any author `display`, so a caller's `flex`
     * or `grid` on a panel would otherwise show every panel at once. This
     * selector outranks a single utility class, so it wins.
     */
    panel: ["min-w-0 rounded-control [&[hidden]]:hidden", FOCUS_RING],
  },
  variants: {
    /*
     * Horizontal: the list above the panels, the bar and baseline along the
     * bottom. Vertical: the list beside the panels, the bar and baseline along
     * the inline end, so they flip to the left under `dir="rtl"` with no extra
     * rules. Labels start-align in a vertical list so a column of them reads
     * as a list.
     */
    orientation: {
      horizontal: {
        root: "flex-col gap-(--spacing-20)",
        scroller: "overflow-x-auto scroll-px-(--spacing-40)",
        // `w-max` so the baseline runs under every tab when the row scrolls;
        // `min-w-full` so it still spans the container when it does not.
        list: "w-max min-w-full border-b border-border",
        tab: "justify-items-center rounded-t-control border-b-3",
      },
      vertical: {
        root: "flex-row items-start gap-(--spacing-30)",
        scroller: "shrink-0 overflow-y-auto scroll-py-(--spacing-40)",
        list: "flex-col border-e border-border",
        tab: "justify-items-start rounded-s-control border-e-3 text-start",
        panel: "flex-1",
      },
    },
    /*
     * Minimum heights 32 / 40 / 48px — see TARGET SIZE above. The type role
     * goes on `tab`; `text` and `sizer` inherit it.
     */
    size: {
      sm: {
        tab: "min-h-8 px-(--spacing-30) py-(--spacing-10) text-label-md",
      },
      md: {
        tab: "min-h-10 px-(--spacing-40) py-(--spacing-10) text-label-md",
      },
      lg: {
        tab: "min-h-12 px-(--spacing-60) py-(--spacing-20) text-label-lg",
      },
    },
    /*
     * Content-sized by default. `fullWidth` shares the row equally between the
     * tabs. Horizontal only — a vertical list already stretches every tab to
     * the width of the widest, so there is nothing for it to do there.
     */
    fullWidth: {
      false: {},
      true: {},
    },
  },
  compoundVariants: [
    {
      orientation: "horizontal",
      fullWidth: true,
      class: { tab: "flex-1" },
    },
  ],
  defaultVariants: {
    orientation: "horizontal",
    size: "md",
    fullWidth: false,
  },
});

export { tabGroupStyles };
export type TabGroupVariants = VariantProps<typeof tabGroupStyles>;
