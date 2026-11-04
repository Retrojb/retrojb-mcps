"use client";

import { Check } from "lucide-react";
import { type MouseEvent, type ReactElement } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { Icon } from "../icon";
import { chipStyles } from "./styles";
import type { IChipProps } from "./types";

/**
 * A small toggle button for filter-style selection: pressing it switches it on
 * and off. It is the interactive sibling of `Tag`, which is a static label. It
 * only toggles; a removable chip with an "x" is a different contract and is
 * not built here.
 *
 * @remarks
 * ### Why it is a button with `aria-pressed`
 *
 * A chip is one native `<button type="button">`. The browser supplies the tab
 * stop, Enter and Space, `disabled` and the click, and `aria-pressed` makes a
 * screen reader announce "Open, toggle button, pressed". The attribute is
 * always written as `true` or `false`; leaving it off when unselected would
 * turn the control back into a plain button with no state. `type` is fixed at
 * `"button"` so a chip inside a form never submits it.
 *
 * ### Why a checkmark appears when selected
 *
 * The filled style is colour alone, which 1.4.1 does not allow to carry a
 * state. A selected chip also draws a check icon, so the state reads in
 * greyscale and in forced-colors mode. The icon is decorative and hidden from
 * assistive technology, since `aria-pressed` already says it. An unselected
 * chip reserves no space for it, so the chip grows by one icon and its gap
 * when selected. In a wrapping row that can move the chips after it. Reserving
 * the space would leave an unexplained gap on every unselected chip, and the
 * icon is what tells the two states apart, so the shift is the smaller cost.
 *
 * ### Why there is no `onRemove`
 *
 * A removable or input chip, with an "x" button inside it, is a different
 * contract: two controls in one, with two names and two tab stops. It is not
 * built here. `Chip` only toggles.
 *
 * ### Why there is no ChipGroup
 *
 * A set of chips is a group, and the caller names it. Wrap them in an element
 * with `role="group"` and an accessible name, or in a `<fieldset>` with a
 * `<legend>`:
 *
 * ```tsx
 * <div role="group" aria-labelledby="status-label">
 *   <span id="status-label">Status</span>
 *   <Chip text="Open" />
 *   <Chip text="Closed" />
 * </div>
 * ```
 *
 * ### Why `selected` and `defaultSelected`
 *
 * The state is React state in both modes through `useControllableState`, so
 * the same toggle works controlled and uncontrolled. The caller's `onClick`
 * runs first and the chip does not toggle if it calls `preventDefault`.
 *
 * ### When to use something else
 *
 * `Tag` is a label that cannot be pressed. `Toggle` is a setting that applies
 * at once and is announced as a switch. `Checkbox` is a choice submitted with a
 * form. `SegmentedControl` is exactly one of a few options. `Button` runs an
 * action and has no state.
 *
 * @example
 * ```tsx
 * <Chip text="Open" defaultSelected onSelectedChange={(on) => setOpen(on)} />
 * ```
 *
 * @a11y Renders a native `<button type="button">` with `aria-pressed` set to
 * `true` or `false`, named by the required `text` prop. Enter and Space toggle
 * it, and a disabled chip leaves the tab order. Selected is shown by a check
 * icon as well as the fill. Focus is a 2px outline at a 2px offset that
 * survives forced-colors mode. Both sizes meet the 24px target in 2.5.8 and
 * neither meets the 44px target in 2.5.5. A set of chips needs a named
 * `role="group"` from the caller. WCAG 1.4.1, 1.4.3, 1.4.11, 2.3.3, 2.4.7,
 * 2.4.13, 2.5.5, 2.5.8, 4.1.2.
 *
 * @see packages/ui/src/components/content/chip/ChipSpec.yaml
 * @see apps/retrojb-storybook/src/stories/content/Chip.stories.tsx
 * @see apps/retrojb-storybook/src/stories/content/Chip.mdx
 * @see apps/retrojb-storybook/src/stories/content/accessibilityDocs/ChipAccessibility.mdx
 * @see packages/ui/src/components/content/tag/TagSpec.yaml
 *
 * @public
 */
const Chip = ({
  className,
  text,
  size,
  selected: selectedProp,
  defaultSelected = false,
  onSelectedChange,
  onClick,
  ...props
}: IChipProps): ReactElement => {
  const [selected, setSelected] = useControllableState<boolean>({
    value: selectedProp,
    defaultValue: defaultSelected,
    onChange: onSelectedChange,
  });

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      setSelected(!selected);
    }
  };

  return (
    <button
      {...props}
      type="button"
      aria-pressed={selected}
      className={chipStyles({ size, className })}
      onClick={handleClick}
    >
      {selected ? <Icon icon={Check} size="sm" /> : null}
      {text}
    </button>
  );
};

export { Chip };
