"use client";

import {
  useCallback,
  useId,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { segmentedControlStyles } from "./styles";
import type { ISegmentedControlProps } from "./types";

/**
 * A single choice from a short row of mutually exclusive segments.
 *
 * ```tsx
 * <SegmentedControl
 *   label="View"
 *   name="view"
 *   defaultValue="week"
 *   options={[
 *     { value: "day", label: "Day" },
 *     { value: "week", label: "Week" },
 *     { value: "month", label: "Month" },
 *   ]}
 * />
 * ```
 *
 *
 * WHY NATIVE RADIOS
 *
 * Each segment is an `<input type="radio">` drawn with `appearance-none`, all
 * sharing one `name`. That makes the browser responsible for the radio-group
 * keyboard contract: one tab stop (the selected segment, or the first enabled
 * one when nothing is selected), arrow keys that move *and* select, wrap at
 * either end, skip disabled segments and follow `dir="rtl"`. `FormData`,
 * `<fieldset disabled>` and `<label>` activation come with it. A row of
 * `<button role="radio">` with a roving `tabindex` would rebuild every one of
 * those by hand. The one key the platform does not handle is Home / End, which
 * the APG radio-group pattern adds; `handleKeyDown` below does that.
 *
 *
 * WHY A FIELDSET WITH `role="radiogroup"`
 *
 * As in `CheckboxGroup`, `<fieldset>` + `<legend>` gives a group label and a
 * `disabled` that reaches every radio inside it natively. ARIA in HTML allows
 * `radiogroup` on a fieldset, which makes the group announce as a radio group
 * rather than a generic group. The role replaces the fieldset's native naming
 * from its legend in some engines, so the legend is also wired with
 * `aria-labelledby`.
 *
 *
 * WHY `useControllableState`
 *
 * Unlike `Toggle`, the selection is React state in both modes, as in
 * `CheckboxGroup`: Home / End has to set it programmatically, and a value that
 * lived only in the DOM could not be. The trade-off is the same one
 * `CheckboxGroup` makes — `form.reset()` does not restore `defaultValue`.
 */
const SegmentedControl = ({
  label,
  options,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  name,
  disabled,
  size,
  fullWidth,
  labelHidden,
  className,
  onKeyDown,
  ...props
}: ISegmentedControlProps): ReactElement => {
  const generatedId = useId();
  const legendId = `${generatedId}-label`;
  const groupName = name ?? `${generatedId}-name`;
  const slots = segmentedControlStyles({ size, fullWidth, labelHidden });

  // The internal state admits `null` for "nothing selected"; the callback only
  // ever fires with a real value, because a radio cannot be unselected.
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
    defaultValue,
    onChange: handleValueChange,
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.checked) {
      setValue(event.target.value);
    }
  };

  /*
   * Home / End: jump to and select the first / last enabled segment. Arrow keys
   * are left to the browser — see the note above. Only acts on keys pressed on
   * one of this group's own radios, and only when the caller's `onKeyDown` has
   * not already handled the event.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>): void => {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      (event.key !== "Home" && event.key !== "End") ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    const { target } = event;
    if (!(target instanceof HTMLInputElement) || target.name !== groupName) {
      return;
    }
    const enabled = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]:enabled',
      ),
    ).filter((radio) => radio.name === groupName);
    const next = event.key === "Home" ? enabled[0] : enabled.at(-1);
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    next.focus();
    setValue(next.value);
  };

  return (
    <fieldset
      {...props}
      role="radiogroup"
      disabled={disabled}
      aria-labelledby={legendId}
      onKeyDown={handleKeyDown}
      className={slots.root({ class: className })}
    >
      <legend id={legendId} className={slots.legend()}>
        {label}
      </legend>
      <div className={slots.track()}>
        {options.map((option) => (
          <label key={option.value} className={slots.segment()}>
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={handleChange}
              className={slots.control()}
            />
            <span className={slots.text()}>{option.label}</span>
            {/*
             * Reserves the selected weight's width so selecting a segment never
             * shifts its neighbours. Hidden from assistive technology and
             * invisible, so the accessible name is the label once.
             */}
            <span className={slots.sizer()} aria-hidden="true">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export { SegmentedControl };
