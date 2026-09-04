/*
 * The variant definition, in its own module beside the component rather than
 * inside it — see the note in `interactions/Button/styles.ts`.
 *
 * This one is the clearest case for the split. `Link` renders a plain `<a>`,
 * which in a Next.js app means a full page load rather than a client-side
 * transition, so the intended way to get routed navigation with this styling is
 * to put `linkStyle()` on the router's own link component:
 *
 * ```tsx
 * import NextLink from "next/link";
 * import { linkStyle } from "@retrojb/ui";
 *
 * <NextLink href="/docs" className={linkStyle({ intent: "standalone" })}>
 *   Docs
 * </NextLink>
 * ```
 *
 * That call site is a server component by default in App Router. Declaring
 * `linkStyle` in `Link.tsx`, under its `"use client"`, would make the snippet
 * above throw.
 */

import { tv, type VariantProps } from "../../../lib/tv.js";

const linkStyle = tv({
  base: [
    "rounded-sm outline-offset-2",
    "transition-colors motion-reduce:transition-none",
    // Matches the button's indicator so focus looks the same everywhere.
    "focus-visible:outline-2 focus-visible:outline-focus",
  ],

  variants: {
    intent: {
      /*
       * Underlined, and deliberately not optional.
       *
       * A link sitting in a paragraph that is distinguished from the text around
       * it by colour alone fails WCAG 1.4.1 unless the colour contrast between
       * link and body text is at least 3:1 — which --accent-text against
       * --foreground is not. The underline is what makes this conformant, so it
       * is in the variant rather than something a caller turns off.
       */
      inline: [
        "text-accent-text underline",
        "underline-offset-[0.15em] decoration-[0.08em]",
        "hover:text-accent-hover hover:decoration-[0.14em]",
      ],

      /*
       * No underline, for links that are unambiguous on their own — nav items,
       * cards, buttons-that-are-links. 1.4.1 does not apply when the link is not
       * embedded in a block of text.
       */
      standalone: "text-foreground no-underline hover:text-accent-text",

      muted: "text-foreground-muted underline hover:text-foreground",
    },
  },

  defaultVariants: {
    intent: "inline",
  },
});

export { linkStyle };
export type LinkVariants = VariantProps<typeof linkStyle>;
