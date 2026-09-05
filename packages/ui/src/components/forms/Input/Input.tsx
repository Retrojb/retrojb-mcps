"use client";

import { useId, type ReactElement } from "react";

import { inputStyle } from "./styles";
import type { IInputProps } from "./types";

/**
 * A labelled text input, with description and error text already wired up.
 *
 * The label, description and error are associated with the control by generated
 * ids — `htmlFor` and `aria-describedby` — so the accessible name and
 * description are correct without the caller doing anything. `useId` produces
 * ids that match between server and client render, which hand-written ones do
 * not once a component appears more than once on a page.
 */
const Input = ({
  label,
  description,
  error,
  size,
  labelHidden,
  className,
  rootClassName,
  id,
  required,
  "aria-describedby": ariaDescribedBy,
  ...props
}: IInputProps): ReactElement => {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const invalid = error != null && error !== false;

  const slots = inputStyle({ size, invalid, labelHidden });

  /*
   * Both messages are announced, and a caller-supplied `aria-describedby` is
   * kept rather than replaced — dropping it would break any tooltip or hint the
   * app has already associated with this field. Order matters: the error is
   * listed first so it is read before the helper text.
   */
  const describedBy =
    [
      invalid ? errorId : null,
      description != null ? descriptionId : null,
      ariaDescribedBy,
    ]
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
      .join(" ") || undefined;

  return (
    <div className={slots.root({ class: rootClassName })}>
      <label className={slots.label()} htmlFor={inputId}>
        {label}
        {required === true ? (
          // The `required` attribute is what assistive technology announces, so
          // this marker is decorative and hidden from it to avoid "label star".
          <span aria-hidden="true"> *</span>
        ) : null}
      </label>

      <input
        {...props}
        id={inputId}
        required={required}
        className={slots.control({ class: className })}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />

      {description != null ? (
        <p className={slots.description()} id={descriptionId}>
          {description}
        </p>
      ) : null}

      {invalid ? (
        <p className={slots.error()} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

export { Input };
