import { type ReactElement, type Ref } from "react";
import { listStyles } from "./styles";
import type { IListProps } from "./types";

/**
 * A bulleted or numbered list in running text.
 *
 * ```tsx
 * <List ordered>
 *   <ListItem>Install the package.</ListItem>
 *   <ListItem>Import the stylesheet once.</ListItem>
 * </List>
 * ```
 *
 * A real `<ul>` or `<ol>` with its markers, so a screen reader announces "list,
 * 2 items" and each item's position. For a list used as layout — a row of chips,
 * a group of cards — use `DynamicContainer`, which removes the markers.
 *
 * `size` maps to the body roles and the items inherit it, so a list matches the
 * `Paragraph` beside it when both take the same `size`.
 */
const List = ({
  ordered = false,
  size,
  className,
  ref,
  ...props
}: IListProps): ReactElement => {
  /*
   * `ol` for both branches of the type, as in `Card`: the two elements differ
   * only in the `HTMLOListElement` / `HTMLUListElement` ref, and both are the
   * `HTMLElement` the public prop promises.
   */
  const Element = (ordered ? "ol" : "ul") as "ol";

  return (
    <Element
      ref={ref as Ref<HTMLOListElement> | undefined}
      className={listStyles({ ordered, size, className })}
      {...props}
    />
  );
};

export { List };
