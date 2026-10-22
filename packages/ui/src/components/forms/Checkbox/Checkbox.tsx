"use client";

import {
  useId,
  useImperativeHandle,
  useRef,
  type ChangeEvent,
  type ReactElement,
} from "react";
import { useIsomorphicLayoutEffect } from "../../../hooks/useIsomorphicLayoutEffect";
import { useCheckboxGroupContext } from "../CheckboxGroup/context";
import { checkboxStyles } from "./styles";
import type { ICheckboxProps } from "./types";

/**
 * A labelled native checkbox, with description and error text wired up.
 *
 * ```tsx
 * <Checkbox label="Email me about new releases" name="releases" />
 * ```
 *
 * The `<input type="checkbox">` is the real control — `appearance-none` turns
 * off the platform drawing and the box is painted on the input itself, so focus,
 * clicks, form submission and the reported state are all native. The `<label>`
 * wraps the box and the text, so the whole row toggles it.
 *
 * Inside a `CheckboxGroup`, a checkbox with a `value` takes its checked state,
 * `name`, required and invalid state from the group.
 *
 *
 * WHY NOT `useControllableState`
 *
 * A native checkbox already is a controllable component: `checked` + `onChange`
 * controls it, `defaultChecked` leaves it to the DOM. Routing the uncontrolled
 * case through React state as well would break the one thing the DOM gets right
 * for free — `form.reset()` restores `defaultChecked` in the DOM, and React state
 * would not follow it. So `checked` and `defaultChecked` pass straight through,
 * and `onCheckedChange` is a convenience on top of `onChange`. The group, which
 * owns a `string[]` with no DOM equivalent, is where `useControllableState` fits.
 *
 *
 * WHY THE REF IS REPUBLISHED
 *
 * `indeterminate` exists only as a DOM property, so the component needs its own
 * handle on the input. It keeps the only ref and hands the node to the caller
 * through `useImperativeHandle` — the pattern `useComboBox` documents, for the
 * same lint reasons.
 */
const Checkbox = ({
  label,
  description,
  error,
  indeterminate = false,
  value,
  name,
  checked,
  defaultChecked,
  required,
  onChange,
  onCheckedChange,
  className,
  rootClassName,
  id,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...props
}: ICheckboxProps): ReactElement => {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const group = useCheckboxGroupContext();
  // Membership needs a value to put in the group's array.
  const member = group !== null && value !== undefined ? group : null;

  const hasError = error != null && error !== false;
  const hasDescription = description != null && description !== false;
  const invalid = hasError || (member?.invalid ?? false);
  const slots = checkboxStyles({ invalid });

  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current!);

  /*
   * No dependency list, on purpose. A click on an indeterminate checkbox clears
   * the DOM property without React knowing, so a controlled parent that keeps
   * `indeterminate` true across that render needs the property written again —
   * a `[indeterminate]` list would skip it because the prop did not change.
   * Layout timing so the browser never paints the cleared state first.
   */
  useIsomorphicLayoutEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current.indeterminate = indeterminate;
    }
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange?.(event);
    onCheckedChange?.(event.target.checked);
    if (member !== null && value !== undefined) {
      member.toggle(value, event.target.checked);
    }
  };

  // Same composition and order as `Input`: error, then description, then
  // whatever the caller already associated.
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

  const isRequired = member !== null ? member.required : required;
  const memberChecked =
    member !== null && value !== undefined
      ? member.value.includes(value)
      : null;

  return (
    <div className={slots.root({ class: rootClassName })}>
      <label className={slots.field()} htmlFor={inputId}>
        <span className={slots.box()}>
          <input
            {...props}
            ref={inputRef}
            id={inputId}
            type="checkbox"
            value={value}
            name={name ?? member?.name}
            // A member is controlled by the group; it never takes a default.
            checked={memberChecked ?? checked}
            defaultChecked={member !== null ? undefined : defaultChecked}
            required={isRequired}
            onChange={handleChange}
            className={slots.control({ class: className })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
          <svg
            className={slots.check()}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
          <svg
            className={slots.dash()}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M4 8h8" />
          </svg>
        </span>
        <span className={slots.label()}>
          {label}
          {required === true && member === null ? (
            // `required` is what assistive technology announces; the star is
            // decorative and hidden from it, as in `Input`.
            <span aria-hidden="true"> *</span>
          ) : null}
        </span>
      </label>
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
    </div>
  );
};

export { Checkbox };
