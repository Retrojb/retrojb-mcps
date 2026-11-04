import type { ComponentPropsWithRef } from "react";
import type { ChipVariants } from "./styles";

/**
 * The props of `Chip`: a native `<button>`'s props, the `size` variant, the
 * required `text` label and the selection state.
 *
 * @remarks
 * `type`, `aria-pressed` and `children` are removed because the component owns
 * them: `type` is always `"button"`, `aria-pressed` is written from the
 * selection state, and the content is `text` plus the check icon. `ref` and
 * `className` reach the `<button>`.
 *
 * @public
 */
interface IChipProps
  extends
    Omit<ComponentPropsWithRef<"button">, "type" | "aria-pressed" | "children">,
    ChipVariants {
  /**
   * The visible label. It is also the chip's accessible name, and the word is
   * what says what the chip filters by, so it is required.
   */
  readonly text: string;
  /**
   * Whether the chip is on, when the caller owns the state. Pair it with
   * `onSelectedChange`. Leave it `undefined` to let the chip keep its own
   * state, starting from `defaultSelected`.
   */
  readonly selected?: boolean;
  /**
   * Whether the chip starts on, when the chip owns the state. Read once, on
   * mount. Ignored while `selected` is set.
   *
   * @default false
   */
  readonly defaultSelected?: boolean;
  /**
   * Called with the next state each time a press toggles the chip, in both
   * controlled and uncontrolled use. It is not called when the caller's
   * `onClick` calls `preventDefault`.
   */
  readonly onSelectedChange?: (selected: boolean) => void;
  /**
   * Height and type size: `sm` is 24px with `label-sm`, `md` is 32px with
   * `label-md`. Both clear the 24px target in WCAG 2.5.8; neither reaches the
   * 44px in 2.5.5.
   *
   * @default sm
   */
  readonly size?: ChipVariants["size"];
}

export type { IChipProps };
