export {
  Button,
  buttonStyle,
  type IButtonProps,
  type ButtonVariants,
} from "./components/actions/Button";

export {
  Link,
  linkStyle,
  type ILinkProps,
  type LinkVariants,
} from "./components/navigation/Link";

export {
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  tabGroupStyles,
  type ITabGroupProps,
  type ITabListProps,
  type ITabPanelProps,
  type ITabProps,
  type TabActivation,
  type TabGroupVariants,
} from "./components/navigation/TabGroup";

export {
  Input,
  inputStyle,
  type IInputProps,
  type InputVariants,
} from "./components/forms/Input";

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

export {
  Toggle,
  toggleStyles,
  type IToggleProps,
  type ToggleVariants,
} from "./components/forms/Toggle";

export {
  SegmentedControl,
  segmentedControlStyles,
  type ISegmentedControlOption,
  type ISegmentedControlProps,
  type SegmentedControlVariants,
} from "./components/forms/SegmentedControl";

export {
  Radio,
  radioStyles,
  type IRadioProps,
  type RadioVariants,
} from "./components/forms/Radio";

export {
  RadioGroup,
  radioGroupStyles,
  type IRadioGroupOption,
  type IRadioGroupProps,
  type RadioGroupVariants,
} from "./components/forms/RadioGroup";

export {
  ComboBox,
  comboBoxStyle,
  type ComboBoxVariants,
  type IComboBoxOptionState,
  type IComboBoxProps,
} from "./components/forms/ComboBox";

export { SearchBox, type ISearchBoxProps } from "./components/forms/SearchBox";

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

export {
  ProgressBar,
  progressBarStyles,
  type IProgressBarProps,
  type IProgressBarValue,
  type ProgressBarVariants,
} from "./components/alerts/progressBar";

export {
  Icon,
  iconStyles,
  type IIconDecorativeProps,
  type IIconLabelledProps,
  type IIconProps,
  type IconTone,
  type IconVariants,
} from "./components/content/icon";

/*
 * Tag — a short, non-interactive label that categorises an item or states its
 * status.
 *
 * Renders a plain `<span>`: no role, no tab stop, no handlers. `Chip` is the
 * interactive sibling for filters and toggles; reach for it when the label can
 * be pressed. There is no `warning` tone because the palette has no `--warning`
 * token.
 */
export {
  Tag,
  tagStyles,
  type ITagProps,
  type TagVariants,
} from "./components/content/tag";

/*
 * Chip — a small toggle button for filter-style selection.
 *
 * Renders one `<button type="button">` with `aria-pressed`, and a check icon
 * when selected so the state is not colour alone. `Tag` is the static sibling:
 * use it for a label that cannot be pressed. There is no `onRemove` (a
 * removable chip is a different contract) and no `ChipGroup`; wrap a set of
 * chips in a `role="group"` with an accessible name. `selected` and
 * `onSelectedChange` control it, `defaultSelected` leaves the state to the chip.
 */
export {
  Chip,
  chipStyles,
  type ChipVariants,
  type IChipProps,
} from "./components/content/chip";

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

export {
  DynamicContainer,
  dynamicContainerStyles,
  type DynamicContainerElement,
  type DynamicContainerVariants,
  type IDynamicContainerProps,
} from "./components/containers/dynamicContainer";

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
