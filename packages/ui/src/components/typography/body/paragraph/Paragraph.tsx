import { type ReactElement } from "react";
import { paragraphStyles } from "./styles";
import type { IParagraphProps } from "./types";

/**
 * A paragraph of running text.
 *
 * ```tsx
 * <Paragraph size="lg" measure>
 *   Retro Studio keeps your design tokens and your components in step.
 * </Paragraph>
 * ```
 *
 * `size` is `lg` for a lead paragraph, `md` (the default) for reading text and
 * `sm` for component copy. `tone="muted"` is for supporting text; it still
 * clears 4.5:1 on every surface. `measure` caps the line length at 65ch.
 *
 * Always a `<p>`. Copy that is not a paragraph — a label, a list, a quotation —
 * has an element of its own, and dressing it as one would hide that structure
 * from assistive technology (1.3.1).
 */
const Paragraph = ({
  size,
  tone,
  measure,
  className,
  ...props
}: IParagraphProps): ReactElement => (
  <p
    className={paragraphStyles({ size, tone, measure, className })}
    {...props}
  />
);

export { Paragraph };
