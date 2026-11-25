import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { ModalVariants } from "./styles";

/**
 * The accessible name of the modal.
 *
 * A modal dialog must have one (4.1.2): a screen reader announces "dialog" and
 * then this, so a modal without it is announced as an unnamed dialog. There are
 * two ways to give it, and exactly one is required — the union below makes that
 * a compile-time rule rather than a runtime check.
 *
 * - `title` renders a visible heading at the top of the modal and names it via
 *   `aria-labelledby`. Prefer this: the name is on screen as well as announced,
 *   and a form the user is filling in benefits from a visible heading anyway.
 * - `aria-label` names it when the design has no room for a visible heading. The
 *   name is then in the accessibility tree only.
 */
interface IModalNamedByTitle {
  /**
   * A visible heading rendered at the top of the modal, and its accessible
   * name. Wired to `aria-labelledby` from a generated `useId`.
   */
  readonly title: ReactNode;
  readonly "aria-label"?: never;
}

interface IModalNamedByLabel {
  readonly title?: never;
  /**
   * The accessible name, when there is no visible heading. Use `title` instead
   * wherever the design has room for one.
   */
  readonly "aria-label": string;
}

/**
 * The modal's own props, before the native `<dialog>` attributes and the
 * accessible-name union are mixed in.
 *
 * `open`/`onOpenChange` are the controllable pair: pass both to drive the modal
 * from your own state, pass neither (with `defaultOpen`) to let it own the
 * state. `onOpenChange(false)` fires on every close path — Escape, a backdrop
 * click, or a close or submit control calling it — so one handler covers them
 * all.
 */
interface IModalOwnProps extends Pick<ModalVariants, "size"> {
  /**
   * Whether the modal is open. Controlled: pass it with `onOpenChange`. Leave
   * it `undefined` to let the modal own its open state from `defaultOpen`.
   */
  readonly open?: boolean;

  /** The open state on mount while uncontrolled. Defaults to `false`. */
  readonly defaultOpen?: boolean;

  /**
   * Called whenever the modal wants to open or close — Escape, a click on the
   * backdrop, or your own close or submit control. The only way to observe a
   * close, and required to close a controlled modal.
   */
  readonly onOpenChange?: (open: boolean) => void;

  /**
   * Whether a click on the backdrop (the area outside the panel) closes the
   * modal. Defaults to `true`. Set `false` for a form the user must submit or
   * cancel explicitly, so a stray click does not discard their input.
   */
  readonly dismissOnBackdropClick?: boolean;

  /** The modal's content: your heading, the form, and its submit controls. */
  readonly children?: ReactNode;

  /** Class for the content panel. `className` goes to the `<dialog>`. */
  readonly panelClassName?: string;

  readonly ref?: Ref<HTMLDialogElement>;
}

/**
 * {@link Modal}'s props.
 *
 * A centered modal dialog for capturing a small amount of input, such as a login
 * or sign-up form, built on the native `<dialog>` element. Capped at a
 * `max-width` per `size` and at `calc(100% - 2rem)` so it never touches the
 * viewport edges.
 *
 * The accessible name is required and comes from either `title` or `aria-label`,
 * never both and never neither — see {@link IModalNamedByTitle}.
 */
type IModalProps =
  & IModalOwnProps
  & (IModalNamedByTitle | IModalNamedByLabel)
  // The native `<dialog>` attributes, minus the ones the component owns: its
  // open state is driven through `open`/`onOpenChange`, its title is the `title`
  // prop above (a heading, not the HTML tooltip attribute), and `children` is
  // typed here.
  & Omit<
    ComponentPropsWithoutRef<"dialog">,
    "open" | "title" | "children" | "ref"
  >;

export type { IModalProps };
