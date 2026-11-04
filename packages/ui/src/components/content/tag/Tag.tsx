import { type ReactElement } from "react";

import { tagStyles } from "./styles";
import type { ITagProps } from "./types";

/**
 * A short, non-interactive label attached to an item to categorise it or state
 * its status. It is not a control; use `Chip` for a toggle or filter.
 *
 * @remarks
 * ### Why it is not interactive
 *
 * A tag only names something. It renders a plain `<span>` with no role, no tab
 * stop and no handlers, so a screen reader reads it as text in the flow. A
 * thing that can be pressed is a different component with a different contract
 * (`Chip`), and giving `Tag` an `onClick` would put a click target on an
 * element that assistive technology announces as static text.
 *
 * ### Why the label is required text
 *
 * Colour alone cannot carry the meaning (1.4.1), so the word is the signal and
 * `tone` only reinforces it. A `danger` tag reading "Deprecated" works in
 * greyscale and in forced-colors mode; a red tag with no label would not.
 *
 * ### Why there is no `warning` tone
 *
 * The palette ships no `--warning` token. See `alerts/tone.ts`.
 *
 * ### Why it has no `"use client"`
 *
 * It uses no hooks or browser APIs, so it renders in a server component.
 *
 * @example
 * ```tsx
 * <Tag text="Shipped" tone="success" />
 * ```
 *
 * @a11y Renders a `<span>` with no role, named by its own text. No
 * interaction: it is not focusable and has no keyboard behaviour. The border is
 * a real border, so it survives forced-colors mode. Target size (2.5.8) does
 * not apply because the tag is not a target. WCAG 1.4.1, 1.4.3, 1.4.11.
 *
 * @see packages/ui/src/components/content/tag/TagSpec.yaml
 * @see apps/retrojb-storybook/src/stories/content/Tag.stories.tsx
 * @see apps/retrojb-storybook/src/stories/content/Tag.mdx
 * @see apps/retrojb-storybook/src/stories/content/accessibilityDocs/TagAccessibility.mdx
 * @see packages/ui/src/components/content/chip/ChipSpec.yaml
 *
 * @public
 */
const Tag = ({
  className,
  text,
  tone,
  size,
  ...props
}: ITagProps): ReactElement => {
  return (
    <span className={tagStyles({ tone, size, className })} {...props}>
      {text}
    </span>
  );
};

export { Tag };
