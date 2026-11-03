import type { ComponentPropsWithRef, ReactNode } from "react";
import type { TabGroupVariants } from "./styles";

/**
 * When moving focus between tabs also selects them.
 *
 * - `"automatic"` — the arrow keys, Home and End select the tab they move to,
 *   so the panel follows focus. The APG default, and right when panels render
 *   instantly from data already on the page.
 * - `"manual"` — the arrow keys only move focus; Enter or Space selects. Use it
 *   when showing a panel is slow (a fetch, a heavy chart), so arrowing past a
 *   tab does not start work the user never asked for.
 */
type TabActivation = "automatic" | "manual";

/** The resolved orientation, size and width every part reads from context. */
type TabGroupOrientation = NonNullable<TabGroupVariants["orientation"]>;
type TabGroupSize = NonNullable<TabGroupVariants["size"]>;

interface ITabGroupProps
  extends Omit<ComponentPropsWithRef<"div">, "defaultValue">, TabGroupVariants {
  /**
   * The tab list's accessible name, set as its `aria-label`. Required,
   * deliberately — see `ICodeBlockProps.label`.
   *
   * A tablist is announced on entry, and an unnamed one is only "tab list" —
   * it does not say what the tabs are views *of* (4.1.2, 1.3.1). When a visible
   * heading already names the tabs, keep this prop and also pass
   * `aria-labelledby` with the heading's id to `TabList`: `aria-labelledby`
   * outranks `aria-label` in accessible-name computation, so the heading wins.
   */
  readonly label: string;
  /**
   * The selected tab's `value`, when controlled. `undefined` means
   * uncontrolled, as in `useControllableState`.
   */
  readonly value?: string;
  /**
   * The initially selected tab's `value`, when uncontrolled. Read once, on
   * mount.
   *
   * Pass it. The APG pattern has one tab selected at all times; without it no
   * tab is selected and no panel shows. The list still keeps one tab stop —
   * on the first enabled tab — so the group cannot fall out of the tab order.
   */
  readonly defaultValue?: string;
  /**
   * Called with the newly selected value, controlled or not. Not called when
   * the already-selected tab is activated again.
   */
  readonly onValueChange?: (value: string) => void;
  /** See {@link TabActivation}. Defaults to `"automatic"`. */
  readonly activation?: TabActivation;
  /**
   * Keep inactive panels in the DOM with the `hidden` attribute. Defaults to
   * `true`.
   *
   * Mounted-and-hidden is the default because it keeps every tab's
   * `aria-controls` pointing at a real element, and because a panel's own
   * state — a half-filled form, a scroll position, a playing video's place —
   * survives switching away and back. `hidden` is `display: none`, so a hidden
   * panel is out of the accessibility tree, the tab order and find-in-page.
   *
   * Set `false` when inactive panels are expensive to render. They then render
   * nothing until selected, and unselected tabs drop `aria-controls` rather
   * than point at an id that does not exist.
   */
  readonly keepMounted?: boolean;
  /** A `TabList` and one `TabPanel` per tab, in any markup. */
  readonly children?: ReactNode;
}

interface ITabListProps extends Omit<
  ComponentPropsWithRef<"div">,
  "role" | "aria-orientation"
> {
  /** The `Tab` elements, in order. */
  readonly children?: ReactNode;
  /**
   * Class for the scroll wrapper around the tablist. `className` goes to the
   * `role="tablist"` element itself. Give the wrapper a `max-h-*` to scroll a
   * long vertical list.
   */
  readonly rootClassName?: string;
}

interface ITabProps extends Omit<
  ComponentPropsWithRef<"button">,
  | "id"
  | "role"
  | "type"
  | "value"
  | "tabIndex"
  | "aria-selected"
  | "aria-controls"
> {
  /**
   * Identifies the tab, and the `TabPanel` it controls. Unique within the
   * group. What `value` / `onValueChange` carry.
   *
   * The tab's and the panel's ids are both derived from this and the group's
   * generated id, which is why neither part accepts an `id` — a caller id on
   * one side would break the `aria-controls` / `aria-labelledby` pair.
   */
  readonly value: string;
  /**
   * The tab's visible label and its accessible name. Keep it short and
   * non-interactive — a tab is a button, and a control inside a button is
   * invalid. It is rendered twice (once visibly, once as the hidden width
   * reserver), so avoid content with ids of its own.
   */
  readonly children: ReactNode;
}

interface ITabPanelProps extends Omit<
  ComponentPropsWithRef<"div">,
  "id" | "role" | "hidden" | "aria-labelledby"
> {
  /** The `value` of the `Tab` that shows this panel. */
  readonly value: string;
  readonly children?: ReactNode;
}

/** What a group shares with its tab list, tabs and panels. */
interface ITabGroupContextValue {
  /** The group's generated id, the prefix of every tab and panel id. */
  readonly baseId: string;
  readonly label: string;
  /** The selected value, or `null` when nothing is selected. */
  readonly value: string | null;
  /** Selects a tab. A no-op for the tab already selected. */
  readonly select: (value: string) => void;
  readonly activation: TabActivation;
  readonly keepMounted: boolean;
  readonly orientation: TabGroupOrientation;
  readonly size: TabGroupSize;
  readonly fullWidth: boolean;
}

export type {
  ITabGroupContextValue,
  ITabGroupProps,
  ITabListProps,
  ITabPanelProps,
  ITabProps,
  TabActivation,
  TabGroupOrientation,
  TabGroupSize,
};
