"use client";

/*
 * The channel between `<Table>` and its parts.
 *
 * A composite table has to share three things: the TanStack instance, so a part
 * can generate itself; the size and border variants, so a cell twelve levels
 * down looks like the table it is in; and the column count, so a full-width cell
 * knows what to span. Threading those through props would mean every caller
 * repeating them on every cell, which is the boilerplate this component exists
 * to remove.
 *
 * This module carries `"use client"` rather than leaving it to `Table.tsx`
 * alone: `createContext` cannot run in a server component, and a directive-free
 * module here would let one be imported into a server graph and fail at render
 * instead of at the boundary.
 */

import { createContext, useContext } from "react";

import type { ITableContextValue } from "./types";

const TableContext = createContext<ITableContextValue | null>(null);

/**
 * Reads the surrounding `<Table>`, or throws naming the part that is orphaned.
 *
 * The alternative — falling back to defaults — produces a table that renders
 * but silently ignores `size`, `striped` and the instance, which is a harder bug
 * to find than a thrown error at the first render.
 */
const useTableContext = (part: string): ITableContextValue => {
  const context = useContext(TableContext);

  if (context === null) {
    throw new Error(`<Table.${part}> must be rendered inside <Table>.`);
  }

  return context;
};

export { TableContext, useTableContext };
