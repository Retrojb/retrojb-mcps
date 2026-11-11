"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useRef, useState, type ReactElement } from "react";

import { Icon } from "../../../../content/icon";
import { codeSnippetStyles } from "./styles";
import type { ICodeSnippetProps, ICodeToken } from "./types";

/**
 * A code block with chrome: an optional header (file name and language), a copy
 * button, and bring-your-own syntax highlighting over a keyboard-focusable
 * scroll region. For a plain block with none of that, use `CodeBlock`; for a
 * fragment inside a line of text, use `Code`.
 *
 * @remarks
 * ### Why it is a client component and `CodeBlock` is not
 *
 * The copy button needs `navigator.clipboard` and a brief "Copied" state, which
 * means `"use client"` and React state. `CodeBlock` is deliberately server-only,
 * so the two are separate components rather than one with an optional button:
 * giving `CodeBlock` a copy button would push `"use client"` onto every plain
 * block that never needed it.
 *
 * ### Why highlighting is bring-your-own
 *
 * The component parses nothing and ships no language grammars. A caller runs
 * whatever highlighter it likes, tags each run with one of five
 * {@link ICodeToken} sentiments, and passes the result as `lines`; the component
 * paints each run with the matching `text-code-*` colour. This keeps the library
 * free of a heavyweight highlighting dependency and keeps the component a pure,
 * synchronous render — the tokeniser's output is data, not a runtime import. The
 * palette is five sentiments rather than a per-language grammar because the
 * component has no language to key on.
 *
 * ### Why `code` is required even when `lines` is given
 *
 * `code` is the single source of truth for the clipboard. The copy button
 * always copies `code`, never the token text, so the clipboard carries the real
 * source and never any highlight markup. `lines` only changes what is shown.
 *
 * ### Why the copy button has a word on it
 *
 * Colour and an icon alone cannot carry the control's purpose (1.4.1), so the
 * button reads "Copy" and swaps to "Copied" after a successful write. The
 * confirmation is also announced through an `aria-live="polite"` region, so a
 * screen reader user hears that the copy happened. The icon is decorative and
 * hidden from assistive technology, since the word already names the button.
 *
 * @example
 * ```tsx
 * <CodeSnippet
 *   title="install.sh"
 *   language="sh"
 *   label="Install command"
 *   code="npm install @retrojb/ui"
 * />
 * ```
 *
 * @example With a highlighter's output.
 * ```tsx
 * <CodeSnippet
 *   label="A tv() call"
 *   code={source}
 *   lines={tokenise(source)}
 * />
 * ```
 *
 * @a11y The code sits in a `role="region"` `<pre>` with `tabIndex={0}` and an
 * `aria-label` from `label`, so a keyboard user can focus and scroll it (2.1.1,
 * 4.1.2). The copy button is a native `<button type="button">` with a visible
 * text label; its result is announced through an `aria-live` region (1.4.1,
 * 4.1.2). Highlight sentiments reinforce the words and never replace them
 * (1.4.1), and each is solved for 4.5:1 on the code well (1.4.3). WCAG 1.4.1,
 * 1.4.3, 1.4.10, 1.4.11, 2.1.1, 2.4.7, 2.4.13, 4.1.2.
 *
 * @see packages/ui/src/components/typography/body/code/codeSnippet/CodeSnippetSpec.yaml
 * @see packages/ui/src/components/typography/body/code/CodeBlock.tsx
 *
 * @public
 */
const CodeSnippet = ({
  code,
  lines,
  label,
  title,
  language,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  onCopy,
  className,
  preClassName,
  ...props
}: ICodeSnippetProps): ReactElement => {
  const slots = codeSnippetStyles();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleCopy = useCallback((): void => {
    const write = async (): Promise<void> => {
      await navigator.clipboard.writeText(code);
      onCopy?.(code);
      setCopied(true);
      if (timer.current !== undefined) clearTimeout(timer.current);
      // Reset the label after a moment. The aria-live announcement has already
      // fired by the time this runs, so clearing it does not retract anything.
      timer.current = setTimeout(() => setCopied(false), 2000);
    };
    // A denied or unavailable clipboard leaves the button in its resting state.
    // The code is still selectable in the block, so copying by hand stays
    // possible; catching the rejection only keeps it from floating.
    write().catch(() => {});
  }, [code, onCopy]);

  const hasHeader = title != null || language != null;

  return (
    <figure className={slots.root({ class: className })} {...props}>
      {hasHeader ? (
        <div className={slots.header()}>
          {title != null ? (
            <figcaption className={slots.title()}>{title}</figcaption>
          ) : null}
          {language != null ? (
            <span className={slots.language()}>{language}</span>
          ) : null}
          <button
            type="button"
            className={slots.copyButton({
              // When there is no title, nothing pushes the button to the end,
              // so it leads; `ml-auto` keeps it against the trailing edge.
              class: title == null ? "ml-auto" : undefined,
            })}
            onClick={handleCopy}
          >
            <Icon icon={copied ? Check : Copy} size="sm" />
            {copied ? copiedLabel : copyLabel}
          </button>
        </div>
      ) : (
        // No header: float a copy button over the top corner of the well.
        <button
          type="button"
          className={slots.copyButton({
            class: "absolute end-(--space-2) top-(--space-2) z-10",
          })}
          onClick={handleCopy}
        >
          <Icon icon={copied ? Check : Copy} size="sm" />
          {copied ? copiedLabel : copyLabel}
        </button>
      )}

      <pre
        role="region"
        aria-label={label}
        tabIndex={0}
        className={slots.pre({ class: preClassName })}
      >
        <code className={slots.code()}>
          {lines === undefined
            ? code
            : lines.map((line, lineIndex) => (
                // Index keys are safe: lines render in source order and are
                // never reordered, filtered or appended to after render.
                <span key={lineIndex} className="block min-h-[1lh]">
                  {line.map((token: ICodeToken, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      className={slots.token({
                        sentiment: token.sentiment ?? "none",
                      })}
                    >
                      {token.text}
                    </span>
                  ))}
                </span>
              ))}
        </code>
      </pre>

      {/*
       * The copy result, announced but not shown. `aria-live="polite"` waits for
       * a pause; the visible confirmation is the button's own label swap.
       */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </figure>
  );
};

export { CodeSnippet };
