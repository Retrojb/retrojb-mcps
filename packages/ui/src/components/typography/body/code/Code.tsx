import { type ReactElement } from "react";
import { codeStyles } from "./styles";
import type { ICodeProps } from "./types";

/**
 * Inline code: an identifier, a command, a value.
 *
 * ```tsx
 * <Paragraph>
 *   Call <Code>tv()</Code> from <Code>lib/tv.ts</Code>.
 * </Paragraph>
 * ```
 *
 * Sized in `em`, so it follows the text around it. For more than a line, use
 * `CodeBlock`.
 */
const Code = ({ className, ...props }: ICodeProps): ReactElement => (
  <code className={codeStyles({ className })} {...props} />
);

export { Code };
