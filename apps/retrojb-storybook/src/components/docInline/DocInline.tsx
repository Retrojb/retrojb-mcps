import {
  Emphasis,
  Strong,
  type IEmphasisProps,
  type IStrongProps,
} from "@retrojb/ui";
import type { ReactElement } from "react";

type IDocStrongProps = IStrongProps;
type IDocEmphasisProps = IEmphasisProps;

const join = (...names: Array<string | undefined>): string =>
  names.filter(Boolean).join(" ");

/**
 * Design-system `Strong` for Storybook MDX docs.
 *
 * ```mdx
 * <DocParagraph>This is <DocStrong>required</DocStrong>.</DocParagraph>
 * ```
 *
 * Markdown `**text**` maps here. Not wrapped in `<Unstyled>`, which renders a
 * `<div>` and would break the line it sits in; the `sb-unstyled` class on the
 * element itself opts it out of Storybook's docs styles, as `DocCode` does.
 */
const DocStrong = ({ className, ...props }: IDocStrongProps): ReactElement => (
  <Strong className={join("sb-unstyled", className)} {...props} />
);

/**
 * Design-system `Emphasis` for Storybook MDX docs.
 *
 * ```mdx
 * <DocParagraph>Read this <DocEmphasis>before</DocEmphasis> you start.</DocParagraph>
 * ```
 *
 * Markdown `*text*` maps here. Opted out of Storybook's docs styles the same
 * way as `DocStrong`.
 */
const DocEmphasis = ({
  className,
  ...props
}: IDocEmphasisProps): ReactElement => (
  <Emphasis className={join("sb-unstyled", className)} {...props} />
);

export { DocEmphasis, DocStrong };
export type { IDocEmphasisProps, IDocStrongProps };
