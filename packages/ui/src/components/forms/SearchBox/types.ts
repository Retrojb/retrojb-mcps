import type { ReactNode, Ref } from "react";

import type { IUseComboBoxOptions } from "../../../hooks/useComboBox";
import type { IComboBoxMatch } from "../../../lib/filter";
import type { ComboBoxVariants } from "../ComboBox/styles";
import type { IComboBoxOptionState } from "../ComboBox/types";

interface ISearchBoxProps<TOption>
  extends
    /*
     * The omissions are the component.
     *
     * `value`, `defaultValue`, `onValueChange` and `name` all belong to the idea
     * of a *committed selection*, and a search box has none — the query is the
     * outcome, and a suggestion is a shortcut to it rather than a value to hold.
     * Leaving them on the type would invite the combobox mental model back in,
     * along with a hidden input that submits something the user never chose.
     *
     * `onSubmitQuery` and `blurBehaviour` are set by this component rather than
     * by the caller, because they are what makes it a search box: Enter submits,
     * and the query survives a blur.
     */
    Omit<
      IUseComboBoxOptions<TOption>,
      | "inputRef"
      | "onSubmitQuery"
      | "blurBehaviour"
      | "name"
      | "value"
      | "defaultValue"
      | "onValueChange"
      | "required"
    >,
    Omit<ComboBoxVariants, "invalid"> {
  /** Required, for the reason it is required on `ComboBox` and `Input`. */
  readonly label: ReactNode;

  /**
   * Enter with no suggestion highlighted, or a press of the submit button.
   *
   * This is the half a combobox cannot do. The raw query is a legitimate result
   * here, so submitting without choosing anything has to work.
   */
  readonly onSubmit?: ((query: string) => void) | undefined;

  /**
   * A suggestion was chosen, by click or by Enter on a highlighted row.
   *
   * Separate from `onSubmit` because the two usually do different things — a
   * suggestion often navigates straight to a record, while a query goes to a
   * results page.
   */
  readonly onSelect?: ((option: TOption) => void) | undefined;

  /**
   * Render a visible submit button with this accessible name.
   *
   * Omitted by default: Enter already submits, and on a header search the button
   * is usually redundant. Supply it where the control has to be operable without
   * a keyboard commitment, or where the affordance is wanted.
   */
  readonly submitLabel?: string | undefined;

  /**
   * Expose the control as a `search` landmark. Defaults to `true`.
   *
   * Turn it off for a filter box that is not the page's search — a column filter
   * above a table, say. Landmarks are a navigation menu for screen reader users,
   * and a page with five "search" entries in it is harder to navigate than a page
   * with one. If you keep more than one, give each a distinct `label`.
   */
  readonly landmark?: boolean | undefined;

  readonly placeholder?: string | undefined;

  /** Shown in the listbox when nothing matched. Defaults to `labels.noResults`. */
  readonly emptyMessage?: ReactNode;

  /** Helper text, wired to the input with `aria-describedby`. */
  readonly description?: ReactNode;

  /** Presence sets `aria-invalid` and the invalid styling, as on `ComboBox`. */
  readonly error?: ReactNode;

  /** Defaults to true, and only renders once there is something to clear. */
  readonly showClear?: boolean | undefined;

  /**
   * Defaults to false, unlike `ComboBox`.
   *
   * A dropdown arrow on a search field reads as a select — it suggests a closed
   * set of choices, which is the opposite of what this control promises.
   */
  readonly showToggle?: boolean | undefined;

  readonly renderOption?:
    | ((
        match: IComboBoxMatch<TOption>,
        state: IComboBoxOptionState,
      ) => ReactNode)
    | undefined;

  readonly className?: string | undefined;
  readonly rootClassName?: string | undefined;
  readonly listboxClassName?: string | undefined;
  readonly "aria-describedby"?: string | undefined;
  readonly autoFocus?: boolean | undefined;
  readonly ref?: Ref<HTMLInputElement> | undefined;
}

export type { ISearchBoxProps };
