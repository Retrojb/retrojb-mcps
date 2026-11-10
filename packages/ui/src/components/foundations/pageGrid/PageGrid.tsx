import { type ReactElement, type Ref } from "react";
import { pageGridStyles } from "./styles";
import type { IPageGridProps } from "./types";

/**
 * The page's column grid: twelve columns with gutters and outer margins that
 * widen at larger breakpoints, centred and capped at a maximum width. Place its
 * children with `GridItem`.
 *
 * @remarks
 * ### Set once, at the root
 *
 * Render one `PageGrid` per page region, usually in the app's root layout, and
 * every page inherits the same columns. There is no provider and no
 * JavaScript: the column count, gutter, margin and maximum width are CSS
 * tokens (`--grid-columns`, `--grid-gutter`, `--grid-margin`,
 * `--grid-max-width`) from `@retrojb/tokens`, so the grid renders on the
 * server and needs no `"use client"`. Change the grid for the whole app by
 * overriding the tokens.
 *
 * ### Media queries here, container queries in components
 *
 * The page grid follows the viewport, because it is the page. Components
 * inside it (`Card`, `DynamicContainer`) follow the width they are given, so
 * they still lay out correctly in a narrow column.
 *
 * @example
 * ```tsx
 * <PageGrid as="main">
 *   <GridItem span={{ base: "full", lg: 8 }}>Article</GridItem>
 *   <GridItem as="aside" span={{ base: "full", lg: 4 }}>Related</GridItem>
 * </PageGrid>
 * ```
 *
 * @a11y Draws nothing and adds no role; `as` picks the landmark (`main`,
 * `header`, `footer`). Visual order is DOM order: there is no `order` prop,
 * because reordering columns visually would make the reading and focus order
 * differ from what is on screen. `GridItem` spans the full row by default, so a
 * page that sets wider layouts only from `md` or `lg` up reflows to one column
 * on a narrow screen. The breakpoints are in rem, so the layout narrows sooner
 * when text is enlarged.
 * WCAG 1.3.1, 1.3.2, 1.4.10, 2.4.3.
 *
 * @see packages/ui/src/components/foundations/pageGrid/PageGridSpec.yaml
 * @see apps/retrojb-storybook/src/stories/foundations/PageGrid.stories.tsx
 * @see project-docs/references/LAYOUT.md
 *
 * @beta
 */
const PageGrid = ({
  as: Root = "div",
  className,
  children,
  ref,
  ...props
}: IPageGridProps): ReactElement => {
  // See the note on the same cast in `Card.tsx`.
  const Element = Root as "div";
  return (
    <Element
      ref={ref as Ref<HTMLDivElement> | undefined}
      className={pageGridStyles({ className })}
      {...props}
    >
      {children}
    </Element>
  );
};

export { PageGrid };
