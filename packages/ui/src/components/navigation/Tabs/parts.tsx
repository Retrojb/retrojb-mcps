"use client";
/*
 * The structural parts of a tab group: the list the tabs sit in, and the panels
 * they show.
 *
 * `Tab` has its own module, as the component the caller writes most. These two
 * are the rest of the compound and, like the card parts, read everything they
 * need from the surrounding `TabGroup`.
 */
import {
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { useIsomorphicLayoutEffect } from "../../../hooks/useIsomorphicLayoutEffect";
import { getPanelId, getTabId, useTabGroupContext } from "./context";
import { tabGroupStyles } from "./styles";
import type { ITabListProps, ITabPanelProps } from "./types";

/**
 * The tabs that belong to this list, in DOM order. Filtered by nearest
 * tablist, so a tab group nested inside a panel of this one is left alone.
 */
const ownTabs = (list: HTMLElement): HTMLButtonElement[] =>
  Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
    (tab) => tab.closest('[role="tablist"]') === list,
  );

/**
 * The `role="tablist"`, wrapped in a scroller for rows longer than their
 * container — see WHY THE LIST IS WRAPPED IN A SCROLLER in `styles.ts`.
 *
 *
 * THE KEYBOARD CONTRACT
 *
 * The APG tabs pattern, handled once here rather than on every tab:
 *
 *   - Left / Right (Up / Down when vertical) move focus to the previous / next
 *     enabled tab, wrapping at either end. Under `dir="rtl"` Left and Right
 *     swap, so Right always moves toward the start of the row as it reads.
 *   - Home / End move to the first / last enabled tab.
 *   - With `activation="automatic"` each of those also selects; with
 *     `"manual"` only focus moves, and Enter or Space — the native button
 *     activation, through `Tab`'s `onClick` — selects.
 *
 * Disabled tabs are skipped: a native-disabled button cannot take focus, so
 * they are filtered out before choosing where to go. Keys pressed with Alt,
 * Ctrl or Meta held are left alone, as is any event the caller's `onKeyDown`
 * already handled with `preventDefault()`.
 *
 *
 * THE TAB STOP SAFETY NET
 *
 * The list is one tab stop because only the selected tab has `tabIndex={0}`.
 * If no enabled tab is selected — no `defaultValue`, a value that matches no
 * tab, or a selected tab that is disabled — that leaves no tab stop at all,
 * and the whole group drops out of the tab order (2.1.1). After every render
 * this list checks for that case and gives the first enabled tab the stop
 * instead. It writes `tabIndex` on that one element only, and undoes it as
 * soon as a real selection exists, so in the normal case it does nothing.
 */
const TabList = ({
  className,
  rootClassName,
  children,
  onKeyDown,
  ref,
  "aria-label": ariaLabel,
  ...props
}: ITabListProps): ReactElement => {
  const { label, select, activation, orientation, size, fullWidth } =
    useTabGroupContext("TabList");
  const slots = tabGroupStyles({ orientation, size, fullWidth });

  /*
   * The list keeps its own ref and republishes the node to the caller's
   * through `useImperativeHandle` — the reason is in `hooks/useComboBox.ts`.
   * No dependency list, so a remounted node is never held stale.
   */
  const listRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => listRef.current!);

  const fallbackRef = useRef<HTMLButtonElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (list === null) {
      return;
    }
    const enabled = ownTabs(list).filter((tab) => !tab.disabled);
    const hasStop = enabled.some(
      (tab) => tab.getAttribute("aria-selected") === "true",
    );
    const fallback = hasStop ? null : (enabled[0] ?? null);
    const previous = fallbackRef.current;
    if (previous !== null && previous !== fallback) {
      // Back to what `Tab` rendered for it.
      previous.tabIndex =
        previous.getAttribute("aria-selected") === "true" ? 0 : -1;
    }
    if (fallback !== null) {
      fallback.tabIndex = 0;
    }
    fallbackRef.current = fallback;
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    const list = event.currentTarget;
    const { target } = event;
    if (
      !(target instanceof HTMLButtonElement) ||
      target.getAttribute("role") !== "tab" ||
      target.closest('[role="tablist"]') !== list
    ) {
      return;
    }

    const tabs = ownTabs(list).filter((tab) => !tab.disabled);
    const count = tabs.length;
    if (count === 0) {
      return;
    }
    const index = tabs.indexOf(target);
    const horizontal = orientation === "horizontal";
    const rtl = horizontal && getComputedStyle(list).direction === "rtl";
    const nextKey = horizontal
      ? rtl
        ? "ArrowLeft"
        : "ArrowRight"
      : "ArrowDown";
    const previousKey = horizontal
      ? rtl
        ? "ArrowRight"
        : "ArrowLeft"
      : "ArrowUp";

    let next: HTMLButtonElement | undefined;
    if (event.key === nextKey) {
      next = tabs[(index + 1) % count];
    } else if (event.key === previousKey) {
      next = tabs[index <= 0 ? count - 1 : index - 1];
    } else if (event.key === "Home") {
      next = tabs[0];
    } else if (event.key === "End") {
      next = tabs[count - 1];
    }
    if (next === undefined) {
      return;
    }

    // Also stops the arrow keys scrolling the scroller or the page.
    event.preventDefault();
    next.focus();
    const nextValue = next.dataset["value"];
    if (activation === "automatic" && nextValue !== undefined) {
      select(nextValue);
    }
  };

  return (
    <div className={slots.scroller({ class: rootClassName })}>
      <div
        {...props}
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel ?? label}
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={slots.list({ class: className })}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * The content one tab shows: a `role="tabpanel"` named by its tab through
 * `aria-labelledby`.
 *
 *
 * WHY EVERY PANEL IS A TAB STOP BY DEFAULT
 *
 * The APG asks for `tabindex="0"` on a panel whose first content is not
 * focusable, so that Tab from the tab list lands on the panel rather than
 * skipping past text a screen reader user may not know is there. Knowing
 * whether the first content is focusable means inspecting the panel's DOM
 * after every render, and the answer changes as the content does. So the
 * panel is always a tab stop, the same trade `CodeBlock` makes: one extra stop
 * in front of a panel that starts with a link is the version that cannot be
 * wrong. Pass `tabIndex={-1}` to a panel you know starts with a control.
 */
const TabPanel = ({
  value,
  tabIndex = 0,
  className,
  children,
  ...props
}: ITabPanelProps): ReactElement | null => {
  const {
    baseId,
    value: selectedValue,
    keepMounted,
    orientation,
    size,
    fullWidth,
  } = useTabGroupContext("TabPanel");
  const selected = selectedValue === value;

  if (!selected && !keepMounted) {
    return null;
  }

  return (
    <div
      {...props}
      role="tabpanel"
      id={getPanelId(baseId, value)}
      aria-labelledby={getTabId(baseId, value)}
      hidden={!selected}
      tabIndex={tabIndex}
      className={tabGroupStyles({ orientation, size, fullWidth }).panel({
        class: className,
      })}
    >
      {children}
    </div>
  );
};

export { TabList, TabPanel };
