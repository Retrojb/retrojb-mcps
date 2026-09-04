"use client";

import {
  useId,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from "react";

import { input, type InputVariants } from "../variants.js";

export interface InputProps
  extends
    Omit<ComponentPropsWithRef<"input">, "size">,
    Omit<InputVariants, "invalid"> {
  /**
   * The visible label. Required, deliberately.
   *
   * An input with no label is the single most common WCAG failure there is
   * (4.1.2, and 3.3.2 for the missing instruction). Making this a required prop
   * means the type checker catches it, rather than an audit catching it later.
   * Use `labelHidden` when the design has no room for visible label text — the
   * label still exists for assistive technology.
   */
  readonly label: ReactNode;

  /** Helper text, wired to the input with `aria-describedby`. */
  readonly description?: ReactNode;

  /**
   * The validation message. Presence switches the control into its invalid
   * state and sets `aria-invalid`, so there is no way to show the styling
   * without announcing it.
   */
  readonly error?: ReactNode;

  /** Wrapper class. `className` goes to the input itself. */
  readonly rootClassName?: string;
}

/**
 * A labelled text input, with description and error text already wired up.
 *
 * The label, description and error are associated with the control by generated
 * ids — `htmlFor` and `aria-describedby` — so the accessible name and
 * description are correct without the caller doing anything. `useId` produces
 * ids that match between server and client render, which hand-written ones do
 * not once a component appears more than once on a page.
 */
export function Input({
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
}: InputProps): ReactElement {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const invalid = error != null && error !== false;

  const slots = input({ size, invalid, labelHidden });

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
}
