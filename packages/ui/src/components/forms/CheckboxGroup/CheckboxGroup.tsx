"use client";

import { useCallback, useId, useMemo, type ReactElement } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { DynamicContainer } from "../../containers/dynamicContainer/DynamicContainer";
import { Checkbox } from "../Checkbox/Checkbox";
import { CheckboxGroupContext } from "./context";
import { checkboxGroupStyles } from "./styles";
import type { ICheckboxGroupContextValue, ICheckboxGroupProps } from "./types";

/** Stable default, so an uncontrolled group without `defaultValue` has one. */
const EMPTY: readonly string[] = [];

/**
 * A labelled set of checkboxes with one `string[]` value.
 *
 * ```tsx
 * <CheckboxGroup
 *   label="Notify me by"
 *   name="channels"
 *   options={[
 *     { value: "email", label: "Email" },
 *     { value: "sms", label: "Text message" },
 *   ]}
 * />
 * ```
 *
 * Or composed, when the options need markup an array cannot carry:
 *
 * ```tsx
 * <CheckboxGroup label="Notify me by" name="channels">
 *   <Checkbox value="email" label="Email" />
 *   <Checkbox value="sms" label="Text message" description="Carrier rates apply." />
 * </CheckboxGroup>
 * ```
 *
 * The checkboxes are laid out by `DynamicContainer` — stacked below `sm`, in a
 * wrapping row from `sm` up — and `direction`, `gap` and `responsiveTo` pass
 * through to it.
 *
 *
 * WHY A FIELDSET
 *
 * `<fieldset>` + `<legend>` is the native group: the legend is the group's
 * accessible name and is announced on entering it, with no `role="group"` or
 * `aria-labelledby` to keep in step. It also gives `disabled` for free — a
 * disabled fieldset disables every control inside it, natively, including any
 * composed `children` the group knows nothing about.
 *
 *
 * WHY `required` IS COMPUTED
 *
 * Native `required` on a checkbox means that one box must be checked, so
 * copying it onto every member would demand all of them. The group sets it on
 * every member only while none is checked; the browser's own validation then
 * blocks submission until at least one is, and lifts as soon as one is. No
 * custom validity, no submit handler.
 */
const CheckboxGroup = ({
  label,
  description,
  error,
  options,
  children,
  value: valueProp,
  defaultValue = EMPTY,
  onValueChange,
  name,
  required = false,
  disabled,
  selectAllLabel,
  direction = "responsive",
  gap,
  responsiveTo,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: ICheckboxGroupProps): ReactElement => {
  const generatedId = useId();
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const hasError = error != null && error !== false;
  const hasDescription = description != null && description !== false;
  const slots = checkboxGroupStyles();

  /*
   * The public callback takes a mutable `string[]`, the internal state is
   * `readonly`. Copying on the way out keeps a caller who sorts or pushes onto
   * the array from mutating the group's state behind its back.
   */
  const handleValueChange = useCallback(
    (next: readonly string[]): void => {
      onValueChange?.([...next]);
    },
    [onValueChange],
  );
  const [value, setValue] = useControllableState<readonly string[]>({
    value: valueProp,
    defaultValue,
    onChange: handleValueChange,
  });

  const toggle = useCallback(
    (item: string, checked: boolean): void => {
      if (checked === value.includes(item)) {
        return;
      }
      setValue(
        checked ? [...value, item] : value.filter((entry) => entry !== item),
      );
    },
    [value, setValue],
  );

  const context = useMemo<ICheckboxGroupContextValue>(
    () => ({
      name,
      value,
      toggle,
      required: required && value.length === 0,
      invalid: hasError,
    }),
    [name, value, toggle, required, hasError],
  );

  /*
   * Select all acts on the enabled options only. A disabled option the user
   * cannot change keeps whatever state it has; clearing it from here would be
   * changing a control the UI says is locked.
   */
  const enabledValues = (options ?? [])
    .filter((option) => option.disabled !== true)
    .map((option) => option.value);
  const checkedEnabled = enabledValues.filter((entry) =>
    value.includes(entry),
  ).length;
  const allChecked =
    enabledValues.length > 0 && checkedEnabled === enabledValues.length;
  const someChecked = checkedEnabled > 0 && !allChecked;
  const showSelectAll =
    selectAllLabel != null && selectAllLabel !== false && options != null;

  const handleSelectAll = (checked: boolean): void => {
    const kept = value.filter((entry) => !enabledValues.includes(entry));
    setValue(checked ? [...kept, ...enabledValues] : kept);
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
    <CheckboxGroupContext value={context}>
      <fieldset
        {...props}
        disabled={disabled}
        aria-describedby={describedBy}
        className={slots.root({ class: className })}
      >
        <legend className={slots.legend()}>
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
          {showSelectAll ? (
            /*
             * No `value` and no `name`: it is not a member and submits nothing.
             * The native `indeterminate` property reports "mixed" while some —
             * not all — options are checked.
             */
            <Checkbox
              label={selectAllLabel}
              checked={allChecked}
              indeterminate={someChecked}
              disabled={enabledValues.length === 0}
              onCheckedChange={handleSelectAll}
            />
          ) : null}
          <DynamicContainer
            direction={direction}
            gap={gap}
            responsiveTo={responsiveTo}
            // Indented under the parent so the hierarchy is visible.
            className={showSelectAll ? "ps-(--spacing-80)" : undefined}
          >
            {options?.map((option) => (
              <Checkbox
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
    </CheckboxGroupContext>
  );
};

export { CheckboxGroup };
