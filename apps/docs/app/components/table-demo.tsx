"use client";

/*
 * A live `Table`, for the gallery.
 *
 * A client component because `useTable` is a hook, and the only one on this page.
 * Everything else in the gallery renders on the server — `Button`, `Input` and
 * `Link` are client modules but take no state, and `tableStyle()` carries no
 * directive at all.
 */

import { Table } from "@retrojb/ui";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

/*
 * Module scope, and it has to be: TanStack v9 only ships the code for the features
 * a table registers, and a fresh features object on every render would invalidate
 * every data-dependent row model.
 *
 * `columnMeta` is a type-only slot. It declares the shape of `columnDef.meta` for
 * this table without the global declaration merging v8 needed, and `Table` reads
 * `meta.align` off a column when a cell was not given an `align` of its own —
 * which is the only way a generated cell can know to end-align a number.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  columnMeta: {} as { readonly align?: "start" | "center" | "end" },
});

interface Criterion {
  readonly id: string;
  readonly name: string;
  readonly level: string;
  readonly ratio: number;
}

const ROWS: Criterion[] = [
  { id: "1.4.3", name: "Contrast (Minimum)", level: "AA", ratio: 4.5 },
  { id: "1.4.6", name: "Contrast (Enhanced)", level: "AAA", ratio: 7 },
  { id: "1.4.11", name: "Non-text Contrast", level: "AA", ratio: 3 },
  { id: "2.5.8", name: "Target Size (Minimum)", level: "AA", ratio: 24 },
];

const helper = createColumnHelper<typeof features, Criterion>();

const columns = helper.columns([
  helper.accessor("id", { header: "Criterion" }),
  helper.accessor("name", { header: "Name" }),
  helper.accessor("level", { header: "Level" }),
  helper.accessor("ratio", {
    header: "Threshold",
    meta: { align: "end" },
    cell: (info) => {
      const value = info.getValue();
      return value >= 24 ? `${value}px` : `${value}:1`;
    },
  }),
]);

export function TableDemo(): React.ReactElement {
  const table = useTable({
    features,
    columns,
    data: ROWS,
    // 'none' -> 'desc' -> 'asc' -> 'none' leaves a third state that looks and
    // sounds identical to the first.
    enableSortingRemoval: false,
  });

  return (
    <Table
      table={table}
      caption="WCAG thresholds this site quotes, sortable by any column"
      striped
    />
  );
}
