"use client";

import { useCallback, useState } from "react";

interface IUseControllableStateOptions<T> {
  /**
   * The controlled value. `undefined` means "uncontrolled" — so a genuinely
   * optional controlled value has to be modelled with a sentinel (`null`, an
   * empty string) rather than `undefined`, which is why `ComboBox` uses `null`
   * for "nothing selected".
   */
  readonly value?: T | undefined;

  /** Used while uncontrolled. Read once, on mount. */
  readonly defaultValue: T;

  /** Called on every change, controlled or not. */
  readonly onChange?: ((next: T) => void) | undefined;
}

/**
 * One piece of state that may be controlled by the caller or owned internally.
 *
 * `ComboBox` has three of these — the committed selection, the text in the
 * field, and whether the listbox is open — and they have to be independently
 * controllable. An app that filters a table from the combobox needs `value`;
 * one that syncs the query to the URL needs `inputValue`; one that keeps the
 * list open while a side panel loads needs `open`. Collapsing them into a single
 * controlled/uncontrolled switch would force a caller who wants one to manage
 * all three.
 *
 * `onChange` fires in both modes, which is the part that is easy to get wrong.
 * Skipping it while uncontrolled is a common shortcut and it means an
 * uncontrolled caller cannot observe its own component.
 *
 * No functional-updater form (`set(previous => next)`) on purpose: it cannot be
 * distinguished from setting a value that is itself a function without a
 * sentinel, and none of the state here needs it — the updates are all computed
 * from values the caller already holds.
 */
const useControllableState = <T>({
  value,
  defaultValue,
  onChange,
}: IUseControllableStateOptions<T>): readonly [T, (next: T) => void] => {
  const [internal, setInternal] = useState<T>(defaultValue);

  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const setValue = useCallback(
    (next: T): void => {
      /*
       * While controlled the internal state is deliberately left alone. Writing
       * to both means two sources of truth, and they diverge the moment the
       * caller declines to apply a change — a parent that validates and rejects
       * a selection would get a component showing the rejected value.
       */
      if (!isControlled) {
        setInternal(next);
      }

      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [current, setValue];
};

export { useControllableState };
export type { IUseControllableStateOptions };
