import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  Ref,
} from "react";
import type { ListVariants } from "./styles";

/**
 * The list's native props.
 *
 * `ol` props, because they are `ul`'s plus `start`, `reversed` and `type`, which
 * only mean anything on an ordered list. The ref is typed as `HTMLElement`
 * because `ordered` switches the element between `<ul>` and `<ol>`.
 */
type ListRootProps = ComponentPropsWithoutRef<"ol"> & {
  readonly ref?: Ref<HTMLElement>;
};

interface IListProps extends ListRootProps, ListVariants {
  /**
   * `true` renders `<ol>` with numbers, `false` (the default) `<ul>` with
   * bullets.
   *
   * Pick by meaning, not by look: ordered when the sequence matters — steps,
   * a ranking — so a screen reader announces each item's position (1.3.1).
   */
  readonly ordered?: boolean;
}

type IListItemProps = ComponentPropsWithRef<"li">;

export type { IListItemProps, IListProps };
