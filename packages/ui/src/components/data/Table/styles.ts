/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `actions/Button/styles.ts`.
 *
 * Slots rather than a single class string, and more of them than any other
 * component here, because a table is a dozen elements that have to agree with
 * each other: `root`, `table`, `caption`, `head`, `body`, `foot`, `row`,
 * `headerCell`, `headerLabel`, `sortButton`, `sortIcon`, `cell` and `empty`.
 * Exported for the case this component does not cover — a small static table
 * written as plain markup, with no TanStack instance behind it, that still has
 * to look like the data tables around it. Every slot is callable from a server
 * component.
 *
 * Two slots exist only to keep padding off the `<th>`: `headerLabel` and
 * `sortButton`. Padding lives on whichever of the two is rendered inside the
 * cell, so a sortable column's button fills the entire cell rather than
 * occupying a text-sized box inside it. That is the difference between a target
 * that clears WCAG 2.5.8 comfortably and one that clears it on paper.
 */

import { tv, type VariantProps } from "../../../lib/tv";

const tableStyle = tv({
  slots: {
    /*
     * The scroll container, not the table.
     *
     * A table wider than its column is the normal case, not the exception, so
     * the overflow container is always rendered. The component puts
     * `tabIndex={0}` and `role="region"` on it, because a scrollable region
     * that cannot be reached from the keyboard cannot be scrolled from the
     * keyboard (WCAG 2.1.1) — and once it is focusable it needs the same focus
     * indicator as every other focusable surface in this package.
     *
     * `relative` makes it the containing block for absolutely positioned
     * descendants. An `sr-only` label in a cell is `position: absolute`, and
     * without a positioned ancestor inside the scroller it escapes the
     * overflow clip and widens the page instead (1.4.10).
     */
    root: [
      "relative w-full overflow-x-auto",
      "rounded-control border border-border bg-surface-raised-1",
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
    ],

    /*
     * `border-collapse` so cell borders meet as single rules rather than
     * doubling. Every border in this component is therefore declared on a `th`
     * or a `td`: borders on `tr`, `thead` and `tbody` are dropped by the
     * collapsing border model in most browsers, which is a silent failure.
     *
     * `text-start`, not `text-left`. The two are identical in LTR and only
     * `text-start` follows `dir="rtl"`.
     */
    table: "w-full border-collapse text-start text-foreground",

    /*
     * `caption-top` puts the caption above the table, which is where the
     * default already is — named explicitly because a global reset that sets
     * `caption-side: bottom` would otherwise move the table's accessible name
     * below its data.
     */
    caption: "caption-top text-start text-foreground-muted",

    head: "",

    /*
     * The last row's rule would sit directly on top of the container's own
     * border, reading as one 2px line. Dropped on the section rather than by
     * giving the last row a variant, so it stays correct however rows are
     * composed — and on both sections, because either can be last.
     *
     * `:last-child` on the section itself is what keeps a `<tbody>` followed by a
     * `<tfoot>` from losing the rule that separates the two.
     */
    body: "last:[&>tr:last-child>td]:border-b-0",

    foot: "last:[&>tr:last-child>td]:border-b-0",

    row: "transition-colors motion-reduce:transition-none",

    /*
     * `bg-surface-base` unconditionally, not only when the header is sticky. A
     * sticky header scrolls body rows underneath itself, so it must be opaque;
     * making that depend on the `stickyHeader` variant means the day someone
     * sets the variant from a caller-supplied class instead, rows show through.
     *
     * `border-border-strong` for the rule under the header, rather than the
     * `border-border` used between body rows. This is the boundary that
     * separates labels from data, so it clears the 3:1 that 1.4.11 asks of a
     * meaningful boundary (measured ratio in `TableSpec.yaml`); it is doing
     * more than decoration.
     */
    /*
     * The colours are side-scoped — `border-b-border-strong` rather than
     * `border-border-strong` — and that is load-bearing rather than pedantic.
     * tailwind-merge puts `border-<color>` in one group, so the `border-border`
     * the `bordered` variant adds for the vertical rule would replace this
     * horizontal one and quietly downgrade the header's boundary to decorative.
     * Naming the side puts the two in different groups.
     */
    headerCell: [
      "bg-surface-base font-medium text-foreground",
      "border-b border-b-border-strong",
      "whitespace-nowrap",
    ],

    // The padding carrier for a non-sortable header cell. See the note above.
    headerLabel: "block",

    /*
     * A real `<button>`, not a click handler on the `<th>`.
     *
     * Sorting is an action, so it needs a control that is in the tab order,
     * operable with Enter and Space, and announced as a button (WCAG 2.1.1,
     * 4.1.2). `w-full` with the size padding below makes the button the whole
     * cell, so the target is the full header cell rather than the text.
     */
    sortButton: [
      "flex w-full items-center gap-(--space-2)",
      "min-h-(--control-height-xs) rounded-control font-medium",
      "cursor-pointer select-none",
      "transition-colors motion-reduce:transition-none",
      "hover:text-accent-text",

      // Same indicator as Button, Link and Input.
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
    ],

    /*
     * The sort direction, as a glyph. `aria-sort` on the `<th>` carries the
     * state for assistive technology and this carries it visually, so direction
     * is never conveyed by colour or position alone (WCAG 1.4.1). `shrink-0`
     * keeps it from being squeezed out by a long header.
     */
    sortIcon: "shrink-0 text-caption leading-none",

    /*
     * The horizontal rule under each body cell moved to the `divided` variant,
     * which defaults on, so this slot carries only alignment. See `divided`.
     */
    cell: "align-middle",

    // The empty state occupies one cell spanning the full width, so it gets
    // generous vertical padding of its own rather than a row's.
    empty: "text-center text-foreground-muted",
  },

  variants: {
    /*
     * Cell padding is `--space-*`, so a table inside `data-density="compact"`
     * tightens with it; `size` and density are separate axes. At the default
     * density rows are about 38 / 46 / 49px, close to Button and Input so a
     * table can sit in the same layout as a toolbar. The same target-size trade applies to the sort buttons: all
     * three clear 2.5.8 (AA, 24px), only `lg` clears 2.5.5 (AAA, 44px).
     */
    size: {
      sm: {
        caption: "px-(--space-2) py-(--space-2) text-body-sm",
        headerLabel: "px-(--space-2) py-(--space-2) text-body-sm",
        sortButton: "px-(--space-2) py-(--space-2) text-body-sm",
        cell: "px-(--space-2) py-(--space-2) text-body-sm",
        empty: "px-(--space-2) py-(--space-6) text-body-sm",
      },
      md: {
        caption: "px-(--space-3) py-(--space-3) text-body-sm",
        headerLabel: "px-(--space-3) py-(--space-3) text-body-sm",
        sortButton: "px-(--space-3) py-(--space-3) text-body-sm",
        cell: "px-(--space-3) py-(--space-3) text-body-sm",
        empty: "px-(--space-3) py-(--space-7) text-body-sm",
      },
      lg: {
        caption: "px-(--space-4) py-(--space-3) text-body-md",
        headerLabel: "px-(--space-4) py-(--space-3) text-body-md",
        sortButton: "px-(--space-4) py-(--space-3) text-body-md",
        cell: "px-(--space-4) py-(--space-3) text-body-md",
        empty: "px-(--space-4) py-(--space-8) text-body-md",
      },
    },

    /*
     * Per-cell, not per-table: numeric columns read better end-aligned while
     * the labels beside them stay at the start. The `justify-*` half is what
     * keeps a sortable numeric header's button contents aligned with the
     * numbers underneath it, since the button is a flex container.
     */
    align: {
      start: {
        headerCell: "text-start",
        cell: "text-start",
        sortButton: "justify-start",
        /*
         * The sort chevron is pushed to the column's trailing edge, rather than
         * sitting against the label. `ms-auto` eats the free space between the
         * label and the icon, so the label stays at the reading-start edge and
         * the glyph lands at the end however short the header is. Logical
         * margin, so it follows `dir="rtl"`.
         *
         * Only `start` does this. In `end` the button is already packed against
         * the trailing edge by `justify-end`, so the icon is there without help;
         * in `center` the label and glyph read as one centred cluster, and
         * splitting them to opposite edges would fight the alignment.
         */
        sortIcon: "ms-auto",
      },
      center: {
        headerCell: "text-center",
        cell: "text-center",
        sortButton: "justify-center",
      },
      end: {
        headerCell: "text-end",
        cell: "text-end",
        sortButton: "justify-end",
      },
    },

    // Vertical rules. `--border` rather than `--border-strong` because these are
    // decorative: they group nothing that is not already grouped by position,
    // and they are never the only thing identifying a cell.
    bordered: {
      true: {
        headerCell: "border-r border-r-border last:border-r-0",
        cell: "border-r border-r-border last:border-r-0",
      },
    },

    /*
     * Horizontal rules between rows: the row-wise counterpart to `bordered`,
     * and on by default so a plain `<Table>` looks as it always has. Set
     * `divided={false}` for a borderless table that leans on striping or
     * whitespace instead.
     *
     * The colour is side-scoped — `border-b-border`, not `border-border` — for
     * the same tailwind-merge reason the header rule and the vertical rules are:
     * a blanket `border-<color>` sits in one merge group, so an unscoped colour
     * here would collide with the `bordered` variant's vertical rule and one
     * would silently drop. Scoping the side puts the bottom rule and the right
     * rule in different groups.
     *
     * `--border`, not `--border-strong`: a separator between two body rows
     * groups nothing that position does not already group, so 1.4.11 does not
     * apply to it (the header's `--border-strong` rule is the one boundary that
     * means something). The last row's rule is still dropped by the `body` and
     * `foot` slots' `:last-child` rule, which is a no-op when `divided` is off.
     */
    divided: {
      true: {
        cell: "border-b border-b-border",
      },
    },

    /*
     * Zebra striping, applied to the row rather than to `tbody` with an
     * `:nth-child` selector. Both work, but an `:nth-child` rule on the section
     * and a plain background on the row have the same specificity, so which one
     * paints a selected odd row would come down to stylesheet order. Deciding
     * it in the component instead — see the note in `Table.tsx` — is the part
     * that cannot drift.
     */
    striped: {
      true: { row: "odd:bg-surface-base" },
    },

    /*
     * A tint, and only a tint.
     *
     * Over `--surface-raised-1` this composites to a soft accent wash that keeps
     * `--foreground` well clear of 4.5:1 in both themes. Those figures are
     * calculated rather than measured: `check:contrast` in apps/docs covers
     * pairs of named tokens, and a composited tint is not one. The composited
     * colours and ratios are recorded in `TableSpec.yaml`.
     *
     * It is deliberately not enough on its own. A selected row must also carry a
     * checkbox or radio in one of its cells, which is what actually conveys
     * selection to assistive technology — colour alone would fail 1.4.1, and
     * `aria-selected` is not an option here, because ARIA supports it on rows
     * inside a `grid` and not on rows inside a `table`.
     *
     * One thing to know before reading the compiled stylesheet: Tailwind emits
     * `background-color: var(--color-accent)` ahead of the `color-mix()` rule as
     * an `@supports` fallback (a solid accent behind `--foreground`, which would
     * not clear 4.5:1). It never applies. `color-mix()` shipped in Chrome 111,
     * Safari 16.2 and Firefox 113, all at or below the Safari 16.4 / Chrome 111 /
     * Firefox 128 floor Tailwind v4 itself requires — so no browser that can
     * render this file lacks it.
     */
    selected: {
      true: { row: "bg-accent/10" },
    },

    /*
     * `sticky` on the cells rather than on `<thead>`. Under
     * `border-collapse: collapse` a sticky section leaves its borders behind
     * when it detaches, which shows up as the header rule staying put while the
     * header scrolls. Sticking the cells keeps the rule attached to them.
     *
     * Only does anything when the caller constrains the container's height —
     * `rootClassName="max-h-96"` or similar.
     */
    stickyHeader: {
      true: { headerCell: "sticky top-0 z-10" },
    },

    // Visually gone, still in the accessibility tree and still the table's
    // accessible name. `hidden` or `display: none` would remove it from both.
    captionHidden: {
      true: { caption: "sr-only" },
    },
  },

  defaultVariants: {
    size: "md",
    align: "start",
    // On by default: a plain table keeps the row rules it has always had.
    divided: true,
  },
});

export { tableStyle };
export type TableVariants = VariantProps<typeof tableStyle>;
