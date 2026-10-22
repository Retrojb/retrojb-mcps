import { type ReactElement } from "react";
import { listItemStyles } from "./styles";
import type { IListItemProps } from "./types";

/**
 * An item in a `List`. Takes its size and marker from the list, through CSS
 * inheritance rather than context, so it needs no client code.
 */
const ListItem = ({ className, ...props }: IListItemProps): ReactElement => (
  <li className={listItemStyles({ className })} {...props} />
);

export { ListItem };
