import type { ComponentPropsWithRef, ReactNode } from "react";
import type { DynamicContainerVariants } from "../../containers/dynamicContainer/styles";

/** One entry in `CheckboxGroup`'s `options` array. */
interface ICheckboxGroupOption {
  /** Submitted with the form, and the entry in the group's `string[]`. */
  readonly value: string;
  /** The checkbox's label. See `ICheckboxProps.label`. */
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly disabled?: boolean;
}

interface ICheckboxGroupProps
  extends
    Omit<
      ComponentPropsWithRef<"fieldset">,
      "children" | "defaultValue" | "name"
    >,
    Pick<DynamicContainerVariants, "direction" | "gap" | "responsiveTo"> {
  /**
   * The group label, rendered as the `<legend>`. Required, deliberately.
   *
   * The legend is the group's accessible name, and screen readers announce it
   * on entering the group — without it, "Email" and "SMS" do not say what they
   * are choices *of* (1.3.1, 3.3.2).
   */
  readonly label: ReactNode;
  /** Helper text for the group, wired to the fieldset with `aria-describedby`. */
  readonly description?: ReactNode;
  /**
   * The group's validation message. Wired to the fieldset with
   * `aria-describedby`, and turns every member checkbox invalid — red border
   * and `aria-invalid` — so the state is announced on each box, not only once.
   */
  readonly error?: ReactNode;
  /**
   * Checkboxes to render from data. Rendered before any `children`.
   */
  readonly options?: readonly ICheckboxGroupOption[];
  /**
   * `<Checkbox>` elements, for markup an `options` array cannot express. Each
   * one with a `value` joins the group through context.
   */
  readonly children?: ReactNode;
  /** The checked values, when controlled. */
  readonly value?: readonly string[];
  /** The initially checked values, when uncontrolled. Read once, on mount. */
  readonly defaultValue?: readonly string[];
  /** Called with the new checked values, controlled or not. */
  readonly onValueChange?: (value: string[]) => void;
  /** The `name` every member checkbox submits under. */
  readonly name?: string;
  /**
   * At least one checkbox must be checked.
   *
   * Native `required` on a checkbox means *that* checkbox must be checked, so
   * it cannot simply be copied onto every member. The group sets it on every
   * member while nothing is checked and removes it from all of them as soon as
   * one is, which makes the browser's own constraint validation enforce "at
   * least one". The trade-off is the browser's message, which reads as if the
   * first box itself were mandatory — pair it with a `description` that says
   * "Choose at least one".
   */
  readonly required?: boolean;
  /**
   * Label for a parent checkbox that checks or clears every enabled option at
   * once, and is indeterminate while some are checked. Covers `options` only —
   * `children` are opaque to the group. Omit for no parent checkbox.
   */
  readonly selectAllLabel?: ReactNode;
}

/** What a group shares with the `Checkbox` elements inside it. */
interface ICheckboxGroupContextValue {
  readonly name: string | undefined;
  readonly value: readonly string[];
  readonly toggle: (value: string, checked: boolean) => void;
  /** The computed per-checkbox `required` — see `ICheckboxGroupProps.required`. */
  readonly required: boolean;
  readonly invalid: boolean;
}

export type {
  ICheckboxGroupContextValue,
  ICheckboxGroupOption,
  ICheckboxGroupProps,
};
