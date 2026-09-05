"use client";

/*
 * The composable parts of `<Table>`.
 *
 * Every one of them works two ways. Given children, it renders them and styles
 * the element around them. Given none, it generates itself from the TanStack
 * instance on the context. That is what lets the same component cover
 * `<Table table={table} caption="…" />` and a hand-composed body with a
 * checkbox column, an expander and a row-click handler, without a second
 * component and without props that only apply to one of the two.
 *
 * They live together in one module rather than one file each because they share
 * the context hook and the two casts described in `types.ts`, and because
 * splitting nine twenty-line components across nine files makes the shape of the
 * thing harder to see, not easier.
 */

import { type ReactElement, type ReactNode } from "react";

import { FlexRender } from "@tanstack/react-table";
import type { CellData, RowData, TableFeatures } from "@tanstack/react-table";

import { TableContext, useTableContext } from "./context";
import { tableStyle, type TableVariants } from "./styles";
import type {
  AnyCell,
  AnyHeader,
  ITableBodyProps,
  ITableCellProps,
  ITableEmptyProps,
  ITableFootProps,
  ITableHeadProps,
  ITableHeaderCellProps,
  ITableRowProps,
} from "./types";

/*
 * Column alignment, read off `columnDef.meta` when a cell was given no `align` of
 * its own.
 *
 * A generated table has no call site to put `align` on — `<Table table={table} />`
 * renders every cell itself — so without this there would be no way to end-align
 * a column of figures short of abandoning the generated path. The column
 * definition is the right place for it anyway: alignment is a property of the
 * column, not of each of its cells.
 *
 * Declaring the shape is the app's job, either by declaration-merging TanStack's
 * `ColumnMeta` or with v9's per-table slot:
 *
 * ```ts
 * tableFeatures({ columnMeta: {} as { align?: "start" | "center" | "end" } });
 * ```
 *
 * Read defensively rather than cast, because `meta` is whatever the app says it
 * is. A value this does not recognise falls back to the default alignment
 * instead of reaching `tv` as an unresolvable variant and styling nothing.
 */
const alignFromMeta = (meta: unknown): TableVariants["align"] => {
  if (typeof meta !== "object" || meta === null || !("align" in meta)) {
    return undefined;
  }

  const { align } = meta as { readonly align: unknown };

  return align === "start" || align === "center" || align === "end"
    ? align
    : undefined;
};

/**
 * A `<tr>`.
 *
 * `selected` tints the row and sets `data-selected`. It does not announce
 * anything: ARIA supports `aria-selected` on rows inside a `grid`, not inside a
 * `table`, so a selectable table needs a checkbox in one of its cells to convey
 * selection — which is also what keeps the state off colour alone (WCAG 1.4.1).
 */
const TableRow = ({
  selected,
  className,
  children,
  ...props
}: ITableRowProps): ReactElement => {
  const context = useTableContext("Row");

  /*
   * Striping is dropped for a selected row, here rather than in CSS.
   *
   * `odd:bg-surface` and `bg-accent/10` have the same specificity, so left to
   * the cascade which one paints a selected odd row depends on the order the two
   * utilities happen to appear in the compiled stylesheet — it would work, until
   * a Tailwind upgrade reordered them. Deciding it in JavaScript means only one
   * of the two is ever emitted.
   */
  const slots = tableStyle({
    ...context.variants,
    striped: selected === true ? false : context.variants.striped,
    selected,
  });

  return (
    <tr
      {...props}
      data-selected={selected === true ? "true" : undefined}
      className={slots.row({ class: className })}
    >
      {children}
    </tr>
  );
};

/**
 * A `<th>`.
 *
 * Pass `header` and the cell renders that column's header content, spans the
 * right number of rows and columns, and becomes a sort control if the column can
 * sort. Pass `children` instead for a header this table does not own — a checkbox
 * column, or a column of row actions.
 *
 * Returns `null` for a header that a merged placeholder above it already covers,
 * so a head can map over a header group without filtering it first.
 */
const TableHeaderCell = <
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>({
  header,
  align,
  className,
  children,
  colSpan,
  scope,
  ...props
}: ITableHeaderCellProps<TFeatures, TData, TValue>): ReactElement | null => {
  const context = useTableContext("HeaderCell");

  if (header === undefined) {
    const ownSlots = tableStyle({ ...context.variants, align });

    return (
      <th
        {...props}
        scope={scope ?? "col"}
        colSpan={colSpan}
        className={ownSlots.headerCell({ class: className })}
      >
        <span className={ownSlots.headerLabel()}>{children}</span>
      </th>
    );
  }

  // See the note on `AnyHeader` in `types.ts`: one widening cast, and every
  // feature-gated call below is guarded against the prototype.
  const instance = header as unknown as AnyHeader;
  const { column } = instance;

  /*
   * Nested columns of uneven depth, handled by merging rather than by padding.
   *
   * A leaf column shallower than the deepest one gets a chain of placeholder
   * headers stacked above its real header, so that every header row accounts for
   * every visible column. TanStack reports the chain's full height as `rowSpan` on
   * the placeholder at the top and `0` on everything it covers, including the real
   * header at the bottom. Skipping the zeroes and spanning the rest turns the
   * chain into one cell.
   *
   * The alternative — rendering placeholders as empty cells — produces a `<th>`
   * with no text above a header that has some, and if that empty cell is also a
   * sort control it is a button with no accessible name at all (WCAG 4.1.2). So
   * the surviving placeholder is treated as the column's real header, content and
   * sort button included, which is what it visually is.
   *
   * `rowSpan` is always `1` when the column tree is even, so this costs nothing in
   * the flat case.
   */
  if (instance.rowSpan === 0) {
    return null;
  }

  const slots = tableStyle({
    ...context.variants,
    align: align ?? alignFromMeta(column.columnDef.meta),
  });

  // Checked on the value, not with `"getCanSort" in column` — see the note in
  // `GeneratedRows` for why. Absent unless `rowSortingFeature` is registered.
  const sortable =
    typeof column.getCanSort === "function" && column.getCanSort();
  const sorted = sortable ? column.getIsSorted() : false;
  const toggleSort = sortable ? column.getToggleSortingHandler() : undefined;

  /*
   * `aria-sort` on the `<th>` is the only thing that tells assistive technology
   * how the table is ordered — the glyph below is decorative and hidden. Every
   * sortable column carries it, `"none"` included, so a screen reader user can
   * tell a sortable column from a fixed one before activating anything.
   */
  const ariaSort = !sortable
    ? undefined
    : sorted === "asc"
      ? "ascending"
      : sorted === "desc"
        ? "descending"
        : "none";

  const content = <FlexRender header={instance} />;

  return (
    <th
      {...props}
      /*
       * `colgroup` once the cell covers more than one column, `col` otherwise.
       * Keyed off `colSpan` rather than off whether the header has sub-headers,
       * because the two come apart in both directions: a group column with a
       * single child spans one column and labels one column, and a merged
       * placeholder has a sub-header while still covering one. A header claiming
       * `col` while spanning several associates itself with one of them and leaves
       * the rest unlabelled (WCAG 1.3.1).
       */
      scope={scope ?? (instance.colSpan > 1 ? "colgroup" : "col")}
      colSpan={colSpan ?? (instance.colSpan > 1 ? instance.colSpan : undefined)}
      rowSpan={instance.rowSpan > 1 ? instance.rowSpan : undefined}
      aria-sort={ariaSort}
      className={slots.headerCell({ class: className })}
    >
      {toggleSort === undefined ? (
        <span className={slots.headerLabel()}>{content}</span>
      ) : (
        <button
          type="button"
          onClick={toggleSort}
          className={slots.sortButton()}
        >
          {content}
          <span aria-hidden="true" className={slots.sortIcon()}>
            {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "⇅"}
          </span>
        </button>
      )}
    </th>
  );
};

/**
 * A `<td>`.
 *
 * Pass `cell` for a body cell or `footer` for a footer cell — the same split
 * TanStack's own `FlexRender` makes. Pass `children` for a cell whose content
 * does not come from a column definition.
 */
const TableCell = <
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>({
  cell,
  footer,
  align,
  className,
  children,
  ...props
}: ITableCellProps<TFeatures, TData, TValue>): ReactElement => {
  const context = useTableContext("Cell");

  const cellInstance =
    cell === undefined ? undefined : (cell as unknown as AnyCell);
  const footerInstance =
    footer === undefined ? undefined : (footer as unknown as AnyHeader);

  const slots = tableStyle({
    ...context.variants,
    align:
      align ??
      alignFromMeta((cellInstance ?? footerInstance)?.column.columnDef.meta),
  });

  const content =
    cellInstance !== undefined ? (
      <FlexRender cell={cellInstance} />
    ) : footerInstance !== undefined ? (
      <FlexRender footer={footerInstance} />
    ) : (
      children
    );

  return (
    <td {...props} className={slots.cell({ class: className })}>
      {content}
    </td>
  );
};

/**
 * The "nothing to show" row, spanning every column.
 *
 * A `<tbody>` with no rows renders as a table that looks broken rather than
 * empty, so the generated body reaches for this instead of returning nothing.
 */
const TableEmpty = ({
  rowClassName,
  className,
  colSpan,
  children,
  ...props
}: ITableEmptyProps): ReactElement => {
  const context = useTableContext("Empty");

  // Striping off: there is one row, so there is nothing for it to alternate with,
  // and a tinted "no results" reads as a row of data rather than the absence of
  // any.
  const slots = tableStyle({ ...context.variants, striped: false });

  return (
    <tr className={slots.row({ class: rowClassName })}>
      <td
        {...props}
        colSpan={colSpan ?? context.columnCount}
        className={slots.empty({ class: className })}
      >
        {children}
      </td>
    </tr>
  );
};

/**
 * A `<thead>`. Renders one row per header group when given no children.
 *
 * Striping is switched off for everything inside, by re-providing the context with
 * it cleared. That is what lets `<Table.Row>` be the same component in all three
 * sections: a row does not have to be told which one it is in to know that zebra
 * striping belongs to the body.
 */
const TableHead = ({
  className,
  children,
  ...props
}: ITableHeadProps): ReactElement => {
  const context = useTableContext("Head");
  const variants = { ...context.variants, striped: false };
  const slots = tableStyle(variants);

  return (
    <TableContext value={{ ...context, variants }}>
      <thead {...props} className={slots.head({ class: className })}>
        {children ??
          context.table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHeaderCell key={header.id} header={header} />
              ))}
            </TableRow>
          ))}
      </thead>
    </TableContext>
  );
};

/** A `<tbody>`. Renders one row per row model row when given no children. */
const TableBody = ({
  emptyState = "No results.",
  className,
  children,
  ...props
}: ITableBodyProps): ReactElement => {
  const context = useTableContext("Body");
  const slots = tableStyle(context.variants);

  return (
    <tbody {...props} className={slots.body({ class: className })}>
      {children ?? <GeneratedRows emptyState={emptyState} />}
    </tbody>
  );
};

/**
 * The generated body rows.
 *
 * Split out of `TableBody` so the row model is only read when it is going to be
 * used — a hand-composed body should not pay for a model it never renders.
 */
const GeneratedRows = ({
  emptyState,
}: {
  readonly emptyState: ReactNode;
}): ReactElement => {
  const context = useTableContext("Body");
  const { rows } = context.table.getRowModel();

  if (rows.length === 0) {
    return <TableEmpty>{emptyState}</TableEmpty>;
  }

  return (
    <>
      {rows.map((row) => {
        /*
         * Both are feature-gated, and both are checked on the value rather than
         * with `"getVisibleCells" in row`. The widened row type declares them as
         * always present, so `in` narrows the *other* branch to `never` and the
         * core fallback stops type-checking. A `typeof` test narrows the property
         * instead of the row, which leaves both branches usable.
         *
         * Without `columnVisibilityFeature` there is no visibility state to
         * respect, so every cell is a visible cell; without `rowSelectionFeature`
         * no row is ever selected.
         */
        const cells =
          typeof row.getVisibleCells === "function"
            ? row.getVisibleCells()
            : row.getAllCells();
        const selected =
          typeof row.getIsSelected === "function" && row.getIsSelected();

        return (
          <TableRow key={row.id} selected={selected}>
            {cells.map((cell) => (
              <TableCell key={cell.id} cell={cell} />
            ))}
          </TableRow>
        );
      })}
    </>
  );
};

/**
 * A `<tfoot>`. Renders one row per footer group when given no children — and
 * nothing at all when no column defines a `footer`, which is the common case and
 * the reason the generated table can include this unconditionally.
 */
const TableFoot = ({
  className,
  children,
  ...props
}: ITableFootProps): ReactElement | null => {
  const context = useTableContext("Foot");
  const variants = { ...context.variants, striped: false };
  const slots = tableStyle(variants);

  const hasFooters =
    children != null ||
    context.table
      .getLeafHeaders()
      .some((header) => header.column.columnDef.footer != null);

  if (!hasFooters) {
    return null;
  }

  return (
    <TableContext value={{ ...context, variants }}>
      <tfoot {...props} className={slots.foot({ class: className })}>
        {children ??
          context.table.getFooterGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableCell key={header.id} footer={header} />
              ))}
            </TableRow>
          ))}
      </tfoot>
    </TableContext>
  );
};

export {
  TableBody,
  TableCell,
  TableEmpty,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
};
