"use client";
/*
 * The channel between a `TabGroup` and its tab list, tabs and panels.
 *
 * The parts share the selection, the variants and — the reason the API is
 * compound at all — the group's generated id. Every tab and panel id is derived
 * from that id and the part's `value`, so `<Tab value="a">` and
 * `<TabPanel value="a">` find each other wherever they sit in the markup, with
 * no ids for the caller to invent and keep in step.
 *
 * Throws outside a group, like `Table`'s context and unlike `Card`'s. A tab
 * outside a group has lost what makes it a tab: its selection, its keyboard
 * contract and the panel it controls. Rendering it anyway would produce a
 * `role="tab"` that points at nothing, which is a harder bug to find than an
 * error on the first render.
 *
 * `"use client"` because `createContext` cannot run in a server component.
 */
import { createContext, useContext } from "react";
import type { ITabGroupContextValue } from "./types";

const TabGroupContext = createContext<ITabGroupContextValue | null>(null);

/** Reads the surrounding `<TabGroup>`, or throws naming the orphaned part. */
const useTabGroupContext = (part: string): ITabGroupContextValue => {
  const context = useContext(TabGroupContext);

  if (context === null) {
    throw new Error(`<${part}> must be rendered inside <TabGroup>.`);
  }

  return context;
};

/*
 * `encodeURIComponent` because an id may not contain whitespace and a `value`
 * may. It is injective, so two different values can never produce one id.
 */
const getTabId = (baseId: string, value: string): string =>
  `${baseId}-tab-${encodeURIComponent(value)}`;

const getPanelId = (baseId: string, value: string): string =>
  `${baseId}-panel-${encodeURIComponent(value)}`;

export { TabGroupContext, getPanelId, getTabId, useTabGroupContext };
