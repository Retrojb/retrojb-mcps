import {
  DocsContainer,
  type DocsContainerProps,
} from "@storybook/addon-docs/blocks";
import {
  useLayoutEffect,
  type PropsWithChildren,
  type ReactElement,
} from "react";

/*
 * Pins docs pages to the light tokens.
 *
 * Docs prose renders with the design system (`src/components/docsMdx`), so it
 * draws in `--foreground`. Storybook's own docs chrome (argument tables, the
 * "Show code" toggle, titles, links) stays on Storybook's light theme. On a
 * dark OS the tokens would switch to dark and our text would sit near-white on
 * Storybook's white page. Giving the page `--background` instead leaves
 * Storybook's dark text on a dark page, which measured at 1.28:1.
 *
 * So docs pages force `data-theme="light"` on `<html>`. A layout effect runs
 * before the first paint, so the page never flashes dark. The `withTheme`
 * decorator skips docs mode for the same reason. Leaving for a story hands the
 * attribute back to the decorator and the theme toolbar.
 */
const LightDocsContainer = (
  props: PropsWithChildren<DocsContainerProps>,
): ReactElement => {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  return <DocsContainer {...props} />;
};

export { LightDocsContainer };
