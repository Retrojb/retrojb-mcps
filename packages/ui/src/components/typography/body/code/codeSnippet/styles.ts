/*
 * The variant definitions for `CodeSnippet`, in their own module beside the
 * component — the same split every `styles.ts` in this package uses, so the
 * recipe stays a server-importable export even though `CodeSnippet.tsx` carries
 * `"use client"` for the copy button.
 *
 *
 * WHY IT REBUILDS THE WELL RATHER THAN RENDERING A `CodeBlock`
 *
 * `CodeSnippet` is a `<figure>` with a header and a copy button over the same
 * scrollable `<pre>` region `CodeBlock` draws. It uses the same classes on that
 * `<pre>` (see `code/styles.ts`), but it owns the `<pre>` itself rather than
 * nesting a `CodeBlock`, because the header, the copy button and the code share
 * one rounded, bordered frame and the `<pre>`'s own border and radius would
 * draw a second box inside it. The region semantics — `tabIndex`, `role` and
 * the `aria-label` from `label` — are reproduced on the `<pre>` here.
 *
 *
 * THE SENTIMENT TOKENS
 *
 * `token` maps each `CodeSentiment` to a `text-code-*` utility, registered in
 * `styles/theme.css` and solved for 4.5:1 on `--surface-sunken`, the fill
 * below (see `packages/tokens/src/light.css`). A highlighter tags each run and
 * the component paints it; the word is the real signal, so a run read in
 * greyscale still parses (1.4.1). The `none` case carries no colour and
 * inherits the block's foreground.
 */
import { tv, type VariantProps } from "../../../../../lib/tv";

const codeSnippetStyles = tv({
  slots: {
    /*
     * The frame. One rounded, bordered `<figure>` holding the header, the code
     * well and nothing else. `--surface-sunken` is the well fill every
     * sentiment was measured on. `border-border-strong` because the figure
     * contains a focusable region whose edge shows where it ends, the same
     * reasoning as `CodeBlock`'s `<pre>`.
     */
    root: [
      "relative overflow-hidden",
      "rounded-control border border-border-strong bg-surface-sunken",
    ],
    /*
     * The header bar. A quieter `--surface-base` so it reads as chrome above the
     * well, with a rule under it. Wraps so a long file name and the copy button
     * do not overflow on a narrow viewport (1.4.10).
     */
    header: [
      "flex flex-wrap items-center gap-(--space-2)",
      "px-(--space-4) py-(--space-2)",
      "border-b border-border",
      "bg-surface-base",
    ],
    // The file name. `label-sm` type role; the copy button is pushed to the end.
    title: "mr-auto font-mono text-label-sm text-foreground",
    // The language badge. Muted, since it only names the grammar.
    language: [
      "font-mono text-label-sm text-foreground-muted",
      "rounded-xs border border-border px-(--space-2)",
    ],
    /*
     * The copy button. A real `<button type="button">` with a visible text
     * label beside the icon, so it is a named control rather than an icon alone
     * (1.4.1, 4.1.2). The shared 2px focus outline at a 2px offset survives
     * forced-colors mode (2.4.7, 2.4.13).
     */
    copyButton: [
      "inline-flex shrink-0 items-center gap-(--space-1)",
      "rounded-control border border-border-strong bg-surface-base",
      "px-(--space-2) py-(--space-1)",
      "font-sans text-label-sm text-foreground",
      "cursor-pointer",
      "hover:bg-surface-raised-1",
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
    ],
    /*
     * The scroll region, the same classes `CodeBlock` puts on its `<pre>`, less
     * the border and radius the frame already draws. Scrolls sideways instead
     * of wrapping, because a wrapped line of code reads as two statements;
     * 1.4.10 exempts code as content that needs two-dimensional layout.
     * Focusable so a keyboard user can scroll it (2.1.1). The outline is inset
     * so it is not clipped by the frame's `overflow-hidden`.
     */
    pre: [
      "m-0 min-w-0 overflow-x-auto whitespace-pre",
      "font-mono text-code text-foreground",
      "p-(--space-4)",
      "outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-focus",
    ],
    // Inherits size and line height from the `<pre>`; see `code/styles.ts`.
    code: "font-mono",
    token: "",
  },

  variants: {
    /*
     * The sentiment of a run. A `text-code-*` utility each, or no colour for
     * `none`, which inherits the block's foreground.
     */
    sentiment: {
      none: { token: "" },
      positive: { token: "text-code-positive" },
      negative: { token: "text-code-negative" },
      special: { token: "text-code-special" },
      emphasis: { token: "text-code-emphasis" },
      neutral: { token: "text-code-neutral" },
    },
  },

  defaultVariants: {
    sentiment: "none",
  },
});

/**
 * The variant props of {@link codeSnippetStyles}: the `sentiment` of a run.
 *
 * @public
 */
type CodeSnippetVariants = VariantProps<typeof codeSnippetStyles>;

export { codeSnippetStyles };
export type { CodeSnippetVariants };
