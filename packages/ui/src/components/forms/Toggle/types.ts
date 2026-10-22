import type { ComponentPropsWithRef, ReactNode } from "react";
import type { ToggleVariants } from "./styles";

interface IToggleProps
  extends
    Omit<
      ComponentPropsWithRef<"input">,
      "type" | "role" | "value" | "size" | "children"
    >,
    // `invalid` is computed from `error`, not passed by the caller.
    Omit<ToggleVariants, "invalid"> {
  /**
   * The visible label. Required, deliberately — see `IInputProps.label`.
   *
   * It is rendered inside the `<label>` that wraps the track, so it is both the
   * accessible name (4.1.2) and part of the click target (2.5.8). Name the
   * setting, not the state: "Wi-Fi", not "Turn Wi-Fi on" — the switch already
   * announces on or off.
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
   * The value submitted with the form when on. Narrowed to `string` because
   * that is what `FormData` returns. Omitted, the browser submits `"on"`.
   */
  readonly value?: string;
  /**
   * Called with the new on/off state. A convenience over `onChange`, which is
   * still called and still receives the native event.
   */
  readonly onCheckedChange?: (checked: boolean) => void;
  /** Wrapper class. `className` goes to the input — the track — itself. */
  readonly rootClassName?: string;
}

export type { IToggleProps };
