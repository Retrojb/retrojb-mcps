import { Unstyled } from "@storybook/addon-docs/blocks";
import {
  Code,
  CodeBlock,
  type ICodeBlockProps,
  type ICodeProps,
} from "@retrojb/ui";
import type { ReactElement } from "react";
import styles from "./DocCode.module.css";

type IDocCodeProps = ICodeProps;
type IDocCodeBlockProps = ICodeBlockProps;

/**
 * Design-system inline `Code` for Storybook MDX docs.
 *
 * ```mdx
 * <DocParagraph>Import <DocCode>Button</DocCode> from the package.</DocParagraph>
 * ```
 *
 * Not wrapped in `<Unstyled>`: that renders a `<div>`, which would break the
 * line it sits in. The `sb-unstyled` class on the `<code>` itself opts it out
 * of Storybook's docs styles the same way.
 */
const DocCode = ({ className, ...props }: IDocCodeProps): ReactElement => (
  <Code
    className={["sb-unstyled", className].filter(Boolean).join(" ")}
    {...props}
  />
);

/**
 * A design-system `CodeBlock` for Storybook MDX docs.
 *
 * ```mdx
 * <DocCodeBlock label="Install command">npm install @retrojb/ui</DocCodeBlock>
 * ```
 *
 * `label` is required, as on `CodeBlock`: the block is a focusable scroll
 * region and needs a name (2.1.1, 4.1.2). Plain text, no syntax highlighting.
 */
const DocCodeBlock = ({
  className,
  ...props
}: IDocCodeBlockProps): ReactElement => (
  <Unstyled>
    <CodeBlock
      className={[styles.block, className].filter(Boolean).join(" ")}
      {...props}
    />
  </Unstyled>
);

export { DocCode, DocCodeBlock };
export type { IDocCodeBlockProps, IDocCodeProps };
