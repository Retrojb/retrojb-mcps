import type { ComponentPropsWithRef, ReactNode } from "react";
import type { SegmentedControlVariants } from "./styles";

/** One segment in `SegmentedControl`'s `options` array. */
interface ISegmentedControlOption {
  /** Submitted with the form, and what `value` / `onValueChange` carry. */
  readonly value: string;
  /**
   * The segment's visible text and its accessible name. Keep it short — a
   * segmented control is a row that does not wrap. For an icon-only segment,
   * pass the icon with an accessible name of its own (an SVG with `<title>`,
   * or visually hidden text next to it).
   */
  readonly label: ReactNode;
  /** Takes this one segment out of the group; arrow keys skip it. */
  readonly disabled?: boolean;
}

interface ISegmentedControlProps
  extends
    Omit<
      ComponentPropsWithRef<"fieldset">,
      "children" | "defaultValue" | "name" | "role"
    >,
    SegmentedControlVariants {
  /**
   * The group label, rendered as the `<legend>`. Required, deliberately — see
   * `ICheckboxGroupProps.label`.
   *
   * It is the radiogroup's accessible name (4.1.2), wired with
   * `aria-labelledby`, and announced on entering the group, so "Day, Week,
   * Month" says what it is a choice *of* (1.3.1, 3.3.2). Where a visible label
   * would repeat a heading right above it, keep the prop and set `labelHidden`.
   */
  readonly label: ReactNode;
  /** The segments, in order. */
  readonly options: readonly ISegmentedControlOption[];
  /**
   * The selected value, when controlled. `null` for "nothing selected" —
   * `undefined` means uncontrolled, as in `useControllableState`.
   */
  readonly value?: string | null;
  /** The initially selected value, when uncontrolled. Read once, on mount. */
  readonly defaultValue?: string | null;
  /** Called with the newly selected value, controlled or not. */
  readonly onValueChange?: (value: string) => void;
  /**
   * The `name` every radio submits under.
   *
   * Native radios only behave as one group — one tab stop, arrow keys moving
   * the selection — when they share a name, so a generated one is used when
   * this is omitted. That generated name is submitted too if the control sits
   * inside a `<form>`; pass `name` whenever the value belongs in `FormData`.
   */
  readonly name?: string;
}

export type { ISegmentedControlOption, ISegmentedControlProps };
