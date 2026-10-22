import { type ReactElement } from "react";
import type { IHeadingBaseProps } from "./types";

/**
 * Internal. Renders `<h{level}>` with classes the calling heading has already
 * resolved.
 *
 * Each named heading is three lines on top of this: its default `level`, its
 * own style function (which carries its default `size`), and the call. The
 * level-to-tag mapping, the ref and the prop spread live here once.
 *
 * Not exported from the package. A caller who wants a heading with no preset is
 * better served by picking the preset nearest in meaning and overriding `size`,
 * which keeps the default level sensible.
 */
const HeadingBase = ({ level, ...props }: IHeadingBaseProps): ReactElement => {
  const Heading = `h${level}` as const;

  return <Heading {...props} />;
};

export { HeadingBase };
