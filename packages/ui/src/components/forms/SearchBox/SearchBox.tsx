"use client";

import { useId, type ReactElement } from "react";

import { useComboBox } from "../../../hooks/useComboBox";
import { OptionContent } from "../ComboBox/OptionContent";
import { comboBoxStyle } from "../ComboBox/styles";
import type { ISearchBoxProps } from "./types";

/**
 * The magnifier.
 *
 * Inline SVG rather than a glyph, because the Unicode magnifiers render as emoji
 * on some platforms and as a missing box on others. `currentColor` so it follows
 * the token the surrounding text uses, and `aria-hidden` because the field's
 * label is already its accessible name — announcing "magnifying glass" in front
 * of it is noise (WCAG 4.1.2).
 */
const SearchIcon = (): ReactElement => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 16 16"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
  >
    <circle cx="6.75" cy="6.75" r="4.5" />
    <path d="M10.2 10.2 14 14" />
  </svg>
);

/**
 * A search field with suggestions.
 *
 * ```tsx
 * <SearchBox
 *   label="Search docs"
 *   labelHidden
 *   placeholder="Search docs…"
 *   options={pages}
 *   onSubmit={(query) => router.push(`/search?q=${encodeURIComponent(query)}`)}
 *   onSelect={(page) => router.push(page.href)}
 * />
 * ```
 *
 *
 * WHY THIS IS NOT A `ComboBox` VARIANT
 *
 * Both draw the same box, and a `variant="search"` prop would have been the
 * obvious way to ship it. What differs is not appearance but the contract, and a
 * style variant cannot switch between contracts:
 *
 *   - The query is a valid outcome. Enter with nothing highlighted submits it,
 *     rather than being swallowed or committing a row the user never looked at.
 *   - Free text survives a blur. There is nothing to revert it to, because there
 *     is no committed value — `value`, `name` and `onValueChange` are not on this
 *     component's props at all, and no hidden input is rendered.
 *   - A suggestion is a shortcut, not a selection, so choosing one calls
 *     `onSelect` with the option rather than storing it.
 *   - It is a `search` landmark, which `ComboBox` must never be.
 *
 * Same reasoning as the three alert components — see the note in `src/index.ts`.
 * The behaviour is shared through `useComboBox`, and the styles are shared
 * through `comboBoxStyle`, so the two cannot drift apart visually.
 */
const SearchBox = <TOption,>({
  label,
  description,
  error,
  placeholder,
  emptyMessage,
  onSubmit,
  onSelect,
  submitLabel,
  landmark = true,
  showClear = true,
  showToggle = false,
  renderOption,
  size,
  labelHidden,
  placement,
  className,
  rootClassName,
  listboxClassName,
  "aria-describedby": ariaDescribedBy,
  autoFocus,
  ref,
  id,
  ...hookOptions
}: ISearchBoxProps<TOption>): ReactElement => {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const invalid = error != null && error !== false;

  const combo = useComboBox<TOption>({
    ...hookOptions,
    id: baseId,
    inputRef: ref,

    // The three settings that make this a search box rather than a combobox.
    onSubmitQuery: onSubmit,
    blurBehaviour: "keep",
    onValueChange: (_value, option) => {
      if (option !== null) {
        onSelect?.(option);
      }
    },
  });

  const slots = comboBoxStyle({ size, invalid, labelHidden, placement });

  const {
    matches,
    activeIndex,
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
  } = combo;

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

  const body = (
    <>
      <label className={slots.label()} htmlFor={inputId}>
        {label}
      </label>

      {/* See the note on these attributes in `ComboBox.tsx`. */}
      <div data-combobox-anchor="" className={slots.anchor()}>
        <div data-combobox-field="" className={slots.field()}>
          <span
            className="grid shrink-0 place-items-center text-foreground-muted"
            aria-hidden="true"
          >
            <SearchIcon />
          </span>

          <input
            {...getInputProps()}
            id={inputId}
            type="text"
            className={slots.control({ class: className })}
            placeholder={placeholder}
            /*
             * `search` swaps the on-screen keyboard's return key for a search
             * key, which is the affordance that tells a touch user Enter will do
             * something. `type="search"` is deliberately not used: it brings a
             * browser-drawn clear button that duplicates ours and cannot be
             * styled or given an accessible name.
             */
            inputMode="search"
            enterKeyHint="search"
            autoFocus={autoFocus}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />

          {showClear && inputValue !== "" ? (
            <button {...getClearButtonProps()} className={slots.affordance()}>
              <span aria-hidden="true">&times;</span>
            </button>
          ) : null}

          {showToggle ? (
            <button
              {...combo.getToggleButtonProps()}
              className={slots.affordance()}
            >
              <span aria-hidden="true">&#9662;</span>
            </button>
          ) : null}

          {submitLabel === undefined ? null : (
            /*
             * In the tab order, unlike the clear and toggle affordances. This is
             * the primary action of the control, and 2.1.1 wants it reachable
             * from the keyboard — Enter in the field covers the common path, but
             * only while the field has focus.
             */
            <button
              type="button"
              aria-label={submitLabel}
              className={slots.affordance()}
              onClick={() => {
                combo.close();
                onSubmit?.(inputValue);
              }}
            >
              <SearchIcon />
            </button>
          )}
        </div>

        <ul
          {...getListboxProps()}
          data-combobox-listbox=""
          data-combobox-placement={placement ?? "auto"}
          aria-label={typeof label === "string" ? label : undefined}
          className={slots.listbox({ class: listboxClassName })}
        >
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
            matches.map((match, index) => (
              <li
                {...getOptionProps(index)}
                key={match.label}
                className={slots.option()}
              >
                {renderOption === undefined ? (
                  <OptionContent
                    label={match.label}
                    ranges={match.ranges}
                    isSelected={isOptionSelected(index)}
                    selectedLabel={labels.selected}
                    markClassName={slots.mark()}
                  />
                ) : (
                  renderOption(match, {
                    isActive: index === activeIndex,
                    isSelected: isOptionSelected(index),
                    isDisabled: isOptionDisabled(index),
                  })
                )}
              </li>
            ))
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

      {/* Mounted empty, for the reason spelled out in `ComboBox.tsx`. */}
      <div id={statusId} role="status" className="sr-only">
        {statusMessage}
      </div>
    </>
  );

  const rootProps = {
    ...getRootProps(),
    className: slots.root({ class: rootClassName }),
  };

  /*
   * `<search>` rather than `<div role="search">`.
   *
   * The element carries the landmark role itself, so the attribute would be
   * redundant — and this package prefers the platform's own semantics where they
   * exist, the way `BrowserAlert` uses a real `<dialog>`. The listbox is a child
   * of the landmark rather than a sibling, which is what a screen reader user
   * navigating by landmark expects to find inside it.
   */
  return landmark ? (
    <search {...rootProps}>{body}</search>
  ) : (
    <div {...rootProps}>{body}</div>
  );
};

export { SearchBox };
