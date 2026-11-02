import { Unstyled } from "@storybook/addon-docs/blocks";
import {
  ProductHeading,
  SectionHeading,
  SubHeading,
  TitleHeading,
  type HeadingLevel,
  type IHeadingProps,
} from "@retrojb/ui";
import type { ReactElement } from "react";
import styles from "./DocHeading.module.css";
import { slugOf } from "./slug";

/*
 * Which design-system heading each MDX level is drawn with.
 *
 * MDX headings are chosen by outline level (`#`, `##`, …), so this maps level
 * to the named heading whose role fits a docs page. `level` is always passed
 * through explicitly, so the rendered `<h1>`–`<h6>` matches the markdown and
 * never the named component's own default (1.3.1).
 */
const HEADING_BY_LEVEL = {
  1: { Heading: ProductHeading, size: undefined },
  2: { Heading: TitleHeading, size: undefined },
  3: { Heading: SectionHeading, size: undefined },
  4: { Heading: SubHeading, size: undefined },
  5: { Heading: SubHeading, size: "heading-xs" },
  6: { Heading: SubHeading, size: "heading-xs" },
} as const satisfies Record<
  HeadingLevel,
  {
    Heading: (props: IHeadingProps) => ReactElement;
    size: IHeadingProps["size"];
  }
>;

interface IDocHeadingProps extends IHeadingProps {
  /** The outline level, `1`–`6`. Matches the `#` count it replaces. Defaults to `1`. */
  readonly level?: HeadingLevel;
}

/**
 * A design-system heading for Storybook MDX docs.
 *
 * ```mdx
 * import { DocHeading } from "../components/docHeading";
 *
 * <DocHeading level={1}>Component categorizations</DocHeading>
 * ```
 *
 * Wrapped in `<Unstyled>` so Storybook's docs typography (`.sbdocs h1` and
 * friends) does not override the package's type roles. The design-system
 * headings set `m-0` and leave spacing to the layout, so the wrapper adds the
 * vertical rhythm a docs page needs.
 *
 * Without an `id`, one is made from the text in Storybook's slug format, so
 * the heading can be linked to (`#actions`).
 *
 * `size` and every other heading prop pass through, so a page can still redraw
 * a heading without changing its level.
 */
const DocHeading = ({
  level = 1,
  size,
  id,
  className,
  children,
  ...props
}: IDocHeadingProps): ReactElement => {
  const { Heading, size: defaultSize } = HEADING_BY_LEVEL[level];

  return (
    <Unstyled>
      <Heading
        level={level}
        size={size ?? defaultSize}
        id={id ?? slugOf(children)}
        className={[styles.heading, styles[`h${level}`], className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </Heading>
    </Unstyled>
  );
};

export { DocHeading };
export type { IDocHeadingProps };
