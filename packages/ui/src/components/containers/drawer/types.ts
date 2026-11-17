import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { DrawerVariants } from "./styles";

/**
 * The accessible name of the drawer.
 *
 * A modal dialog must have one (4.1.2): a screen reader announces "dialog" and
 * then this, so a drawer without it is announced as an unnamed dialog. There are
 * two ways to give it, and exactly one is required — the union below makes that
 * a compile-time rule rather than a runtime check.
 *
 * - `title` renders a visible heading at the top of the drawer and names it via
 *   `aria-labelledby`. Prefer this: the name is on screen as well as announced.
 * - `aria-label` names it when the design has no room for a visible heading. The
 *   name is then in the accessibility tree only.
 */
interface IDrawerNamedByTitle {
  /**
   * A visible heading rendered at the top of the drawer, and its accessible
   * name. Wired to `aria-labelledby` from a generated `useId`.
   */
  readonly title: ReactNode;
  readonly "aria-label"?: never;
}

interface IDrawerNamedByLabel {
  readonly title?: never;
  /**
   * The accessible name, when there is no visible heading. Use `title` instead
   * wherever the design has room for one.
   */
  readonly "aria-label": string;
}

/**
 * The drawer's own props, before the native `<dialog>` attributes and the
 * accessible-name union are mixed in.
 *
 * `open`/`onOpenChange` are the controllable pair: pass both to drive the drawer
 * from your own state, pass neither (with `defaultOpen`) to let it own the
 * state. `onOpenChange(false)` fires on every close path — Escape, a backdrop
 * click, or a close button calling it — so one handler covers them all.
 */
interface IDrawerOwnProps extends Pick<DrawerVariants, "side" | "size"> {
  /**
   * Whether the drawer is open. Controlled: pass it with `onOpenChange`. Leave
   * it `undefined` to let the drawer own its open state from `defaultOpen`.
   */
  readonly open?: boolean;

  /** The open state on mount while uncontrolled. Defaults to `false`. */
  readonly defaultOpen?: boolean;

  /**
   * Called whenever the drawer wants to open or close — Escape, a click on the
   * backdrop, or your own close control. The only way to observe a close, and
   * required to close a controlled drawer.
   */
  readonly onOpenChange?: (open: boolean) => void;

  /**
   * Whether a click on the backdrop (the area outside the panel) closes the
   * drawer. Defaults to `true`. Set `false` for a drawer the user must act in
   * before dismissing.
   */
  readonly dismissOnBackdropClick?: boolean;

  /** The drawer's content: your header, body and any footer controls. */
  readonly children?: ReactNode;

  /** Class for the content panel. `className` goes to the `<dialog>`. */
  readonly panelClassName?: string;

  readonly ref?: Ref<HTMLDialogElement>;
}

/**
 * {@link Drawer}'s props.
 *
 * A panel that slides in from the start or end edge of the viewport, over a
 * scrim, built on the native `<dialog>` element. Floored at 200px wide and
 * capped at half the viewport.
 *
 * The accessible name is required and comes from either `title` or `aria-label`,
 * never both and never neither — see {@link IDrawerNamedByTitle}.
 */
type IDrawerProps =
  & IDrawerOwnProps
  & (IDrawerNamedByTitle | IDrawerNamedByLabel)
  // The native `<dialog>` attributes, minus the ones the component owns: its
  // open state is driven through `open`/`onOpenChange`, its title is the `title`
  // prop above (a heading, not the HTML tooltip attribute), and `children` is
  // typed here.
  & Omit<
    ComponentPropsWithoutRef<"dialog">,
    "open" | "title" | "children" | "ref"
  >;

export type { IDrawerProps };
