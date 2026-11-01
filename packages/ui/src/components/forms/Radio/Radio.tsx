"use client";

import { useId, type ChangeEvent, type ReactElement } from "react";
import { useRadioGroupContext } from "../RadioGroup/context";
import { radioStyles } from "./styles";
import type { IRadioProps } from "./types";

/**
 * A labelled native radio button, with description and error text wired up.
 *
 * ```tsx
 * <RadioGroup label="Delivery" name="delivery" defaultValue="standard">
 *   <Radio value="standard" label="Standard" />
 *   <Radio value="express" label="Express" description="Next working day." />
 * </RadioGroup>
 * ```
 *
 * The `<input type="radio">` is the real control — `appearance-none` turns off
 * the platform drawing and the circle is painted on the input itself, the same
 * approach as `Checkbox`. The `<label>` wraps the circle and the text, so the
 * whole row selects it.
 *
 * Meant to be used inside a `RadioGroup`, which supplies the `name`, the group
 * label, required and invalid state, and the size. Radios outside a group that
 * share a `name` still form a native group — one tab stop, arrow keys — but
 * have no group label, which a screen reader user then has to infer.
 *
 *
 * WHY NOT `useControllableState`
 *
 * For the reason `Checkbox` gives: a native radio already is a controllable
 * component. `checked` + `onChange` controls it, `defaultChecked` leaves it to
 * the DOM, and the DOM case is the one where `form.reset()` works. So both pass
 * straight through. There is no `onCheckedChange`: a radio's `change` event only
 * ever fires when it becomes checked, so the boolean would always be `true`.
 *
 *
 * WHY THE GROUP'S `name` WINS
 *
 * `Checkbox` lets its own `name` override the group's. A radio cannot: a member
 * with a different `name` silently becomes a separate native group, with its own
 * tab stop and its own selection, while still looking like part of this one. So
 * inside a group the group's `name` is used and the radio's is ignored.
 */
const Radio = ({
  label,
  description,
  error,
  value,
  name,
  checked,
  defaultChecked,
  required,
  size,
  onChange,
  className,
  rootClassName,
  id,
  "aria-describedby": ariaDescribedBy,
  ...props
}: IRadioProps): ReactElement => {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const group = useRadioGroupContext();

  const hasError = error != null && error !== false;
  const hasDescription = description != null && description !== false;
  const invalid = hasError || (group?.invalid ?? false);
  const slots = radioStyles({ size: size ?? group?.size, invalid });

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange?.(event);
    if (group !== null && event.target.checked) {
      group.select(value);
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

  /*
   * A member is controlled by the group when the group is, and otherwise takes
   * its default from the group's `defaultValue` and leaves the rest to the DOM.
   * Either way the radio's own `checked` / `defaultChecked` are ignored, so a
   * member can never disagree with its group.
   */
  const groupControlled = group !== null && group.value !== undefined;
  const resolvedChecked =
    group === null
      ? checked
      : groupControlled
        ? group.value === value
        : undefined;
  const resolvedDefaultChecked =
    group === null
      ? defaultChecked
      : groupControlled
        ? undefined
        : group.defaultValue === value;

  return (
    <div className={slots.root({ class: rootClassName })}>
      <label className={slots.field()} htmlFor={inputId}>
        <span className={slots.box()}>
          <input
            {...props}
            id={inputId}
            type="radio"
            value={value}
            name={group !== null ? group.name : name}
            checked={resolvedChecked}
            defaultChecked={resolvedDefaultChecked}
            required={group !== null ? group.required : required}
            onChange={handleChange}
            className={slots.control({ class: className })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
          <svg
            className={slots.dot()}
            viewBox="0 0 2 2"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="1" cy="1" r="1" />
          </svg>
        </span>
        <span className={slots.label()}>
          {label}
          {required === true && group === null ? (
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

export { Radio };
