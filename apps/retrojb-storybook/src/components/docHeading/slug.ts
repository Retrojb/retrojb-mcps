import { Children, isValidElement, type ReactNode } from "react";

/** The plain text of a heading's children. */
const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return textOf(child.props.children);
      }
      return "";
    })
    .join("");

/**
 * An anchor id in the format Storybook gives its default MDX headings
 * (`## WCAG Standard` → `wcag-standard`), so deep links and the docs table of
 * contents keep working when a page switches to `DocHeading`.
 */
const slugOf = (children: ReactNode): string | undefined =>
  textOf(children)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-") || undefined;

export { slugOf };
