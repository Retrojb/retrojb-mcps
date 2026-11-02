import { Unstyled } from "@storybook/addon-docs/blocks";
import { Paragraph, type IParagraphProps } from "@retrojb/ui";
import type { ReactElement } from "react";
import styles from "./DocParagraph.module.css";

type IDocParagraphProps = IParagraphProps;

/**
 * A design-system `Paragraph` for Storybook MDX docs.
 *
 * ```mdx
 * <DocParagraph tone="muted">Status: Developed</DocParagraph>
 * ```
 *
 * Wrapped in `<Unstyled>` so Storybook's docs typography does not override the
 * body type role. `measure` defaults to `true` here: docs pages are long-form
 * reading text, and the docs column is wider than 65ch.
 */
const DocParagraph = ({
  measure = true,
  className,
  ...props
}: IDocParagraphProps): ReactElement => (
  <Unstyled>
    <Paragraph
      measure={measure}
      className={[styles.paragraph, className].filter(Boolean).join(" ")}
      {...props}
    />
  </Unstyled>
);

export { DocParagraph };
export type { IDocParagraphProps };
