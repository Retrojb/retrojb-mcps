import type { ComponentPropsWithRef, ReactNode } from "react";

import type {
  Cell,
  CellData,
  Header,
  RowData,
  StockFeatures,
  Table as TanStackTable,
  TableFeatures,
} from "@tanstack/react-table";

import type { TableVariants } from "./styles";

/*
 * The all-features view of a TanStack object.
 *
 * TanStack Table v9 gates its APIs on the features a table registers:
 * `column.getCanSort()` exists on `Table<TFeatures, TData>` only when
 * `TFeatures` contains `rowSortingFeature`, and `row.getVisibleCells()` only
 * when it contains `columnVisibilityFeature`. That is the point of the design,
 * and it is why a v9 table only bundles the code it uses.
 *
 * These components are generic over `TFeatures`, so at compile time they cannot
 * know which features a caller registered — but at runtime they can look,
 * because v9 assigns feature methods to the shared row/column/cell prototypes.
 * Widening to `StockFeatures` at the component boundary is what makes that check
 * expressible; every access behind one is guarded by an `in` test, and the
 * component degrades to the core API when the feature is absent.
 *
 * `RowData` for the data parameter for the same reason: the components read
 * cells through `FlexRender` and never touch a field of `TData` themselves.
 */
type AnyTable = TanStackTable<StockFeatures, RowData>;
type AnyHeader = Header<StockFeatures, RowData>;
type AnyCell = Cell<StockFeatures, RowData>;

/** The variants a table sets once and every cell and row below it inherits. */
type TableSharedVariants = Pick<
  TableVariants,
  "size" | "bordered" | "striped" | "stickyHeader"
>;

/**
 * What `<Table>` hands down to its parts.
 *
 * The variants travel as values rather than as a computed slots object because
 * cells and rows add their own — `align` on a cell, `selected` on a row — and a
 * slots object is already resolved by the time they see it.
 */
interface ITableContextValue {
  readonly table: AnyTable;

  /**
   * How many columns a full-width cell has to span.
   *
   * Read from `getLeafHeaders()`, which is core and already reflects column
   * visibility, so it stays correct without requiring `columnVisibilityFeature`.
   */
  readonly columnCount: number;

  readonly variants: TableSharedVariants;
}

interface ITableProps<TFeatures extends TableFeatures, TData extends RowData>
  extends
    ComponentPropsWithRef<"table">,
    Pick<
      TableVariants,
      "size" | "bordered" | "striped" | "stickyHeader" | "captionHidden"
    > {
  /** The instance from TanStack's `useTable`. */
  readonly table: TanStackTable<TFeatures, TData>;

  /**
   * The table's `<caption>`. Required, deliberately.
   *
   * A table with no caption has no accessible name, which leaves a screen
   * reader user landing in a grid of numbers with nothing saying what they are
   * (WCAG 1.3.1, and 2.4.6 for the missing heading). Making this a required prop
   * means the type checker catches it, rather than an audit catching it later.
   * Use `captionHidden` when the design has no room for visible caption text —
   * the caption still names the table, and still labels the scroll region.
   */
  readonly caption: ReactNode;

  /**
   * The rows, as composed parts. Omit it and the table renders
   * `<Table.Head>`, `<Table.Body>` and `<Table.Foot>` from the instance.
   */
  readonly children?: ReactNode;

  /** Scroll container class. `className` goes to the `<table>` itself. */
  readonly rootClassName?: string;

  /** `<caption>` class. */
  readonly captionClassName?: string;
}

interface ITableHeadProps extends ComponentPropsWithRef<"thead"> {
  /** The header rows. Omit them to render one row per header group. */
  readonly children?: ReactNode;
}

interface ITableBodyProps extends ComponentPropsWithRef<"tbody"> {
  /** The body rows. Omit them to render one row per row in the row model. */
  readonly children?: ReactNode;

  /**
   * What to show when the row model is empty. Only used by the generated body —
   * supply `<Table.Empty>` yourself when composing rows by hand.
   */
  readonly emptyState?: ReactNode;
}

interface ITableFootProps extends ComponentPropsWithRef<"tfoot"> {
  /**
   * The footer rows. Omit them to render one row per footer group — and nothing
   * at all when no column defines a `footer`, which is the common case.
   */
  readonly children?: ReactNode;
}

interface ITableRowProps
  extends ComponentPropsWithRef<"tr">, Pick<TableVariants, "selected"> {}

interface ITableHeaderCellProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>
  extends
    Omit<ComponentPropsWithRef<"th">, "align">,
    Pick<TableVariants, "align"> {
  /**
   * The header to render. Supplying it is what turns the cell into a sortable
   * control when its column can sort, and it takes the place of `children`.
   */
  readonly header?: Header<TFeatures, TData, TValue>;
}

interface ITableCellProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>
  extends
    Omit<ComponentPropsWithRef<"td">, "align">,
    Pick<TableVariants, "align"> {
  /** The cell to render. Takes the place of `children`. */
  readonly cell?: Cell<TFeatures, TData, TValue>;

  /**
   * A footer to render instead. Mirrors TanStack's own `FlexRender`, where
   * `cell`, `header` and `footer` are three ways of naming the same job.
   */
  readonly footer?: Header<TFeatures, TData, TValue>;
}

interface ITableEmptyProps extends ComponentPropsWithRef<"td"> {
  /** `<tr>` class. `className` goes to the spanning `<td>`. */
  readonly rowClassName?: string;
}

export type {
  AnyCell,
  AnyHeader,
  AnyTable,
  ITableBodyProps,
  ITableCellProps,
  ITableContextValue,
  ITableEmptyProps,
  ITableFootProps,
  ITableHeadProps,
  ITableHeaderCellProps,
  ITableProps,
  ITableRowProps,
  TableSharedVariants,
};
