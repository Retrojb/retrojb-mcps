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
 * The checkbox pair.
 *
 * `Checkbox` is a native `<input type="checkbox">` drawn with `appearance-none`,
 * so focus, clicks, `FormData` and the reported state — `mixed` included, for
 * `indeterminate` — stay native. `label` is required, as on `Input`.
 *
 * `CheckboxGroup` is a `<fieldset>` + `<legend>` holding one `string[]` value,
 * controlled (`value` / `onValueChange`) or not (`defaultValue`). Build it from
 * an `options` array, from `<Checkbox value>` children joined through context,
 * or both. Its `required` means "at least one", which native `required` on the
 * individual boxes does not — see the note in `CheckboxGroup.tsx`. The layout is
 * `DynamicContainer`'s, below.
 */
export {
  Checkbox,
  checkboxStyles,
  type CheckboxVariants,
  type ICheckboxProps,
} from "./components/forms/Checkbox";

export {
  CheckboxGroup,
  checkboxGroupStyles,
  type CheckboxGroupVariants,
  type ICheckboxGroupOption,
  type ICheckboxGroupProps,
} from "./components/forms/CheckboxGroup";

/*
 * Toggle — an on/off switch.
 *
 * A native `<input type="checkbox" role="switch">` drawn as the track, the same
 * `appearance-none` pattern as `Checkbox`, so `name`, `value`, `required`,
 * `checked` / `defaultChecked` / `onChange` and `form.reset()` are all native.
 * `label` is required; `labelPosition` defaults to `"start"`, the settings-list
 * layout with the switch at the end of the row.
 *
 * Toggle or Checkbox: a switch takes effect the moment it is flipped — Wi-Fi
 * on, dark mode off — and is announced as "on" / "off". A checkbox is a choice
 * the user makes and then submits with a form, and is announced as "checked".
 * If nothing happens until a Save button is pressed, use a `Checkbox`.
 */
export {
  Toggle,
  toggleStyles,
  type IToggleProps,
  type ToggleVariants,
} from "./components/forms/Toggle";

/*
 * SegmentedControl — one choice from a short row of mutually exclusive
 * segments, "Day | Week | Month".
 *
 * A `<fieldset role="radiogroup">` of native radios drawn with
 * `appearance-none`, so one tab stop, wrapping arrow keys that skip disabled
 * segments, `FormData` and `disabled` on the whole group are the browser's;
 * Home / End is added on top. `label` is required — it is the group's
 * accessible name — and `labelHidden` hides it visually. Controlled with
 * `value` / `onValueChange` or uncontrolled with `defaultValue`, as on
 * `CheckboxGroup`.
 *
 * SegmentedControl or Tabs: segments choose a value — a view, a unit, a filter.
 * If each choice reveals a different panel of content, that is a tab list.
 */
export {
  SegmentedControl,
  segmentedControlStyles,
  type ISegmentedControlOption,
  type ISegmentedControlProps,
  type SegmentedControlVariants,
} from "./components/forms/SegmentedControl";

/*
 * The combobox pair.
 *
 * Two components rather than one with a `variant` prop, for the same reason the
 * alerts below are three. What differs is not appearance — they draw the same
 * box from the same `comboBoxStyle` — but the contract:
 *
 *   - `ComboBox` is a form control. The user has to end up on one of the
 *     options, free text is reverted on blur, and the committed value reaches
 *     `FormData` through a hidden input.
 *   - `SearchBox` is navigational. The raw query is a valid outcome, so Enter
 *     submits it, text survives a blur, and there is no committed value at all —
 *     `value` and `name` are not on its props. It is a `search` landmark, which a
 *     form control must never be.
 *
 * A style variant cannot switch between those. The behaviour they do share lives
 * in `useComboBox`, and both are built on it.
 */
export {
  ComboBox,
  comboBoxStyle,
  type ComboBoxVariants,
  type IComboBoxOptionState,
  type IComboBoxProps,
} from "./components/forms/ComboBox";

export { SearchBox, type ISearchBoxProps } from "./components/forms/SearchBox";

/*
 * The behavioural core, exported so the markup can be replaced without
 * reimplementing the keyboard and ARIA contract — grouped options under
 * headings, multi-select with removable chips, a command palette whose popup is a
 * dialog. It returns prop getters rather than rendering anything, and is the
 * behavioural counterpart to exporting `comboBoxStyle` for markup this package
 * does not own.
 *
 * `comboBoxFilter` and `highlightSegments` come with it. The matcher is a pure
 * module with no React in it, so a server component ranking a static result list
 * can call it directly; `highlightSegments` turns the ranges it returns into runs
 * of text to mark up.
 */
export {
  useComboBox,
  DEFAULT_LABELS as COMBOBOX_DEFAULT_LABELS,
  DEFAULT_MAX_RESULTS as COMBOBOX_DEFAULT_MAX_RESULTS,
  type ComboBoxAutocomplete,
  type ComboBoxBlurBehaviour,
  type ComboBoxOptionProps,
  type IComboBoxLabels,
  type IUseComboBoxOptions,
  type IUseComboBoxResult,
} from "./hooks/useComboBox";

export { useControllableState } from "./hooks/useControllableState";

export {
  comboBoxFilter,
  highlightSegments,
  type ComboBoxFilter,
  type IComboBoxMatch,
  type IHighlightSegment,
  type IMatchRange,
} from "./lib/filter";

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
/*
 * The cards.
 *
 * Three components on one `cardStyles` slot recipe, split where the contract
 * differs and not where only the layout does:
 *
 *   - `Card` is a static box. No role; `as` supplies `article`, `section` or `li`
 *     semantics where they apply.
 *   - `InteractiveCard` is one click target with one real control in it — an `<a>`
 *     with `href`, a `<button>` without — whose `::after` is stretched over the
 *     card. `title` is required because it is that control's accessible name;
 *     secondary controls go in `actions`, above the overlay.
 *   - `GraphicCard` adds a media region and an `orientation` variant. Horizontal
 *     collapses to vertical by *container* width, so the card lays out for the
 *     space it is given rather than for the viewport.
 *
 * `CardHeader`, `CardTitle`, `CardBody` and `CardFooter` are optional parts for
 * `Card` and `GraphicCard`. The specifier names the barrel file explicitly, per the
 * note at the top of this module; `tsc-alias` adds the `.js` on the way to `dist`.
 */
export {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  GraphicCard,
  InteractiveCard,
  cardStyles,
  type CardElement,
  type CardHeadingLevel,
  type CardVariants,
  type ICardBodyProps,
  type ICardFooterProps,
  type ICardHeaderProps,
  type ICardProps,
  type ICardTitleProps,
  type IGraphicCardProps,
  type IInteractiveCardButtonProps,
  type IInteractiveCardLinkProps,
  type IInteractiveCardProps,
} from "./components/containers/card/index";

/*
 * DynamicContainer — a flex layout that stacks below the `sm` breakpoint and
 * lays out in a wrapping row from `sm` up.
 *
 * `direction` pins it to one axis instead; `gap` and `align` map to the spacing
 * tokens and `items-*`. The breakpoint is the viewport's by default and the
 * nearest `@container` ancestor's with `responsiveTo="container"`. `as` renders
 * a `ul` or `ol` (with `role="list"` restored) when the items are a list.
 */
export {
  DynamicContainer,
  dynamicContainerStyles,
  type DynamicContainerElement,
  type DynamicContainerVariants,
  type IDynamicContainerProps,
} from "./components/containers/dynamicContainer";

/*
 * Typography — headings and body text on the semantic type roles.
 *
 * The exception to "the components are client modules" above: nothing in this
 * group has `"use client"`, because none of it uses a hook. Each renders in a
 * server component as-is.
 *
 * Five named headings rather than one `<Heading size>`. Each fixes a level and
 * a role that belong together — `PageHeading` is an `<h1>` at `heading-xl`,
 * `SubHeading` an `<h3>` at `heading-sm` — and takes `level` and `size` to
 * override either independently. Choose `level` from the outline and never to
 * get a size (1.3.1); the reasoning is in `components/typography/index.ts`.
 *
 * `CodeBlock` requires `label`: it is a keyboard-focusable scroll region, and
 * the label is its accessible name. `Reference` is an attributed quotation —
 * `<figure>`, `<blockquote>`, `<figcaption>` — not an inline `<cite>`.
 */
export {
  Code,
  CodeBlock,
  List,
  ListItem,
  PageHeading,
  Paragraph,
  ProductHeading,
  Reference,
  SectionHeading,
  SubHeading,
  TitleHeading,
  codeBlockStyles,
  codeStyles,
  listItemStyles,
  listStyles,
  pageHeadingStyles,
  paragraphStyles,
  productHeadingStyles,
  referenceStyles,
  sectionHeadingStyles,
  subHeadingStyles,
  titleHeadingStyles,
  type HeadingLevel,
  type HeadingSize,
  type HeadingVariants,
  type ICodeBlockProps,
  type ICodeProps,
  type IHeadingProps,
  type IListItemProps,
  type IListProps,
  type IPageHeadingProps,
  type IParagraphProps,
  type IProductHeadingProps,
  type IReferenceProps,
  type ISectionHeadingProps,
  type ISubHeadingProps,
  type ITitleHeadingProps,
  type ListVariants,
  type PageHeadingVariants,
  type ParagraphVariants,
  type ProductHeadingVariants,
  type ReferenceVariants,
  type SectionHeadingVariants,
  type SubHeadingVariants,
  type TitleHeadingVariants,
} from "./components/typography/index";
// Re-exported so consumers compose class names with the same conflict-resolution
// rules the components use, rather than a second, differently-configured copy.
export { cn, cx, tv, type VariantProps } from "./lib/tv";
// The semantic type roles; `text-${role}` is the utility for each. See the
// typography section of `styles/tokens.css`.
export { TYPE_ROLES, type TypeRole } from "./lib/tv";
