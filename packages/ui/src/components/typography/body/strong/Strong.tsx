import { type ReactElement } from "react";

import { strongStyles } from "./styles";
import type { IStrongProps } from "./types";

/**
 * A phrase of strong importance, seriousness or urgency inside running text,
 * rendered as a strong element in bold. It is for meaning, not for a heavier
 * look, and a meaning that matters must also be in the words.
 *
 * @remarks
 * ### Why it is a component and not a `Paragraph` prop
 *
 * A weight prop on `Paragraph` can only restyle a whole paragraph. It cannot
 * mark one phrase inside a sentence, and it invites choosing weight for looks
 * rather than meaning. `Strong` is inline and renders a real `<strong>`, the way
 * `Code` is inline and `CodeBlock` is block. MDX renders `**x**` as `<strong>`,
 * so markdown maps onto it directly.
 *
 * ### Why it has no tone or size
 *
 * It inherits colour, size, line height and family from the text around it, so
 * a `Strong` in a muted paragraph stays muted and one in a heading stays
 * heading-sized. With no colour of its own there is nothing for it to measure
 * for contrast. Weight is the only thing it sets.
 *
 * ### Why the meaning must also be in the words
 *
 * `<strong>` carries meaning in HTML, but most screen readers do not announce
 * it by default. A warning or a required field that is only bold is silent to
 * those users, and weight alone is not a safe signal (1.4.1). Write "Warning:
 * ..." or "Required" and let the weight reinforce it.
 *
 * ### When to use something else
 *
 * Use `Emphasis` for stress, the word you would lean on when speaking. For a
 * bigger or heavier look with no added importance, change the type role (a
 * heading or label role); there is no component for visual-only bold.
 *
 * ### Why it sets 700 inside a heading
 *
 * It sets `font-bold` (700) whatever the parent's role sets. Inside a 600
 * heading or a 500 label that is one step heavier. Inside a 700 role (`display`,
 * `heading-xl`) it looks the same as the surrounding text.
 *
 * @example
 * ```tsx
 * <Paragraph>
 *   <Strong>Warning:</Strong> this deletes the project.
 * </Paragraph>
 * ```
 *
 * @a11y Renders a native `<strong>`, which maps to the ARIA `strong` role. It
 * takes no accessible name; its text is read as part of the sentence. No
 * interaction: it is not focusable and has no keyboard behaviour. Most screen
 * readers do not announce it, so the meaning must also be in the words. Colour
 * is inherited and weight survives forced-colors mode. WCAG 1.3.1, 1.4.1,
 * 1.4.3, 1.4.4, 1.4.12.
 *
 * @see packages/ui/src/components/typography/body/strong/StrongSpec.yaml
 * @see apps/retrojb-storybook/src/stories/typography/Strong.stories.tsx
 * @see apps/retrojb-storybook/src/stories/typography/Strong.mdx
 * @see apps/retrojb-storybook/src/stories/typography/accessibilityDocs/TypographyAccessibility.mdx
 * @see packages/ui/src/components/typography/body/emphasis/EmphasisSpec.yaml
 *
 * @public
 */
const Strong = ({ className, ...props }: IStrongProps): ReactElement => (
  <strong className={strongStyles({ className })} {...props} />
);

export { Strong };
