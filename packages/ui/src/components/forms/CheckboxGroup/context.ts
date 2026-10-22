"use client";
/*
 * The channel between a `CheckboxGroup` and the `Checkbox` elements inside it.
 *
 * A checkbox with a `value` inside a group reads its checked state from the
 * group's `string[]` and reports changes back, and takes the group's `name`,
 * required state and invalid state. That is what lets a group be composed from
 * `<Checkbox>` children with arbitrary markup between them, rather than only
 * from an `options` array.
 *
 * Falls back to `null` rather than throwing, like `Card`'s context. A checkbox
 * outside a group has lost nothing — it is a complete control on its own.
 *
 * `"use client"` because `createContext` cannot run in a server component.
 */
import { createContext, useContext } from "react";
import type { ICheckboxGroupContextValue } from "./types";

const CheckboxGroupContext = createContext<ICheckboxGroupContextValue | null>(
  null,
);

const useCheckboxGroupContext = (): ICheckboxGroupContextValue | null =>
  useContext(CheckboxGroupContext);

export { CheckboxGroupContext, useCheckboxGroupContext };
