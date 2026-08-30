/** Numeric helpers. */

/** Constrains `value` to the inclusive range `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Rounds to `decimals` places.
 *
 * Uses the multiply-round-divide form, which is exact enough for display and
 * comparison at the precision anything here needs.
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Sums a list of numbers. */
export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
