/*
 * The variant definitions for `Code` (inline) and `CodeBlock` (a `<pre>`), in
 * their own module beside the components — see the note in
 * `interactions/Button/styles.ts`. Neither component has `"use client"`.
 *
 *
 * FONT SIZE IN `em`
 *
 * `text-code` is `0.9em`, not a `rem` step, so inline code follows the text it
 * sits in: `<code>` inside a `SectionHeading` is heading-sized, inside a caption
 * caption-sized. The 0.9 evens out monospace faces, which run large for their
 * nominal size. Because it is relative, it must be applied once per nesting
 * level — `CodeBlock` puts it on the `<pre>` and leaves the inner `<code>` to
 * inherit, or the two would compound to 0.81em.
 *
 * `font-mono` goes on the inner `<code>` as well. A UA stylesheet gives `<code>`
 * `font-family: monospace` alone, and that exact value triggers the legacy
 * monospace font-size quirk (13px, whatever the context). Any other stack —
 * ours ends in `monospace` but is not only that — avoids it.
 */
import { tv } from "../../../../lib/tv";

const codeStyles = tv({
  base: [
    "font-mono text-code",
    // 20.31 / 16.04:1 on --surface-raised in light / dark.
    "bg-surface-raised text-foreground",
    /*
     * `border-border`, the decorative one, deliberately. The chip is not a
     * control and not a region — it is text, identified by its monospace face,
     * and nothing is lost if the edge cannot be seen — so 1.4.11 does not apply.
     * `border-border-strong` at 4.17:1 and up would draw a heavy box around every
     * identifier in a paragraph.
     */
    "rounded-(--radius-xs) border border-border",
    "px-(--spacing-10)",
    /*
     * A long identifier wraps rather than overflowing at 320 CSS px (1.4.10),
     * and `box-decoration-clone` gives each wrapped fragment its own padding and
     * border so the second line does not start flush against the edge.
     */
    "wrap-break-word box-decoration-clone",
  ],
});

const codeBlockStyles = tv({
  slots: {
    /*
     * The scroll container.
     *
     * `overflow-x-auto` and `whitespace-pre`: code keeps its line breaks and
     * indentation and scrolls sideways instead of wrapping, because a wrapped
     * line of code reads as two statements. 1.4.10 exempts content that needs
     * two-dimensional layout to be understood, and code is the usual example.
     *
     * `border-border-strong` here, unlike inline `Code`. The block is a focusable
     * region (see `CodeBlock.tsx`), and its edge is what shows where the
     * scrollable area ends: 4.17 / 4.42:1 on --background, 6.36 / 4.51:1 against
     * its own --surface-raised fill.
     */
    root: [
      "m-0 min-w-0 overflow-x-auto whitespace-pre",
      "font-mono text-code",
      // 20.31 / 16.04:1 on --surface-raised in light / dark.
      "bg-surface-raised text-foreground",
      "rounded-control border border-border-strong",
      "p-(--spacing-40)",
      // The shared focus indicator. --focus on --background is 6.19 / 8.88:1.
      "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
    ],
    // Inherits size and line height from the `<pre>`; see the note above.
    code: "font-mono",
  },
});

export { codeBlockStyles, codeStyles };
