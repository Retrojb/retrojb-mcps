import { type ReactElement } from "react";

import { emphasisStyles } from "./styles";
import type { IEmphasisProps } from "./types";

/**
 * A word or phrase with stress emphasis inside running text, the one you would
 * lean on when speaking, rendered as an em element in italic. It is for
 * meaning, not for a slanted look, and a meaning that matters must also be in
 * the words.
 *
 * @remarks
 * ### Why it is a component and not a `Paragraph` prop
 *
 * A style prop on `Paragraph` can only restyle a whole paragraph. It cannot
 * mark one phrase inside a sentence, and it invites choosing slant for looks
 * rather than meaning. `Emphasis` is inline and renders a real `<em>`, the way
 * `Code` is inline and `CodeBlock` is block. MDX renders `*x*` as `<em>`, so
 * markdown maps onto it directly.
 *
 * ### Why it has no tone or size
 *
 * It inherits colour, size, line height and family from the text around it, so
 * it stays muted in a muted paragraph and heading-sized in a heading. With no
 * colour of its own there is nothing for it to measure for contrast. Slant is
 * the only thing it sets.
 *
 * ### Why the meaning must also be in the words
 *
 * `<em>` carries meaning in HTML, but most screen readers do not announce it by
 * default. If the stress changes what a sentence means, a reader who cannot see
 * the slant loses that, and slant alone is not a safe signal (1.4.1). Where it
 * matters, rephrase so the words carry it.
 *
 * ### When to keep it short
 *
 * Italic is harder to read at length for some readers. Use it for a word or a
 * phrase, never for a whole paragraph.
 *
 * ### When to use something else
 *
 * Use `Strong` for importance, seriousness or urgency. Stress is italic,
 * importance is bold, and the two can nest.
 *
 * @example
 * ```tsx
 * <Paragraph>
 *   I said <Emphasis>tomorrow</Emphasis>, not today.
 * </Paragraph>
 * ```
 *
 * @a11y Renders a native `<em>`, which maps to the ARIA `emphasis` role. It
 * takes no accessible name; its text is read as part of the sentence. No
 * interaction: it is not focusable and has no keyboard behaviour. Most screen
 * readers do not announce it, so the meaning must also be in the words. Colour
 * is inherited and slant survives forced-colors mode. WCAG 1.3.1, 1.4.1,
 * 1.4.3, 1.4.4, 1.4.12.
 *
 * @see packages/ui/src/components/typography/body/emphasis/EmphasisSpec.yaml
 * @see apps/retrojb-storybook/src/stories/typography/Emphasis.stories.tsx
 * @see apps/retrojb-storybook/src/stories/typography/Emphasis.mdx
 * @see apps/retrojb-storybook/src/stories/typography/accessibilityDocs/TypographyAccessibility.mdx
 * @see packages/ui/src/components/typography/body/strong/StrongSpec.yaml
 *
 * @public
 */
const Emphasis = ({ className, ...props }: IEmphasisProps): ReactElement => (
  <em className={emphasisStyles({ className })} {...props} />
);

export { Emphasis };
