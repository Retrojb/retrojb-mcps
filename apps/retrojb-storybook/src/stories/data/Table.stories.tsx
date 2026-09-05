import { useState } from "react";

import { Table } from "@retrojb/ui";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import type { Meta, StoryObj } from "@storybook/react-vite";

/*
 * The feature set, declared once at module scope.
 *
 * TanStack Table v9 only ships the code for the features a table registers, so
 * this object decides the table's bundle size as much as its capabilities. It
 * also has to be stable across renders — a fresh object invalidates every
 * data-dependent row model.
 *
 * `columnMeta` is a type-only slot: it declares the shape of `columnDef.meta` for
 * this table without the global declaration merging v8 needed. `Table` reads
 * `meta.align` off a column when a cell was not given an `align` of its own,
 * which is what lets the generated table end-align a column of figures.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
  rowSelectionFeature,
  columnMeta: {} as { readonly align?: "start" | "center" | "end" },
});

interface IInvoice {
  readonly id: string;
  readonly client: string;
  readonly status: "Paid" | "Overdue" | "Draft";
  readonly amount: number;
}

const INVOICES: IInvoice[] = [
  { id: "INV-1041", client: "Northwind Traders", status: "Paid", amount: 4200 },
  { id: "INV-1042", client: "Acme Corp", status: "Overdue", amount: 18750 },
  { id: "INV-1043", client: "Globex", status: "Draft", amount: 990 },
  { id: "INV-1044", client: "Initech", status: "Paid", amount: 6310 },
  {
    id: "INV-1045",
    client: "Umbrella Health",
    status: "Overdue",
    amount: 2400,
  },
];

// Module scope, not `[]` inline: a fresh fallback array every render would
// invalidate the row models every render.
const NO_INVOICES: IInvoice[] = [];

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const total = INVOICES.reduce((sum, invoice) => sum + invoice.amount, 0);

const helper = createColumnHelper<typeof features, IInvoice>();

const columns = helper.columns([
  helper.accessor("id", { header: "Invoice" }),
  helper.accessor("client", { header: "Client" }),
  helper.accessor("status", { header: "Status" }),
  helper.accessor("amount", {
    header: "Amount",
    meta: { align: "end" },
    cell: (info) => currency.format(info.getValue()),
    footer: () => currency.format(total),
  }),
]);

/*
 * The story subject.
 *
 * `Table` takes an instance and an instance comes from a hook, so the stories
 * need a component to call it in. Everything except `table` is a control, which
 * is the part worth changing in the canvas.
 */
interface ITableDemoProps {
  readonly caption: string;
  readonly captionHidden?: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly bordered?: boolean;
  readonly striped?: boolean;
  readonly stickyHeader?: boolean;
  readonly data?: IInvoice[];
  readonly enableSorting?: boolean;
}

const TableDemo = ({
  data = INVOICES,
  enableSorting = true,
  ...props
}: ITableDemoProps) => {
  const table = useTable({
    features,
    columns,
    data,
    enableSorting,
    // 'none' -> 'desc' -> 'asc' -> 'none' leaves a third state that looks and
    // sounds identical to the first. Two states are easier to announce.
    enableSortingRemoval: false,
  });

  return <Table {...props} table={table} />;
};

const meta = {
  title: "Data/Table",
  component: TableDemo,
  parameters: {
    // Not `centered`: the table is `width: 100%` of its container, and a centring
    // flex container collapses that to the content width.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    caption: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    captionHidden: { control: "boolean" },
    bordered: { control: "boolean" },
    striped: { control: "boolean" },
    stickyHeader: { control: "boolean" },
    enableSorting: { control: "boolean" },
    data: { table: { disable: true } },
  },
  args: {
    caption: "Open invoices, most recent first",
  },
} satisfies Meta<typeof TableDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The whole table from one prop: `<Table table={table} caption="…" />`.
 *
 * The head, the body and — because the amount column defines a `footer` — the
 * foot are all generated from the instance. The headers are sort controls because
 * this instance registered `rowSortingFeature`, not because the component was
 * told to make them one. Activate a header and listen to how `aria-sort` changes.
 *
 * The amount column is end-aligned from `meta.align` on its column definition.
 */
export const Primary: Story = {};

/**
 * The same component and the same columns, with sorting switched off on the
 * instance. The headers render as plain text, with no button and no `aria-sort` —
 * the component follows what the table can actually do.
 */
export const NotSortable: Story = {
  args: {
    enableSorting: false,
  },
};

/** Zebra striping and vertical rules, for tables wide enough to lose your place in. */
export const StripedAndBordered: Story = {
  args: {
    striped: true,
    bordered: true,
  },
};

/** The compact scale. Row heights track `Button` and `Input` at 36/40/48px. */
export const Small: Story = {
  args: {
    size: "sm",
  },
};

/**
 * A caption that names the table for assistive technology without occupying
 * space in the layout. It still labels the scroll region.
 */
export const HiddenCaption: Story = {
  args: {
    captionHidden: true,
  },
};

/**
 * An empty row model renders a message spanning every column, rather than a
 * `<tbody>` with nothing in it — which reads as broken instead of empty.
 */
export const Empty: Story = {
  args: {
    data: NO_INVOICES,
  },
};

/**
 * The composite form, with a selection column the table does not own.
 *
 * `<Table.Head>` is written out by hand here so the checkbox column can be added
 * in front of the generated ones, and the body is written out so each row can
 * carry its selected state. Everything still reads its size, striping and
 * alignment off the same context, so a hand-written cell is indistinguishable
 * from a generated one.
 *
 * Selection is conveyed by the checkbox rather than by the tint. `aria-selected`
 * is not available on a row inside a `table` — ARIA supports it only inside a
 * `grid` — so a background colour on its own would leave the state invisible to a
 * screen reader and would fail 1.4.1 besides.
 */
export const Composed: Story = {
  args: {
    striped: true,
  },
  render: (args) => <ComposedDemo {...args} />,
};

const ComposedDemo = ({ data = INVOICES, ...props }: ITableDemoProps) => {
  /*
   * `RowSelectionState`, not `Record<string, boolean>`. In v9 the map only holds
   * selected rows, so its values are `true` rather than `boolean` — the wider
   * type does not assign to it in either direction.
   */
  const [selection, setSelection] = useState<RowSelectionState>({});

  const table = useTable({
    features,
    columns,
    data,
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
  });

  return (
    <Table {...props} table={table}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>
            <span className="sr-only">Select</span>
          </Table.HeaderCell>

          {/*
           * `getLeafHeaders()` rather than `getHeaderGroups()`, because these
           * columns are flat and this header is one row. Reach for header groups
           * when columns are nested.
           */}
          {table.getLeafHeaders().map((header) => (
            <Table.HeaderCell key={header.id} header={header} />
          ))}
        </Table.Row>
      </Table.Head>

      <Table.Body>
        {table.getRowModel().rows.map((row) => (
          <Table.Row key={row.id} selected={row.getIsSelected()}>
            <Table.Cell>
              <input
                type="checkbox"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
                aria-label={`Select invoice ${row.original.id}`}
              />
            </Table.Cell>

            {row.getAllCells().map((cell) => (
              <Table.Cell key={cell.id} cell={cell} />
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};
