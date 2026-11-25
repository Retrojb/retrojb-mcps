import type { ComponentPropsWithRef, ReactNode } from "react";

/**
 * One of the five code-highlight sentiments. A bring-your-own highlighter maps
 * its language tokens onto these, and `CodeSnippet` paints each run with the
 * matching `text-code-*` utility.
 *
 * @remarks
 * These are sentiments, not grammar categories, on purpose: the component does
 * no parsing and ships no language definitions, so it needs a small fixed
 * palette rather than one class per token type in every language. A highlighter
 * decides that, say, a keyword is `special` and a comment is `neutral`.
 *
 *   - `positive` — an added line, a string literal, a success-like value.
 *   - `negative` — a removed line, an error, a deletion.
 *   - `special` — a keyword, a type, a reserved word.
 *   - `emphasis` — a function name, an attribute, the run being pointed at.
 *   - `neutral` — a comment, punctuation, a de-emphasised run.
 *
 * A run with no sentiment inherits the block's foreground colour.
 *
 * @public
 */
type CodeSentiment =
  | "positive"
  | "negative"
  | "special"
  | "emphasis"
  | "neutral";

/**
 * One tokenised run of code: the text, and optionally the sentiment it should
 * be painted with. The `text` is what the copy button copies, so it is always
 * the real source, never a colour name or a class.
 *
 * @public
 */
interface ICodeToken {
  /** The literal source text of this run. Whitespace is preserved. */
  readonly text: string;
  /**
   * How to paint this run. Omit for a run that takes the block's default
   * foreground colour.
   */
  readonly sentiment?: CodeSentiment;
}

/**
 * The props of `CodeSnippet`: a `<figure>`'s props, the content (plain `code`
 * or pre-tokenised `lines`), the header, and the copy affordance.
 *
 * @remarks
 * `code` is always required. It is the single source of truth for what the copy
 * button puts on the clipboard, and it is what renders when `lines` is absent.
 * `lines` is the bring-your-own-highlighter channel: when a highlighter has
 * tokenised the source, pass the tokens and the component paints them, but it
 * still copies `code` so the clipboard never carries highlight markup.
 *
 * @public
 */
interface ICodeSnippetProps extends Omit<
  ComponentPropsWithRef<"figure">,
  "children" | "title" | "onCopy"
> {
  /**
   * The raw source. Required: this is exactly what the copy button copies, and
   * what renders when no `lines` are supplied. Whitespace is preserved.
   */
  readonly code: string;
  /**
   * Pre-tokenised lines from a highlighter: an array of lines, each an array of
   * runs. When present, the component renders these instead of the plain
   * `code`. The concatenated token text should equal `code`; the copy button
   * copies `code` regardless, so a mismatch only affects what is shown.
   */
  readonly lines?: readonly (readonly ICodeToken[])[];
  /**
   * The accessible name of the scrollable code region. Required for the same
   * reason as on `CodeBlock`: the region is keyboard-focusable, and a focusable
   * element with no name is announced as nothing (WCAG 4.1.2). A `title` does
   * not substitute, since it is decorative chrome.
   */
  readonly label: string;
  /**
   * An optional header label, typically a file name such as `tv.ts`. When set,
   * a header bar renders above the code.
   */
  readonly title?: ReactNode;
  /**
   * An optional language badge shown in the header, such as `tsx`. Display
   * only: it does not drive highlighting, which the caller does.
   */
  readonly language?: string;
  /**
   * The copy button's resting label. Visible text, not an icon alone, so the
   * control's purpose survives greyscale and forced-colors mode (WCAG 1.4.1).
   *
   * @default "Copy"
   */
  readonly copyLabel?: string;
  /**
   * The label shown briefly after a successful copy. Announced to assistive
   * technology through an `aria-live` region.
   *
   * @default "Copied"
   */
  readonly copiedLabel?: string;
  /** Called with the copied source after the clipboard write succeeds. */
  readonly onCopy?: (code: string) => void;
  /** Class for the inner scrollable `<pre>`. `className` goes to the `<figure>`. */
  readonly preClassName?: string;
}

export type { CodeSentiment, ICodeToken, ICodeSnippetProps };
