import type { ComponentPropsWithRef, ReactNode } from "react";
import type { DynamicContainerVariants } from "../../containers/dynamicContainer/styles";
import type { RadioVariants } from "../Radio/styles";
import type { RadioGroupVariants } from "./styles";

/** One entry in `RadioGroup`'s `options` array. */
interface IRadioGroupOption {
  /** Submitted with the form, and what `value` / `onValueChange` carry. */
  readonly value: string;
  /** The radio's label. See `IRadioProps.label`. */
  readonly label: ReactNode;
  readonly description?: ReactNode;
  /** Takes this one radio out of the group; arrow keys skip it. */
  readonly disabled?: boolean;
}

interface IRadioGroupProps
  extends
    Omit<
      ComponentPropsWithRef<"fieldset">,
      "children" | "defaultValue" | "name" | "role"
    >,
    Pick<DynamicContainerVariants, "gap">,
    RadioGroupVariants {
  /**
   * The group label, rendered as the `<legend>`. Required, deliberately — see
   * `ICheckboxGroupProps.label`.
   *
   * It is the radiogroup's accessible name (4.1.2), wired with
   * `aria-labelledby`, and announced on entering the group, so "Standard,
   * Express" says what it is a choice *of* (1.3.1, 3.3.2). Where a visible
   * label would repeat a heading right above it, keep the prop and set
   * `labelHidden`.
   */
  readonly label: ReactNode;
  /** Helper text for the group, wired to the fieldset with `aria-describedby`. */
  readonly description?: ReactNode;
  /**
   * The group's validation message. Wired to the fieldset with
   * `aria-describedby`, and turns every member radio invalid — red border and
   * `aria-invalid` — so the state is announced on each radio, not only once.
   */
  readonly error?: ReactNode;
  /** Radios to render from data. Rendered before any `children`. */
  readonly options?: readonly IRadioGroupOption[];
  /**
   * `<Radio>` elements, for markup an `options` array cannot express. Every
   * `Radio` inside the group joins it through context.
   */
  readonly children?: ReactNode;
  /**
   * The selected value, when controlled. `null` for "nothing selected" —
   * `undefined` means uncontrolled.
   */
  readonly value?: string | null;
  /**
   * The initially selected value, when uncontrolled.
   *
   * Applied as each radio's native `defaultChecked`, and from then on the DOM
   * owns the selection. That is what lets `form.reset()` put it back — see the
   * note in `RadioGroup.tsx`.
   */
  readonly defaultValue?: string | null;
  /**
   * Called with the newly selected value, controlled or not. Not called by
   * `form.reset()`, which changes the DOM without firing `change`.
   */
  readonly onValueChange?: (value: string) => void;
  /**
   * The `name` every radio submits under.
   *
   * Native radios only behave as one group — one tab stop, arrow keys moving
   * the selection, `required` meaning "one of these" — when they share a name,
   * so a generated one is used when this is omitted, as on
   * `SegmentedControl`. That generated name is submitted too if the group sits
   * inside a `<form>`; pass `name` whenever the value belongs in `FormData`.
   */
  readonly name?: string;
  /**
   * One radio must be selected. Set natively on every member, which for radios
   * means exactly that: the browser treats a radio group with any required
   * member as satisfied once any one of them is checked.
   */
  readonly required?: boolean;
  /**
   * `"vertical"` (default) stacks the radios; `"horizontal"` lays them out in a
   * wrapping row. Layout only — the arrow keys move through the radios in DOM
   * order either way, because that is what the browser does.
   */
  readonly orientation?: "vertical" | "horizontal";
  /** The size of every member radio that does not set its own. */
  readonly size?: RadioVariants["size"];
}

/** What a group shares with the `Radio` elements inside it. */
interface IRadioGroupContextValue {
  readonly name: string;
  /** `undefined` when the group is uncontrolled and the DOM owns the selection. */
  readonly value: string | null | undefined;
  readonly defaultValue: string | null | undefined;
  readonly select: (value: string) => void;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly size: RadioVariants["size"];
}

export type { IRadioGroupContextValue, IRadioGroupOption, IRadioGroupProps };
