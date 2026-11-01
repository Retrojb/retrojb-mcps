import type { ComponentPropsWithRef, ReactNode } from "react";
import type { RadioVariants } from "./styles";

interface IRadioProps
  extends
    Omit<
      ComponentPropsWithRef<"input">,
      "type" | "value" | "children" | "size"
    >,
    Omit<RadioVariants, "invalid"> {
  /**
   * The visible label. Required, deliberately — see `IInputProps.label`.
   *
   * It is rendered inside the `<label>` that wraps the circle, so it is both the
   * accessible name (4.1.2) and part of the click target (2.5.8).
   */
  readonly label: ReactNode;
  /** Helper text, wired to the input with `aria-describedby`. */
  readonly description?: ReactNode;
  /**
   * The validation message. Presence sets `aria-invalid` and the red border, so
   * the styling cannot appear without being announced. Inside a `RadioGroup`,
   * prefer the group's `error`: a radio group is one question with one answer.
   */
  readonly error?: ReactNode;
  /**
   * The value submitted with the form when selected. Required, unlike on
   * `Checkbox`: a radio without one submits `"on"`, which no sibling can be
   * told apart from, and inside a `RadioGroup` it is what the group's `value`
   * is compared against.
   */
  readonly value: string;
  /**
   * `sm` / `md` / `lg`. Inside a `RadioGroup` this falls back to the group's
   * `size`; set here, it wins.
   */
  readonly size?: RadioVariants["size"];
  /** Wrapper class. `className` goes to the input itself. */
  readonly rootClassName?: string;
}

export type { IRadioProps };
