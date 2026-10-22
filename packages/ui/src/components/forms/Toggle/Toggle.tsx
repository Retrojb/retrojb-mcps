"use client";

import { useId, type ChangeEvent, type ReactElement } from "react";
import { toggleStyles } from "./styles";
import type { IToggleProps } from "./types";

/**
 * A labelled on/off switch, with description and error text wired up.
 *
 * ```tsx
 * <Toggle label="Wi-Fi" defaultChecked onCheckedChange={setWifi} />
 * ```
 *
 * The real control is a native `<input type="checkbox" role="switch">`, drawn
 * as the track with `appearance-none`. Focus, click, Space, form submission and
 * controlled (`checked` + `onChange`) or uncontrolled (`defaultChecked`) use
 * are all the browser's; `role="switch"` only changes what it is announced as.
 * The `<label>` wraps the track and the text, so the whole row toggles it.
 *
 *
 * WHY NOT `<button aria-checked>`
 *
 * The usual alternative is a `<button role="switch">` with the state in React.
 * It gives up everything a checkbox has for free — `name` / `value` in
 * `FormData`, `required`, `form.reset()`, `<fieldset disabled>` and `<label>`
 * activation — and each one has to be rebuilt by hand. ARIA in HTML allows
 * `role="switch"` on a checkbox, and the browser maps its native checked state
 * to the switch's on/off, so no `aria-checked` is written.
 *
 *
 * WHY THE LABEL DEFAULTS TO THE START
 *
 * Settings screens on iOS, Android, macOS and Windows all put the label first
 * and the switch at the end of the row. A list of toggles then reads as a list
 * of setting names with their switches aligned in one column. `"end"` is there
 * for the checkbox-like layout, where the control leads.
 *
 *
 * WHY NOT `useControllableState`
 *
 * As in `Checkbox`: a native checkbox is already controllable, and routing the
 * uncontrolled case through React state would break `form.reset()`. `checked`
 * and `defaultChecked` pass straight through.
 */
const Toggle = ({
  label,
  description,
  error,
  size,
  labelPosition,
  required,
  onChange,
  onCheckedChange,
  className,
  rootClassName,
  id,
  "aria-describedby": ariaDescribedBy,
  ...props
}: IToggleProps): ReactElement => {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const hasError = error != null && error !== false;
  const hasDescription = description != null && description !== false;
  const slots = toggleStyles({ size, labelPosition, invalid: hasError });

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange?.(event);
    onCheckedChange?.(event.target.checked);
  };

  // Same composition and order as `Checkbox` and `Input`: error, then
  // description, then whatever the caller already associated.
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

  const labelText = (
    <span className={slots.label()}>
      {label}
      {required === true ? (
        // `required` is what assistive technology announces; the star is
        // decorative and hidden from it, as in `Input`.
        <span aria-hidden="true"> *</span>
      ) : null}
    </span>
  );

  // DOM order follows the visual order, so reading order and a magnifier's
  // tracking match what is on screen (1.3.2).
  const isLabelFirst = (labelPosition ?? "start") === "start";

  return (
    <div className={slots.root({ class: rootClassName })}>
      <label className={slots.field()} htmlFor={inputId}>
        {isLabelFirst ? labelText : null}
        <span className={slots.cell()}>
          <input
            {...props}
            id={inputId}
            type="checkbox"
            role="switch"
            required={required}
            onChange={handleChange}
            className={slots.control({ class: className })}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
          />
          <span className={slots.thumb()} aria-hidden="true">
            <svg
              className={slots.glyph()}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              focusable="false"
            >
              <path d="M3 8.5 6.5 12 13 4.5" />
            </svg>
          </span>
        </span>
        {isLabelFirst ? null : labelText}
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

export { Toggle };
