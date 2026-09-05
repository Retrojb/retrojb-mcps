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
 * Each component is a directory under `components/<group>/<Name>` holding the
 * component, its `styles.ts`, its `types.ts` and a barrel. The components are
 * client modules; the `styles.ts` beside them are not, so `buttonStyle()`,
 * `linkStyle()`, `inputStyle()` and `tableStyle()` can be called from a server
 * component to style an element this package does not own — a router's `<Link>`,
 * a `<textarea>` that has to match the inputs around it, a static `<table>` with
 * no TanStack instance behind it.
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

// Re-exported so consumers compose class names with the same conflict-resolution
// rules the components use, rather than a second, differently-configured copy.
export { cn, cx, tv, type VariantProps } from "./lib/tv";
