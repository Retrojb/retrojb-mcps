import { type ReactElement, type Ref } from "react";
import { gridItemPlacement } from "./placement";
import { gridItemStyles } from "./styles";
import type { IGridItemProps } from "./types";

/**
 * A region placed on a `PageGrid`: how many columns it spans and where it
 * starts, once or per breakpoint. Spans the whole row unless told otherwise.
 *
 * @remarks
 * ### Ant Design's vocabulary, Tailwind's breakpoints
 *
 * `span` and `offset` are Ant Design's names. The breakpoint keys are
 * Tailwind's (`sm`, `md`, `lg`, `xl`, `2xl`) plus `base` for below `sm`, so
 * `span={{ base: "full", md: 6 }}` reads the same as `md:` in a class.
 *
 * ### Why the default is the full row
 *
 * Every direct child of a grid is placed on it. A child that does not set a
 * span would otherwise take one column, about 9px at 320px wide. Spanning the
 * row by default means a forgotten `span` gives a stacked layout, not a
 * broken one.
 *
 * ### No `order`
 *
 * Ant's `Col` has one. This does not, because moving a region visually
 * without moving it in the DOM makes reading and focus order disagree with
 * what is on screen (WCAG 1.3.2, 2.4.3). Change the DOM order instead.
 *
 * @example
 * ```tsx
 * <GridItem span={{ base: "full", md: 6, lg: 4 }}>…</GridItem>
 * <GridItem span={8} offset={2}>Centred, eight columns</GridItem>
 * ```
 *
 * @a11y Draws nothing and adds no role; `as` picks the element (`aside`,
 * `nav`, `section`, `li`). Placement never changes order, so visual order is
 * DOM order. WCAG 1.3.1, 1.3.2, 2.4.3.
 *
 * @see packages/ui/src/components/foundations/pageGrid/GridItemSpec.yaml
 * @see apps/retrojb-storybook/src/stories/foundations/PageGrid.stories.tsx
 * @see project-docs/references/LAYOUT.md
 *
 * @beta
 */
const GridItem = ({
  as: Root = "div",
  span,
  offset,
  subgrid,
  className,
  style,
  children,
  ref,
  ...props
}: IGridItemProps): ReactElement => {
  // See the note on the same cast in `Card.tsx`.
  const Element = Root as "div";
  return (
    <Element
      ref={ref as Ref<HTMLDivElement> | undefined}
      className={gridItemStyles({ subgrid, className })}
      style={{ ...gridItemPlacement(span, offset), ...style }}
      {...props}
    >
      {children}
    </Element>
  );
};

export { GridItem };
