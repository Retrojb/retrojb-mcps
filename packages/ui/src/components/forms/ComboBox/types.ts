import type { ReactNode, Ref } from "react";

import type { IUseComboBoxOptions } from "../../../hooks/useComboBox";
import type { IComboBoxMatch } from "../../../lib/filter";
import type { ComboBoxVariants } from "./styles";

/** Passed to `renderOption` so a custom row can style itself. */
interface IComboBoxOptionState {
  /** The keyboard is on this option — it is the `aria-activedescendant`. */
  readonly isActive: boolean;

  /** This option is the committed `value`. */
  readonly isSelected: boolean;

  readonly isDisabled: boolean;
}

interface IComboBoxProps<TOption>
  /*
   * `inputRef` is dropped and re-exposed as `ref` below, so that `ref` means
   * the same thing here as it does on `Input` — the text input, not the
   * wrapper. A component with a wrapping element has to make that choice
   * explicitly, and pointing `ref` at a `<div>` the caller cannot do anything
   * with is the less useful half of it.
   */
  extends
    Omit<IUseComboBoxOptions<TOption>, "inputRef">,
    /*
     * `invalid` is dropped for the reason it is dropped on `Input`: passing
     * `error` is the only way to get the invalid styling, so the visual state
     * cannot drift from what is announced.
     */
    Omit<ComboBoxVariants, "invalid"> {
  /**
   * The visible label. Required, deliberately.
   *
   * An unlabelled control is the most common WCAG failure there is (4.1.2, and
   * 3.3.2 for the missing instruction), and a combobox invites it more than most
   * — the placeholder looks like a label until the user types. Making this
   * required means the type checker catches the omission. Use `labelHidden` when
   * the design has no room for visible text; the label still exists for
   * assistive technology.
   */
  readonly label: ReactNode;

  /** Helper text, wired to the input with `aria-describedby`. */
  readonly description?: ReactNode;

  /**
   * The validation message. Presence switches the control into its invalid state
   * and sets `aria-invalid`, so the styling cannot be shown without being
   * announced.
   */
  readonly error?: ReactNode;

  readonly placeholder?: string | undefined;

  /** Shown in the listbox when nothing matched. Defaults to `labels.noResults`. */
  readonly emptyMessage?: ReactNode;

  /** Defaults to true, and only renders once there is something to clear. */
  readonly showClear?: boolean | undefined;

  /** Defaults to true. */
  readonly showToggle?: boolean | undefined;

  /**
   * Replace the contents of an option row.
   *
   * The `<li>` and its ARIA attributes stay with the component; this controls
   * what goes inside it. Reach for `useComboBox` directly if the element itself
   * has to change.
   *
   * Note that a custom row is responsible for its own accessible name. The
   * default row hides its highlighted fragments from assistive technology and
   * supplies the whole label separately — see the comment in `ComboBox.tsx`.
   */
  readonly renderOption?:
    | ((
        match: IComboBoxMatch<TOption>,
        state: IComboBoxOptionState,
      ) => ReactNode)
    | undefined;

  /** Goes to the text input. */
  readonly className?: string | undefined;

  /** Goes to the outermost wrapper. */
  readonly rootClassName?: string | undefined;

  /** Goes to the popup. */
  readonly listboxClassName?: string | undefined;

  /**
   * Appended to the generated ids rather than replacing them, so a tooltip or
   * hint the app has already associated with the field is not silently dropped.
   */
  readonly "aria-describedby"?: string | undefined;

  /**
   * A hint for the on-screen keyboard. `search` is usually right for a combobox
   * over a large set, and is what `SearchBox` uses.
   */
  readonly inputMode?:
    | "none"
    | "text"
    | "search"
    | "email"
    | "tel"
    | "url"
    | "numeric"
    | "decimal"
    | undefined;

  readonly autoFocus?: boolean | undefined;

  /** Points at the text input, matching `Input`. */
  readonly ref?: Ref<HTMLInputElement> | undefined;
}

export type { IComboBoxOptionState, IComboBoxProps };
