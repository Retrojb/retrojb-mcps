"use client";

import { useId, type ReactElement } from "react";

import type { RowData, TableFeatures } from "@tanstack/react-table";

import { TableContext } from "./context";
import {
  TableBody,
  TableCell,
  TableEmpty,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./parts";
import { tableStyle } from "./styles";
import type { AnyTable, ITableProps } from "./types";

/**
 * A data table, rendered from a TanStack Table v9 instance.
 *
 * The instance is a prop rather than something this component builds, because
 * every interesting thing about a table — which features are registered, where
 * the sorting state lives, whether filtering happens here or on a server — is a
 * decision TanStack already models well and a wrapper can only obscure. Build it
 * with `useTable` and hand it over:
 *
 * ```tsx
 * const table = useTable({ features, columns, data });
 *
 * <Table table={table} caption="Open invoices" />;
 * ```
 *
 * That renders the whole thing. When a column needs a checkbox, a row needs a
 * click handler, or the body needs a virtualiser, compose the parts instead —
 * they read the same instance and the same variants off the context, so a
 * hand-written row looks identical to a generated one:
 *
 * ```tsx
 * <Table table={table} caption="Open invoices" striped>
 *   <Table.Head />
 *   <Table.Body>
 *     {table.getRowModel().rows.map((row) => (
 *       <Table.Row key={row.id} selected={row.getIsSelected()}>
 *         {row.getVisibleCells().map((cell) => (
 *           <Table.Cell key={cell.id} cell={cell} />
 *         ))}
 *       </Table.Row>
 *     ))}
 *   </Table.Body>
 * </Table>
 * ```
 *
 * Mixing the two is the point: `<Table.Head />` above generates itself while the
 * body is written out by hand.
 */
const TableRoot = <TFeatures extends TableFeatures, TData extends RowData>({
  table,
  caption,
  captionHidden,
  size,
  bordered,
  striped,
  stickyHeader,
  className,
  rootClassName,
  captionClassName,
  children,
  ...props
}: ITableProps<TFeatures, TData>): ReactElement => {
  const generatedId = useId();
  const captionId = `${generatedId}-caption`;

  const variants = { size, bordered, striped, stickyHeader };
  const slots = tableStyle({ ...variants, captionHidden });

  // See the note on `AnyTable` in `types.ts`. One cast, at the boundary.
  const instance = table as unknown as AnyTable;

  return (
    <TableContext
      value={{
        table: instance,
        columnCount: instance.getLeafHeaders().length,
        variants,
      }}
    >
      {/*
       * `role="region"` with `tabIndex={0}` on the scroll container, named by the
       * caption.
       *
       * A horizontally scrolling box that is not focusable can only be scrolled
       * with a pointer, which fails WCAG 2.1.1 — and a table wide enough to
       * scroll is the normal case, not an edge one. `region` gives the resulting
       * tab stop a reason to exist when a screen reader lands on it, and it needs
       * an accessible name to be announced as anything at all, which is what
       * `aria-labelledby` is doing. The caption is the right name to reuse:
       * it already names the table, so the two cannot drift apart.
       */}
      <div
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
        className={slots.root({ class: rootClassName })}
      >
        <table {...props} className={slots.table({ class: className })}>
          {/*
           * `<caption>` has to be the first child of `<table>`, so it is
           * rendered here rather than left to a `<Table.Caption>` part that a
           * caller could put in the wrong place — or forget.
           */}
          <caption
            id={captionId}
            className={slots.caption({ class: captionClassName })}
          >
            {caption}
          </caption>

          {children ?? (
            <>
              <TableHead />
              <TableBody />
              <TableFoot />
            </>
          )}
        </table>
      </div>
    </TableContext>
  );
};

/*
 * The parts hang off the root as well as being exported on their own.
 *
 * `<Table.Head>` reads as markup and keeps the relationship visible at the call
 * site, which is worth something in a component whose children are the API. The
 * named exports stay because a `Table.Cell` passed to a virtualiser or wrapped in
 * a `memo()` is easier to name when it has a name.
 */
const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Body: TableBody,
  Foot: TableFoot,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
  Empty: TableEmpty,
});

export { Table };
