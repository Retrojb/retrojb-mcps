"use client";

import { useId, type ReactElement } from "react";

import { useComboBox } from "../../../hooks/useComboBox";
import { OptionContent } from "./OptionContent";
import { comboBoxStyle } from "./styles";
import type { IComboBoxProps } from "./types";

/**
 * A labelled combobox: a text field with a filtered listbox of options.
 *
 * ```tsx
 * <ComboBox
 *   label="Country"
 *   name="country"
 *   options={countries}
 *   onValueChange={(value) => setCountry(value)}
 * />
 * ```
 *
 * The behaviour lives in `useComboBox`, which is exported — reach for it when the
 * markup here does not fit (grouped options, multi-select, a popup rendered as a
 * dialog) and keep the keyboard and ARIA contract.
 *
 *
 * THIS IS A FORM CONTROL, NOT A SEARCH FIELD
 *
 * The user has to end up on one of the options: free text is reverted on blur,
 * and Enter commits the active option rather than submitting. If the query is a
 * valid outcome on its own — a site search, a filter box — use `SearchBox`, which
 * shares this hook and makes the opposite promises.
 *
 *
 * TWO PIECES OF STATE, NOT ONE
 *
 * `value` is the committed selection and `inputValue` is the text in the field,
 * and they are controllable independently. Conflating them is the usual source of
 * combobox bugs: the text is a query mid-edit and a label once committed, and a
 * single piece of state cannot be both.
 */
const ComboBox = <TOption,>({
  label,
  description,
  error,
  placeholder,
  emptyMessage,
  showClear = true,
  showToggle = true,
  renderOption,
  size,
  labelHidden,
  placement,
  className,
  rootClassName,
  listboxClassName,
  "aria-describedby": ariaDescribedBy,
  inputMode,
  autoFocus,
  ref,
  id,
  ...hookOptions
}: IComboBoxProps<TOption>): ReactElement => {
  const generatedId = useId();

  /*
   * A caller-supplied `id` is the input's own id, matching `Input`, and doubles
   * as the base for the generated ones — so `id="country"` yields a
   * `country-listbox` and `country-option-3` rather than a second, unrelated
   * `useId` string. `useId` is what makes the fallback safe to render on the
   * server: hand-written ids stop matching between the server and client passes
   * as soon as a field appears twice on a page.
   */
  const baseId = id ?? generatedId;
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const invalid = error != null && error !== false;

  const combo = useComboBox<TOption>({
    ...hookOptions,
    id: baseId,
    inputRef: ref,
  });

  const slots = comboBoxStyle({ size, invalid, labelHidden, placement });

  const {
    matches,
    activeIndex,
    selectedValue,
    inputValue,
    isLoading,
    error: searchError,
    truncated,
    statusMessage,
    labels,
    statusId,
    isOptionSelected,
    isOptionDisabled,
    getRootProps,
    getInputProps,
    getListboxProps,
    getOptionProps,
    getClearButtonProps,
    getToggleButtonProps,
    getHiddenInputProps,
  } = combo;

  const { required, name } = hookOptions;

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

  const hasSomethingToClear = inputValue !== "" || selectedValue !== null;

  return (
    <div {...getRootProps()} className={slots.root({ class: rootClassName })}>
      <label className={slots.label()} htmlFor={inputId}>
        {label}
        {required === true ? (
          // The `required` attribute is what assistive technology announces, so
          // this marker is decorative and hidden from it to avoid "label star".
          <span aria-hidden="true"> *</span>
        ) : null}
      </label>

      {/*
       * The three `data-combobox-*` attributes are the hooks the anchor
       * positioning block in `styles/index.css` targets. They are attributes
       * rather than classes because `tailwind-variants` composes utility strings
       * and leaves no stable class name to select on.
       */}
      <div data-combobox-anchor="" className={slots.anchor()}>
        <div data-combobox-field="" className={slots.field()}>
          <input
            {...getInputProps()}
            id={inputId}
            className={slots.control({ class: className })}
            placeholder={placeholder}
            inputMode={inputMode}
            autoFocus={autoFocus}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />

          {showClear && hasSomethingToClear ? (
            <button {...getClearButtonProps()} className={slots.affordance()}>
              {/*
               * The glyph is decorative — the `aria-label` from the getter is
               * the button's accessible name (WCAG 4.1.2). Leaving this exposed
               * would announce "multiplication sign" alongside it.
               */}
              <span aria-hidden="true">&times;</span>
            </button>
          ) : null}

          {showToggle ? (
            <button {...getToggleButtonProps()} className={slots.affordance()}>
              <span aria-hidden="true">&#9662;</span>
            </button>
          ) : null}
        </div>

        <ul
          {...getListboxProps()}
          data-combobox-listbox=""
          data-combobox-placement={placement ?? "auto"}
          aria-label={typeof label === "string" ? label : undefined}
          className={slots.listbox({ class: listboxClassName })}
        >
          {/*
           * `role="presentation"` on the status rows because every child of a
           * listbox has to be an option or a group — a bare `<li>` in there is
           * invalid, and a screen reader counting options would include it.
           * Removing the role leaves the text itself perceivable.
           */}
          {searchError !== null ? (
            <li role="presentation" className={slots.note()}>
              {labels.error}
            </li>
          ) : isLoading && matches.length === 0 ? (
            <li role="presentation" className={slots.note()}>
              {labels.loading}
            </li>
          ) : matches.length === 0 ? (
            <li role="presentation" className={slots.note()}>
              {emptyMessage ?? labels.noResults}
            </li>
          ) : (
            matches.map((match, index) => {
              const isSelected = isOptionSelected(index);

              return (
                <li
                  {...getOptionProps(index)}
                  // The option's own value, so reconciliation survives
                  // filtering. Duplicate values are a data bug and React will
                  // say so, which is more useful than masking it with the index.
                  key={match.label}
                  className={slots.option()}
                >
                  {renderOption === undefined ? (
                    <OptionContent
                      label={match.label}
                      ranges={match.ranges}
                      isSelected={isSelected}
                      selectedLabel={labels.selected}
                      markClassName={slots.mark()}
                    />
                  ) : (
                    renderOption(match, {
                      isActive: index === activeIndex,
                      isSelected,
                      isDisabled: isOptionDisabled(index),
                    })
                  )}
                </li>
              );
            })
          )}

          {truncated ? (
            <li role="presentation" className={slots.note()}>
              {labels.truncated(matches.length)}
            </li>
          ) : null}
        </ul>
      </div>

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

      {/*
       * The live region, mounted whether or not there is anything to say.
       *
       * This is the same trap `InlineAlert` documents at length: a screen reader
       * announces changes *inside* a region it is already watching, so a region
       * that appears at the same moment as its text usually says nothing at all.
       * Mounting it here, empty, is what makes the result count announceable —
       * and the count is the only way a non-sighted user knows that typing
       * changed anything.
       *
       * `role="status"` carries the liveness on its own: it implies
       * `aria-live="polite"` and `aria-atomic="true"`, and setting those
       * alongside it is redundant at best. The text is debounced in the hook so
       * it reports the query the user stopped on rather than every keystroke.
       */}
      <div id={statusId} role="status" className="sr-only">
        {statusMessage}
      </div>

      {/*
       * The value the form submits. The visible input holds the query, which is
       * not the value — without this a `FormData` read would get the label, or
       * whatever half-typed text was in the box.
       */}
      {name === undefined ? null : <input {...getHiddenInputProps()} />}
    </div>
  );
};

export { ComboBox };
