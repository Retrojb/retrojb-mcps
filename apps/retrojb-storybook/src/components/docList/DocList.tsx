import { Unstyled } from "@storybook/addon-docs/blocks";
import {
  List,
  ListItem,
  type IListItemProps,
  type IListProps,
} from "@retrojb/ui";
import type { ReactElement } from "react";
import styles from "./DocList.module.css";

type IDocListProps = IListProps;
type IDocListItemProps = IListItemProps;

/**
 * A design-system `List` for Storybook MDX docs.
 *
 * ```mdx
 * <DocList ordered>
 *   <DocListItem>Install the package.</DocListItem>
 *   <DocListItem>Import the stylesheet once.</DocListItem>
 * </DocList>
 * ```
 *
 * The `<Unstyled>` wrapper goes around the list, not each item: a `<div>`
 * between `<ul>` and `<li>` is invalid and breaks list semantics (1.3.1).
 * Items inside the wrapper are already outside Storybook's docs styles.
 */
const DocList = ({ className, ...props }: IDocListProps): ReactElement => (
  <Unstyled>
    <List
      className={[styles.list, className].filter(Boolean).join(" ")}
      {...props}
    />
  </Unstyled>
);

/** A `ListItem` for use inside `DocList`. No wrapper of its own; see above. */
const DocListItem = (props: IDocListItemProps): ReactElement => (
  <ListItem {...props} />
);

export { DocList, DocListItem };
export type { IDocListItemProps, IDocListProps };
