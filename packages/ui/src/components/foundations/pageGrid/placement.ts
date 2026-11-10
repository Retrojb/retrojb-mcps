import type { CSSProperties } from "react";
import type { GridBreakpoint, GridResponsive, GridSpan } from "./types";

/** Smallest to largest, the order a responsive value falls back through. */
const GRID_BREAKPOINTS = [
  "base",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const satisfies readonly GridBreakpoint[];

const isPerBreakpoint = <T>(
  value: GridResponsive<T>,
): value is Readonly<Partial<Record<GridBreakpoint, T>>> =>
  typeof value === "object" && value !== null;

const at = <T>(
  value: GridResponsive<T> | undefined,
  breakpoint: GridBreakpoint,
): T | undefined => {
  if (value === undefined) return undefined;
  if (isPerBreakpoint(value)) return value[breakpoint];
  return breakpoint === "base" ? value : undefined;
};

const wholeNumber = (value: number, min: number): number =>
  Number.isFinite(value) ? Math.max(min, Math.round(value)) : min;

/**
 * The custom properties that place an element on the page grid, for use as
 * its `style`. `GridItem` calls this; call it yourself to place an element
 * styled with `gridItemStyles()` that `GridItem` cannot render.
 *
 * @remarks
 * Every property is written, set or not. An unset breakpoint is `initial`,
 * which makes `var()` use its fallback, so the classes in `gridItemStyles`
 * fall back to the next smaller breakpoint. Writing `initial` rather than
 * leaving the property out matters because custom properties inherit: a
 * `GridItem` inside another one would otherwise pick up its parent's span and
 * offset.
 *
 * `"full"` spans `--grid-columns` and resets the start to `auto`. An
 * auto-placed item that spans every column starts a new row on its own, and
 * the reset stops an offset set at a smaller breakpoint from carrying over and
 * pushing the full-width item past the last column. That is also why `"full"`
 * ignores `offset` at the same breakpoint.
 *
 * @example
 * ```tsx
 * <section
 *   className={gridItemStyles()}
 *   style={gridItemPlacement({ base: "full", lg: 8 }, { lg: 2 })}
 * />
 * ```
 *
 * @beta
 */
const gridItemPlacement = (
  span?: GridResponsive<GridSpan>,
  offset?: GridResponsive<number>,
): CSSProperties => {
  const vars: Record<string, string> = {};
  for (const breakpoint of GRID_BREAKPOINTS) {
    const suffix = breakpoint === "base" ? "" : `-${breakpoint}`;
    const spanHere = at(span, breakpoint);
    const offsetHere = at(offset, breakpoint);
    vars[`--gi-span${suffix}`] = "initial";
    vars[`--gi-start${suffix}`] = "initial";
    if (spanHere === "full") {
      vars[`--gi-span${suffix}`] = "var(--grid-columns)";
      vars[`--gi-start${suffix}`] = "auto";
      continue;
    }
    if (spanHere !== undefined) {
      vars[`--gi-span${suffix}`] = String(wholeNumber(spanHere, 1));
    }
    if (offsetHere !== undefined) {
      vars[`--gi-start${suffix}`] = String(wholeNumber(offsetHere, 0) + 1);
    }
  }
  return vars;
};

export { GRID_BREAKPOINTS, gridItemPlacement };
