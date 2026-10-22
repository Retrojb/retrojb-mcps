import { type ReactElement } from "react";
import { codeBlockStyles } from "./styles";
import type { ICodeBlockProps } from "./types";

/**
 * A block of code: `<pre><code>`, scrolling sideways when a line is too long.
 *
 * ```tsx
 * <CodeBlock label="Install command">npm install @retrojb/ui</CodeBlock>
 * ```
 *
 *
 * WHY IT IS ALWAYS FOCUSABLE
 *
 * A region that scrolls horizontally is unreachable to a keyboard user unless it
 * can take focus — arrow keys scroll whatever is focused, and nothing inside a
 * `<pre>` is (2.1.1). So the `<pre>` gets `tabIndex={0}`, and with it
 * `role="region"` and an `aria-label` from `label`, so the stop it adds is
 * announced as something rather than as an unnamed group.
 *
 * It is focusable whether or not it currently overflows. Knowing that would mean
 * measuring `scrollWidth` after layout, and again on every resize, which needs
 * an effect and a `ResizeObserver` — and would make this a client component for
 * the sake of removing one tab stop from short blocks. Overflow also depends on
 * the viewport and the text size, so a block that fits at 100% zoom does not at
 * 200%; always-focusable is the version that cannot be wrong. Pass
 * `tabIndex={-1}` for a block you know never scrolls.
 */
const CodeBlock = ({
  label,
  className,
  codeClassName,
  children,
  ...props
}: ICodeBlockProps): ReactElement => {
  const slots = codeBlockStyles();

  return (
    <pre
      role="region"
      aria-label={label}
      tabIndex={0}
      className={slots.root({ class: className })}
      {...props}
    >
      <code className={slots.code({ class: codeClassName })}>{children}</code>
    </pre>
  );
};

export { CodeBlock };
