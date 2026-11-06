/*
 * Maps plain markdown in MDX docs (`#`, paragraphs, lists, `> quotes`,
 * `**bold**`, `*italic*`, code) to the `Doc*` components, so a page written in
 * ordinary markdown renders with the design system. Registered once in `.storybook/preview.tsx` under
 * `parameters.docs.components`. Storybook merges it over its own defaults, so
 * anything not listed here (links, tables, images) keeps Storybook's styling.
 */
import {
  MdxBlockquote,
  MdxCode,
  MdxEm,
  MdxH1,
  MdxH2,
  MdxH3,
  MdxH4,
  MdxH5,
  MdxH6,
  MdxLi,
  MdxOl,
  MdxP,
  MdxPre,
  MdxStrong,
  MdxUl,
} from "./MdxElements";

const docsMdxComponents = {
  h1: MdxH1,
  h2: MdxH2,
  h3: MdxH3,
  h4: MdxH4,
  h5: MdxH5,
  h6: MdxH6,
  p: MdxP,
  ul: MdxUl,
  ol: MdxOl,
  li: MdxLi,
  blockquote: MdxBlockquote,
  pre: MdxPre,
  strong: MdxStrong,
  em: MdxEm,
  code: MdxCode,
};

export { docsMdxComponents };
