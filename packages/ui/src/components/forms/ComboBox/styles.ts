/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * More slots than `Input` because there is more markup: the bordered box is a
 * wrapper rather than the input itself, so the clear and toggle buttons can sit
 * inside the same boundary and the focus indicator can surround all three.
 *
 *   root        the labelled group
 *   label
 *   anchor      the positioning context for the listbox
 *   field       the bordered box: input + buttons
 *   control     the text input, borderless
 *   affordance  shared base for the clear and toggle buttons
 *   listbox     the popup
 *   option
 *   mark        the matched run inside an option label
 *   note        empty, loading, error and truncation rows in the listbox
 *   description
 *   error
 *
 * Exported for the case this component does not cover — a multi-select built on
 * `useComboBox` directly, or a command palette whose popup is a dialog rather
 * than a sibling. Use `comboBoxStyle().control()` on the input and the rest on
 * the surrounding markup.
 */

import { tv, type VariantProps } from "../../../lib/tv";

const comboBoxStyle = tv({
  slots: {
    root: "flex flex-col gap-1.5",

    label: "text-sm font-medium text-foreground",

    /*
     * `relative` here and not on `root`, so the listbox is positioned against
     * the field rather than against the whole labelled group — otherwise
     * `top-full` would put the popup below the description and error text.
     *
     * `isolate` starts a new stacking context so the listbox's `z-10` is
     * resolved locally. Without it the popup competes with whatever the app has
     * stacked on the page and the fix becomes an ever-larger z-index.
     */
    anchor: "relative isolate",

    field: [
      "flex w-full items-center gap-1",
      "rounded-control border bg-surface-raised",
      "transition-colors motion-reduce:transition-none",

      /*
       * The focus indicator is on the box, driven by focus inside it (WCAG
       * 2.4.7). `has-[input:focus-visible]` rather than `focus-within` on
       * purpose: `focus-within` also fires for a mouse click, and this package
       * shows the ring for keyboard and programmatic focus only, matching
       * `Button`, `Link` and `Input`.
       *
       * `outline` rather than a `ring` box-shadow because outlines survive
       * forced-colors mode, where box-shadows are dropped.
       */
      "outline-offset-2 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-focus",

      "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60",
    ],

    control: [
      "min-w-0 flex-1 bg-transparent",
      "text-foreground placeholder:text-foreground-muted",

      // The box owns the border and the focus ring, so the input must not draw a
      // second one inside it.
      "border-0 outline-none focus:outline-none",

      "disabled:cursor-not-allowed",
    ],

    affordance: [
      "grid shrink-0 place-items-center rounded-control",
      "text-foreground-muted",
      "transition-colors motion-reduce:transition-none",
      "hover:bg-surface hover:text-foreground",

      // These are out of the tab order, so they are reached by pointer only and
      // never show a focus ring. They still get a hover and an accessible name.
      "disabled:cursor-not-allowed disabled:opacity-60",
    ],

    listbox: [
      "absolute inset-x-0 top-full z-10 mt-1",
      "max-h-72 overflow-y-auto overscroll-contain",
      "rounded-control border border-border-strong bg-surface-raised",
      "py-1 shadow-lg",

      // `hidden` is set as an attribute by `getListboxProps`. Tailwind's
      // preflight sets `display` on some elements, which would beat the
      // attribute's own `display: none`, so it is restated here.
      "[&[hidden]]:hidden",

      // Reset the list semantics the popup does not want. `role="listbox"`
      // already removes the list role, so the markers would be decorative noise.
      "m-0 list-none",
    ],

    option: [
      "flex cursor-pointer items-center justify-between gap-2",
      "px-3 py-2 text-sm text-foreground",

      /*
       * The active option is identified by a background *and* a left border, so
       * it is not signalled by colour alone (WCAG 1.4.1). This matters more here
       * than usual: with `aria-activedescendant` the active option is the only
       * indication of where the keyboard is, and a user who cannot distinguish
       * the background tint would have none.
       */
      "border-l-2 border-transparent",
      "data-[active=true]:border-accent data-[active=true]:bg-primary-3",

      "data-[selected=true]:font-semibold",

      "aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
    ],

    /*
     * The matched run.
     *
     * `bg-transparent` kills the browser default, which is a yellow fill with
     * black text and is unreadable in the dark theme. Weight and an underline
     * carry the emphasis instead of a fill, which keeps it legible on the plain
     * and the active option background alike and survives forced-colors mode —
     * and means the highlight is not conveyed by colour alone (1.4.1).
     */
    mark: [
      "bg-transparent font-semibold text-accent-text",
      "underline decoration-2 underline-offset-2",
    ],

    note: "px-3 py-2 text-sm text-foreground-muted",

    description: "text-sm text-foreground-muted",

    // Paired with `aria-invalid` and the border colour, so the error is conveyed
    // by more than red text (WCAG 1.4.1).
    error: "text-sm font-medium text-danger",
  },

  variants: {
    size: {
      /*
       * Heights match `Button` and `Input` exactly (32/40/48px) so a combobox
       * lines up with them in a row. The same target-size trade applies: all
       * three clear 2.5.8 (AA, 24px), only `lg` clears 2.5.5 (AAA, 44px).
       *
       * The height is on the field, not the input, because the field is now the
       * bordered box. The affordances are square and inset by 4px so they stay
       * inside the boundary.
       */
      sm: {
        field: "h-8 pl-2.5 pr-1",
        control: "text-sm",
        affordance: "size-6",
      },
      md: {
        field: "h-10 pl-3 pr-1.5",
        control: "text-sm",
        affordance: "size-7",
      },
      lg: {
        field: "h-12 pl-4 pr-2",
        control: "text-base",
        affordance: "size-8",
      },
    },

    invalid: {
      // `border-border-strong` at 4.26:1 and `border-danger` at 6.53:1 both
      // clear 1.4.11, which applies to the field's boundary because the boundary
      // is what identifies the control.
      false: {
        field: "border-border-strong has-[input:focus-visible]:border-accent",
      },
      true: { field: "border-danger" },
    },

    labelHidden: {
      // Visually gone, still in the accessibility tree and still the input's
      // accessible name. `hidden` or `display: none` would remove it from both.
      true: { label: "sr-only" },
    },

    /*
     * Where the popup opens.
     *
     * No JavaScript measures anything. Collision detection by script means a
     * layout read on every open plus scroll and resize listeners for the rest of
     * the component's life, and this package has no positioning dependency to
     * hand that off to.
     *
     * `auto` instead gets the geometry below as its floor and is upgraded to real
     * collision detection by the `@supports (anchor-name)` block in
     * `styles/index.css` — CSS anchor positioning reached Baseline in 2026, so
     * that is the path nearly every visitor takes. The same trade `BrowserAlert`
     * makes with `<dialog>`: let the platform do it.
     *
     * `bottom` and `top` pin the popup and opt out of the upgrade, for the cases
     * where the layout already guarantees the space and a flip would be wrong.
     */
    placement: {
      auto: { listbox: "top-full mt-1" },
      bottom: { listbox: "top-full mt-1" },
      top: { listbox: "bottom-full top-auto mb-1" },
    },
  },

  defaultVariants: {
    size: "md",
    invalid: false,
    placement: "auto",
  },
});

export { comboBoxStyle };
export type ComboBoxVariants = VariantProps<typeof comboBoxStyle>;
