import type { ComponentPropsWithRef, ReactNode } from "react";

interface ICheckboxProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "children"
> {
  /**
   * The visible label. Required, deliberately — see `IInputProps.label`.
   *
   * It is rendered inside the `<label>` that wraps the box, so it is both the
   * accessible name (4.1.2) and part of the click target (2.5.8).
   */
  readonly label: ReactNode;
  /** Helper text, wired to the input with `aria-describedby`. */
  readonly description?: ReactNode;
  /**
   * The validation message. Presence sets `aria-invalid` and the red border, so
   * the styling cannot appear without being announced.
   */
  readonly error?: ReactNode;
  /**
   * The "mixed" state, for a parent whose children are partly selected.
   *
   * There is no HTML attribute for it — only the DOM property — so the component
   * sets it through a ref after every render. The input then reports `mixed` to
   * assistive technology natively. Independent of `checked`: a checkbox can be
   * both, and is drawn with the dash while it is.
   */
  readonly indeterminate?: boolean;
  /**
   * The value submitted with the form when checked. Narrowed to `string` because
   * that is what `FormData` returns and what `CheckboxGroup` collects.
   *
   * Inside a `CheckboxGroup` this is what makes the checkbox a member: one with
   * no `value` ignores the group and behaves as a standalone checkbox.
   */
  readonly value?: string;
  /**
   * Called with the new checked state. A convenience over `onChange`, which is
   * still called and still receives the native event.
   */
  readonly onCheckedChange?: (checked: boolean) => void;
  /** Wrapper class. `className` goes to the input itself. */
  readonly rootClassName?: string;
}

export type { ICheckboxProps };
