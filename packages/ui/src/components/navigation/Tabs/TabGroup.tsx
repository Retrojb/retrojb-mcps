"use client";

import { useCallback, useId, useMemo, type ReactElement } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { TabGroupContext } from "./context";
import { tabGroupStyles } from "./styles";
import type { ITabGroupContextValue, ITabGroupProps } from "./types";

/**
 * A set of panels, one shown at a time, chosen from a row (or column) of tabs.
 * The WAI-ARIA APG Tabs pattern.
 *
 * ```tsx
 * <TabGroup label="Account settings" defaultValue="profile">
 *   <TabList>
 *     <Tab value="profile">Profile</Tab>
 *     <Tab value="billing">Billing</Tab>
 *   </TabList>
 *   <TabPanel value="profile">…</TabPanel>
 *   <TabPanel value="billing">…</TabPanel>
 * </TabGroup>
 * ```
 *
 *
 * WHY A COMPOUND API
 *
 * A tab and its panel are linked both ways — `aria-controls` on the tab,
 * `aria-labelledby` on the panel — and both ids have to agree. An `items`
 * array would guarantee that, but panels are arbitrary content, often large,
 * and an array of JSX blobs is awkward to read and impossible to place: a
 * toolbar between the list and the panels, or panels inside a card, cannot be
 * expressed. Compound parts keep the markup free, and the ids still cannot
 * drift, because no part takes an `id`. Each is derived from the group's
 * `useId` and the shared `value` — see `context.ts`.
 *
 *
 * WHY `TabGroup` AND `TabList` ARE SEPARATE ELEMENTS
 *
 * `TabGroup` is a plain container with no role. The APG pattern has no
 * "tabs" role around the list and the panels, and adding `role="group"` would
 * only add an announcement. The `role="tablist"` element is `TabList`, because
 * only the tabs belong inside it — a panel inside a tablist is invalid. The
 * group's `label` is carried to it through context.
 *
 *
 * WHY `useControllableState`
 *
 * The same reasoning as `SegmentedControl`: automatic activation has to set
 * the selection from a key press, so it is React state in both modes. The
 * callback only fires on a real change, so clicking the selected tab again
 * does not report a selection nobody made.
 */
const TabGroup = ({
  label,
  value: valueProp,
  defaultValue,
  onValueChange,
  activation = "automatic",
  keepMounted = true,
  orientation = "horizontal",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: ITabGroupProps): ReactElement => {
  const baseId = useId();
  const slots = tabGroupStyles({ orientation, size, fullWidth });

  // `null` is "nothing selected"; the callback only ever carries a real value.
  const handleValueChange = useCallback(
    (next: string | null): void => {
      if (next !== null) {
        onValueChange?.(next);
      }
    },
    [onValueChange],
  );
  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue: defaultValue ?? null,
    onChange: handleValueChange,
  });

  const select = useCallback(
    (next: string): void => {
      if (next !== value) {
        setValue(next);
      }
    },
    [value, setValue],
  );

  const context = useMemo<ITabGroupContextValue>(
    () => ({
      baseId,
      label,
      value,
      select,
      activation,
      keepMounted,
      orientation,
      size,
      fullWidth,
    }),
    [
      baseId,
      label,
      value,
      select,
      activation,
      keepMounted,
      orientation,
      size,
      fullWidth,
    ],
  );

  return (
    <TabGroupContext value={context}>
      <div {...props} className={slots.root({ class: className })}>
        {children}
      </div>
    </TabGroupContext>
  );
};

export { TabGroup };
