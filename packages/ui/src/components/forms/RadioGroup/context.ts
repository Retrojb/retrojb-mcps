"use client";
/*
 * The channel between a `RadioGroup` and the `Radio` elements inside it.
 *
 * A radio inside a group takes the group's `name`, required state, invalid
 * state and size, and reports a selection back. When the group is controlled
 * it also reads its checked state from the group's `value`; when it is not, it
 * takes `defaultChecked` from the group's `defaultValue` and the DOM owns the
 * selection from there. That is what lets a group be composed from `<Radio>`
 * children with arbitrary markup between them, rather than only from an
 * `options` array.
 *
 * Falls back to `null` rather than throwing, like `CheckboxGroup`'s context. A
 * radio outside a group is still a complete control; radios that share a
 * `name` form a native group on their own.
 *
 * `"use client"` because `createContext` cannot run in a server component.
 */
import { createContext, useContext } from "react";
import type { IRadioGroupContextValue } from "./types";

const RadioGroupContext = createContext<IRadioGroupContextValue | null>(null);

const useRadioGroupContext = (): IRadioGroupContextValue | null =>
  useContext(RadioGroupContext);

export { RadioGroupContext, useRadioGroupContext };
