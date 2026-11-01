"use client";

import {
  useCallback,
  useId,
  useMemo,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { DynamicContainer } from "../../containers/dynamicContainer/DynamicContainer";
import { Radio } from "../Radio/Radio";
import { RadioGroupContext } from "./context";
import { radioGroupStyles } from "./styles";
import type { IRadioGroupContextValue, IRadioGroupProps } from "./types";

/**
 * A labelled set of radio buttons with one `string` value.
 *
 * ```tsx
 * <RadioGroup
 *   label="Delivery"
 *   name="delivery"
 *   defaultValue="standard"
 *   options={[
 *     { value: "standard", label: "Standard", description: "3–5 working days." },
 *     { value: "express", label: "Express", description: "Next working day." },
 *   ]}
 * />
 * ```
 *
 * Or composed, when the options need markup an array cannot carry:
 *
 * ```tsx
 * <RadioGroup label="Delivery" name="delivery">
 *   <Radio value="standard" label="Standard" />
 *   <Radio value="express" label="Express" />
 * </RadioGroup>
 * ```
 *
 * The radios are laid out by `DynamicContainer`: stacked by default,
 * `orientation="horizontal"` for a wrapping row. `gap` passes through to it.
 *
 *
 * WHY A FIELDSET WITH `role="radiogroup"`
 *
 * The reasoning `SegmentedControl` gives. `<fieldset>` + `<legend>` gives a
 * group label and a `disabled` that reaches every radio inside it natively,
 * composed children included. ARIA in HTML allows `radiogroup` on a fieldset,
 * so the group announces as a radio group rather than a generic group, and
 * because the role can replace the fieldset's native naming from its legend in
 * some engines, the legend is also wired with `aria-labelledby`.
 *
 *
 * WHY THE DOM OWNS AN UNCONTROLLED SELECTION
 *
 * `SegmentedControl` and `CheckboxGroup` keep their value in
 * `useControllableState` in both modes, and pay for it: `form.reset()` resets
 * the inputs but not the React state, so the two disagree. A radio group does
 * not need that state. Uncontrolled, each radio gets `defaultChecked` from
 * `defaultValue` and the browser holds the selection from then on — exactly
 * one checked radio per `name` is something the DOM already guarantees — so
 * `form.reset()` restores `defaultValue` natively. Controlled, each radio gets
 * `checked` from `value`. `onValueChange` is called from the radios' `change`
 * events in both modes. The one thing the uncontrolled group cannot do is
 * tell you about a reset: the browser fires no `change` for it.
 *
 *
 * HOME / END, AND NOTHING ELSE
 *
 * The browser already handles the radio-group keyboard contract: one tab stop
 * (the checked radio, or the first enabled one when none is), arrow keys that
 * move *and* select in either direction, wrap at the ends, skip disabled radios
 * and follow `dir="rtl"`. None of that is reimplemented. Home / End, which the
 * platform does not do, jump to and select the first / last enabled radio, as
 * on `SegmentedControl`, so the two radio-based controls in this package answer
 * the same keys. Selection goes through `click()` on the target radio rather
 * than through state, which is what keeps the uncontrolled mode DOM-owned: the
 * browser checks the radio and fires its `change`, as for a pointer click.
 */
const RadioGroup = ({
  label,
  description,
  error,
  options,
  children,
  value,
  defaultValue,
  onValueChange,
  name,
  required = false,
  disabled,
  size,
  orientation = "vertical",
  gap,
  labelHidden,
  className,
  onKeyDown,
  "aria-describedby": ariaDescribedBy,
  ...props
}: IRadioGroupProps): ReactElement => {
  const generatedId = useId();
  const legendId = `${generatedId}-label`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;
  const groupName = name ?? `${generatedId}-name`;

  const hasError = error != null && error !== false;
  const hasDescription = description != null && description !== false;
  const slots = radioGroupStyles({ labelHidden });

  const select = useCallback(
    (next: string): void => {
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const context = useMemo<IRadioGroupContextValue>(
    () => ({
      name: groupName,
      value,
      defaultValue,
      select,
      required,
      invalid: hasError,
      size,
    }),
    [groupName, value, defaultValue, select, required, hasError, size],
  );

  /*
   * Only acts on keys pressed on one of this group's own radios, with no
   * modifier held, and only when the caller's `onKeyDown` has not already
   * handled the event — the same guards as `SegmentedControl`.
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
    // A no-op on a radio that is already checked: no `change` fires.
    next.click();
  };

  // Error first, then description, then the caller's — the order `Input` uses.
  const describedBy =
    [
      hasError ? errorId : null,
      hasDescription ? descriptionId : null,
      ariaDescribedBy,
    ]
      .filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      )
      .join(" ") || undefined;

  return (
    <RadioGroupContext value={context}>
      <fieldset
        {...props}
        role="radiogroup"
        disabled={disabled}
        aria-labelledby={legendId}
        aria-describedby={describedBy}
        onKeyDown={handleKeyDown}
        className={slots.root({ class: className })}
      >
        <legend id={legendId} className={slots.legend()}>
          {label}
          {required ? (
            // The members carry the real `required`; this marker is decorative.
            <span aria-hidden="true"> *</span>
          ) : null}
        </legend>
        <div className={slots.body()}>
          {hasDescription ? (
            <p className={slots.description()} id={descriptionId}>
              {description}
            </p>
          ) : null}
          {hasError ? (
            <p className={slots.error()} id={errorId}>
              {error}
            </p>
          ) : null}
          <DynamicContainer direction={orientation} gap={gap}>
            {options?.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                disabled={option.disabled}
              />
            ))}
            {children}
          </DynamicContainer>
        </div>
      </fieldset>
    </RadioGroupContext>
  );
};

export { RadioGroup };
