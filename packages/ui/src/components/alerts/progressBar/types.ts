import type { ComponentPropsWithRef, ReactNode } from "react";
import type { ProgressBarVariants } from "./styles";

/**
 * A determinate bar's value, after clamping, as handed to `formatValue`.
 *
 * `value`, `min` and `max` are on the caller's scale; `percent` is the same
 * position as 0–100, unrounded.
 */
interface IProgressBarValue {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly percent: number;
}

interface IProgressBarProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "role">,
    Omit<ProgressBarVariants, "indeterminate" | "showValue"> {
  /**
   * The visible label. Required, deliberately — see `IInputProps.label`.
   *
   * It is the progressbar's accessible name (4.1.2), wired with
   * `aria-labelledby`, so "Uploading report.pdf" is announced with the value
   * rather than an unnamed "progress bar, 40". Use `labelHidden` when a heading
   * right above already says what is loading; the label then stays as the name
   * without being drawn.
   */
  readonly label: ReactNode;
  /** Helper text under the bar, wired with `aria-describedby`. */
  readonly description?: ReactNode;
  /**
   * The current value, between `min` and `max`. Clamped to that range.
   *
   * `undefined` or `null` (or a non-finite number) makes the bar
   * indeterminate: an animated "working, amount unknown" state with no
   * `aria-valuenow`, `aria-valuemin` or `aria-valuemax`. Use it when there is no
   * honest number to show, rather than a fake one.
   */
  readonly value?: number | null;
  /** The start of the range. Defaults to `0`. */
  readonly min?: number;
  /**
   * The end of the range. Defaults to `100`. A `max` at or below `min` is
   * raised to `min`, and the bar then draws empty.
   */
  readonly max?: number;
  /**
   * What assistive technology says instead of the bare number, as
   * `aria-valuetext` — "3 of 10 files", "Step 2: Payment".
   *
   * Without it, the value is exposed as `aria-valuenow` on the `min`–`max`
   * scale and the screen reader chooses how to phrase it. Set this whenever
   * the number alone does not say what is being counted. Also allowed on an
   * indeterminate bar ("Connecting…").
   */
  readonly valueText?: string;
  /**
   * Draws the value as text beside the label. Off by default. Ignored while
   * the bar is indeterminate, since there is no value to show.
   *
   * The readout is `aria-hidden`: the progressbar already exposes the value,
   * and reading it twice in browse mode adds nothing.
   */
  readonly showValue?: boolean;
  /**
   * Formats the visible readout. Defaults to a whole percentage, rounded
   * *down*, so the bar never reads "100%" before it is complete.
   *
   * When this is set and `valueText` is not, its result is also used as
   * `aria-valuetext`, so a readout of "3 of 10 files" is what is announced
   * too, and the screen and the speech never disagree.
   */
  readonly formatValue?: (progress: IProgressBarValue) => string;
  /** Wrapper class. `className` goes to the `role="progressbar"` track. */
  readonly rootClassName?: string;
}

export type { IProgressBarProps, IProgressBarValue };
