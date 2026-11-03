"use client";

import { type MouseEvent, type ReactElement } from "react";
import { getPanelId, getTabId, useTabGroupContext } from "./context";
import { tabGroupStyles } from "./styles";
import type { ITabProps } from "./types";

/**
 * One tab: a `<button role="tab">` inside a `TabList`.
 *
 * ```tsx
 * <Tab value="billing">Billing</Tab>
 * ```
 *
 *
 * WHY A BUTTON
 *
 * A native `<button type="button">` brings Enter and Space activation, the
 * native `disabled` (out of the tab order, not clickable) and focusability
 * without a `tabindex` of its own. `role="tab"` replaces only the role. The
 * roving `tabIndex` — 0 on the selected tab, -1 on the rest — is what makes
 * the whole list one tab stop; the arrow keys that move between tabs live on
 * `TabList`, which can see all of them.
 *
 * Activation runs through `onClick`, which the browser fires for a click, an
 * Enter and a Space alike, so manual activation needs no key handling here. A
 * caller's `onClick` runs first and can veto the selection with
 * `preventDefault()`.
 */
const Tab = ({
  value,
  disabled,
  className,
  children,
  onClick,
  ...props
}: ITabProps): ReactElement => {
  const {
    baseId,
    value: selectedValue,
    select,
    keepMounted,
    orientation,
    size,
    fullWidth,
  } = useTabGroupContext("Tab");
  const slots = tabGroupStyles({ orientation, size, fullWidth });
  const selected = selectedValue === value;

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      select(value);
    }
  };

  return (
    <button
      {...props}
      type="button"
      role="tab"
      id={getTabId(baseId, value)}
      aria-selected={selected}
      // An unmounted panel has no id to point at; see `keepMounted`.
      aria-controls={
        selected || keepMounted ? getPanelId(baseId, value) : undefined
      }
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      // Read by `TabList`'s keyboard handler to select the tab it moves to.
      data-value={value}
      onClick={handleClick}
      className={slots.tab({ class: className })}
    >
      <span className={slots.text()}>{children}</span>
      {/*
       * Reserves the selected weight's width so selecting a tab never shifts
       * its neighbours. Hidden from assistive technology and invisible, so the
       * accessible name is the label once.
       */}
      <span className={slots.sizer()} aria-hidden="true">
        {children}
      </span>
    </button>
  );
};

export { Tab };
