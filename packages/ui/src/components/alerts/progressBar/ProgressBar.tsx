"use client";

import { useId, type ReactElement } from "react";
import { progressBarStyles } from "./styles";
import type { IProgressBarProps, IProgressBarValue } from "./types";

/**
 * The default readout: a whole percentage, rounded down.
 *
 * Down rather than to nearest, so 99.6% reads "99%" and "100%" only appears
 * when the work is done. The `toFixed` first absorbs float noise —
 * `(29 / 100) * 100` is 28.999…, which would otherwise floor to 28.
 */
const formatPercent = ({ percent }: IProgressBarValue): string =>
  `${String(Math.floor(Number(percent.toFixed(6))))}%`;

/**
 * The clamped position in the range, or `null` for an indeterminate bar.
 *
 * `null`, `undefined` and non-finite numbers are all indeterminate: `NaN`
 * from a failed division is "unknown", not 0%.
 */
const resolveProgress = (
  value: number | null | undefined,
  min: number,
  max: number,
): IProgressBarValue | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const clamped = Math.min(max, Math.max(min, value));
  return {
    value: clamped,
    min,
    max,
    percent: max > min ? ((clamped - min) / (max - min)) * 100 : 0,
  };
};

/**
 * A labelled progress bar, determinate or indeterminate.
 *
 * ```tsx
 * <ProgressBar label="Uploading report.pdf" value={40} showValue />
 * <ProgressBar
 *   label="Importing files"
 *   value={3}
 *   max={10}
 *   valueText="3 of 10 files"
 * />
 * <ProgressBar label="Connecting" />
 * ```
 *
 *
 * WHY `role="progressbar"` ON A DIV, NOT `<progress>`
 *
 * `<progress>` has the right semantics for free, but three things count
 * against it here:
 *
 *   - Styling. Its parts are reached through engine-specific pseudo-elements
 *     (`::-webkit-progress-bar`, `::-webkit-progress-value`,
 *     `::-moz-progress-bar`) that cannot be written as utilities, and its
 *     indeterminate state is drawn by the engine with very little control over
 *     it. The reduced-motion and forced-colors behaviour this component
 *     promises could not be made the same across browsers.
 *   - `min`. `<progress>` has no `min` attribute; its range always starts at
 *     0. A "step 3 of 5, counting from 1" bar would have to be rescaled, and
 *     the value assistive technology reports would no longer be the caller's.
 *   - Nothing is lost by not using it. `<progress>` is not form-associated
 *     and takes no input, so there is no keyboard or `FormData` behaviour to
 *     rebuild — unlike the native radios `SegmentedControl` keeps for exactly
 *     that reason.
 *
 * So the track is a `<div role="progressbar">` with `aria-valuenow`,
 * `aria-valuemin` and `aria-valuemax` set while there is a value. All three
 * are omitted while indeterminate: without `aria-valuenow` the bar is
 * indeterminate in ARIA's terms, and a range with no position in it says
 * nothing useful. The name comes from the visible label via
 * `aria-labelledby`; a `<label for>` does not apply to a `div`.
 *
 *
 * WHY THE BAR IS NOT A LIVE REGION
 *
 * A progressbar is not a live region, and this one does not make itself one.
 * A bar that announced every change would talk over everything else for as
 * long as the work ran. Users who want the number can move to the bar and
 * read it. What usually deserves an announcement is the *end* — "Upload
 * complete", "Import failed" — and that is a status message (4.1.3), best sent
 * through an `InlineAlert` with `live="polite"` (or `"assertive"` for a
 * failure) that was mounted before the work started; see the note on why its
 * wrapper is always rendered.
 *
 * While content is loading, set `aria-busy="true"` on the region being
 * loaded, not on the bar, and point that region at the bar with
 * `aria-describedby` if it helps. Clear `aria-busy` when the content is
 * in place.
 */
const ProgressBar = ({
  label,
  description,
  value,
  min = 0,
  max = 100,
  valueText,
  showValue = false,
  formatValue,
  size,
  tone,
  fullWidth,
  labelHidden,
  className,
  rootClassName,
  "aria-describedby": ariaDescribedBy,
  ...props
}: IProgressBarProps): ReactElement => {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const descriptionId = `${generatedId}-description`;

  const hasDescription = description != null && description !== false;

  /*
   * The range, made safe to divide by. A non-finite `min` falls back to 0 and
   * a non-finite `max` to 100; a `max` below `min` is raised to it, and a
   * zero-width range draws empty rather than dividing by zero.
   */
  const lower = Number.isFinite(min) ? min : 0;
  const upper = Math.max(lower, Number.isFinite(max) ? max : 100);

  const progress = resolveProgress(value, lower, upper);

  const indeterminate = progress === null;
  const formatted =
    progress === null ? null : (formatValue ?? formatPercent)(progress);
  const readout = showValue && formatted !== null;

  /*
   * An explicit `valueText` always wins. Otherwise a custom formatter's output
   * is announced too, so the readout and the speech say the same thing. The
   * default percentage is not copied across: `aria-valuenow` on the range
   * already carries it, and the screen reader phrases it.
   */
  const ariaValueText =
    valueText ??
    (formatValue !== undefined ? (formatted ?? undefined) : undefined);

  const slots = progressBarStyles({
    size,
    tone,
    fullWidth,
    labelHidden,
    showValue: readout,
    indeterminate,
  });

  // Same composition as `Input`: ours first, then whatever the caller already
  // associated.
  const describedBy =
    [hasDescription ? descriptionId : null, ariaDescribedBy]
      .filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      )
      .join(" ") || undefined;

  return (
    <div className={slots.root({ class: rootClassName })}>
      <div className={slots.header()}>
        <span id={labelId} className={slots.label()}>
          {label}
        </span>
        {readout ? (
          // Hidden from assistive technology: the progressbar exposes the
          // value itself, so reading it here as well would say it twice.
          <span className={slots.value()} aria-hidden="true">
            {formatted}
          </span>
        ) : null}
      </div>
      <div
        {...props}
        role="progressbar"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-valuenow={progress?.value}
        aria-valuemin={progress?.min}
        aria-valuemax={progress?.max}
        aria-valuetext={ariaValueText}
        className={slots.track({ class: className })}
      >
        <div
          className={slots.indicator()}
          style={
            progress === null
              ? undefined
              : // Four decimals: far below a pixel, and no float noise in the DOM.
                {
                  inlineSize: `${String(Number(progress.percent.toFixed(4)))}%`,
                }
          }
        />
      </div>
      {hasDescription ? (
        <p className={slots.description()} id={descriptionId}>
          {description}
        </p>
      ) : null}
    </div>
  );
};

export { ProgressBar };
