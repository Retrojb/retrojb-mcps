/**
 * Shared React primitives, styled with Tailwind.
 *
 * The stylesheet is not imported by this module — a JS import cannot reliably
 * pull CSS into every bundler, and doing it here would make the package
 * unusable in any app that processes CSS separately. Import it once, at the
 * app's entry point:
 *
 * ```ts
 * import "@retrojb/ui/styles.css";
 * ```
 *
 * Each component is a directory under `components/<group>/<name>` holding the
 * component, its `styles.ts`, its `types.ts` and a barrel. The components are
 * client modules; the `styles.ts` beside them are not, so `buttonStyle()`,
 * `linkStyle()`, `inputStyle()`, `tableStyle()` and the `*AlertStyles()` can be
 * called from a server component to style an element this package does not own — a
 * router's `<Link>`, a `<textarea>` that has to match the inputs around it, a static
 * `<table>` with no TanStack instance behind it.
 *
 * Specifiers below are explicit files rather than directories. `./…/Button`
 * resolves under a bundler and nowhere else; `./…/Button/index.js` resolves
 * everywhere, and is what the emitted ESM in `dist` needs.
 */

export {
  Button,
  buttonStyle,
  type IButtonProps,
  type ButtonVariants,
} from "./components/interactions/Button";

export {
  Link,
  linkStyle,
  type ILinkProps,
  type LinkVariants,
} from "./components/navigation/Link";

export {
  Input,
  inputStyle,
  type IInputProps,
  type InputVariants,
} from "./components/forms/Input";

/*
 * The parts are exported flat as well as on `Table` itself. `<Table.Head>` reads
 * better in markup; the named exports are what you want when a part has to be
 * passed somewhere or wrapped.
 *
 * `@tanstack/react-table` is a peer dependency, not a bundled one. The instance
 * type crosses this boundary — `table` is a `Table<TFeatures, TData>` built by
 * the app's own `useTable` call — and two copies of the package in one tree means
 * two structurally identical types that TypeScript will not accept for each
 * other, with an error that does not name the cause.
 */
export {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  tableStyle,
  type ITableBodyProps,
  type ITableCellProps,
  type ITableEmptyProps,
  type ITableFootProps,
  type ITableHeadProps,
  type ITableHeaderCellProps,
  type ITableProps,
  type ITableRowProps,
  type TableVariants,
} from "./components/data/Table";

/*
 * The alerts.
 *
 * Three components rather than one with a `variant` prop, because the thing that
 * differs between them is not appearance — they draw the same box — but how and
 * whether a message reaches assistive technology. That is not something a style
 * variant can switch between:
 *
 *   - `InlineAlert` sits in the page flow. Its live region stays mounted while there
 *     is nothing to say, which is what makes a message that arrives later
 *     announceable at all.
 *   - `ToastAlert` floats, and cannot announce itself — a live region only reports
 *     changes inside a region already being watched. `ToastRegion` is that region,
 *     mounted once and kept, with toasts appended into it.
 *   - `BrowserAlert` interrupts. A real `<dialog>` opened with `showModal()`, so the
 *     focus trap, the inert background, Escape-to-close and focus restoration come
 *     from the platform rather than from a `keydown` handler.
 *
 * `AlertTone` is shared by all three and is the union their `tone` props accept.
 */
export {
  InlineAlert,
  inlineAlertStyles,
  type IInlineAlertProps,
  type InlineAlertLiveness,
  type InlineAlertVariants,
} from "./components/alerts/inlineAlert";

export {
  ToastAlert,
  ToastRegion,
  toastAlertStyles,
  toastRegionStyles,
  type IToastAlertProps,
  type IToastRegionProps,
  type ToastAlertVariants,
  type ToastRegionVariants,
} from "./components/alerts/toastAlert";

export {
  BrowserAlert,
  browserAlertStyles,
  type IBrowserAlertProps,
  type BrowserAlertVariants,
} from "./components/alerts/browserAlert";

export { ALERT_TONE_LABELS, type AlertTone } from "./components/alerts/tone";

// Re-exported so consumers compose class names with the same conflict-resolution
// rules the components use, rather than a second, differently-configured copy.
export { cn, cx, tv, type VariantProps } from "./lib/tv";
