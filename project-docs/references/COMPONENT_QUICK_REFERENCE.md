# Component Quick Reference

Components in `@retrojb/ui`, from
`packages/ui/src/components/<category>/<name>`.

Last checked against `../../packages/ui/src/index.ts` and the Storybook stories on
2026-11-02. This file is maintained by hand for now. Once every component has a
`<Name>Spec.yaml`, it will be generated from those files.

Component names are the exported names, exactly as they appear in
`../../packages/ui/src/index.ts` and in the component's `<Name>Spec.yaml`. Where a
component has several parts, the name is the root part (`TabGroup`, not "Tabs").

Every component has a `<Name>Spec.yaml` in its folder (parts such as `CardTitle`
are listed in their root component's spec). The specs are the source of truth;
where this file and a spec disagree, the spec is right.

Status key:

- Shipped: implemented and exported from `../../packages/ui/src/index.ts`
- Stub: placeholder files with markup but no real implementation, not exported
- Planned: empty scaffold files or an empty folder only

Coverage key:

- Story: a `*.stories.tsx` file under `../../apps/retrojb-storybook/src/stories`
- A11y doc: an accessibility MDX page under that folder's `accessibilityDocs/`.
  Shared means one page covers the whole group.
- No component has unit tests or visual regression tests yet.

- [Components by category](#components-by-category)
- [Components and their parts](#components-and-their-parts)
- [Shared hooks and utilities](#shared-hooks-and-utilities)
- [Spreadsheet list](#spreadsheet-list)

## Components by category

| Component        | Category   | Status  | Path                                 | Story | A11y doc |
| ---------------- | ---------- | ------- | ------------------------------------ | ----- | -------- |
| Button           | Actions    | Shipped | `actions/Button`                     | Yes   | Yes      |
| FAB              | Actions    | Planned | `actions/FAB`                        | No    | No       |
| BrowserAlert     | Alerts     | Shipped | `alerts/browserAlert`                | Yes   | Yes      |
| InlineAlert      | Alerts     | Shipped | `alerts/inlineAlert`                 | Yes   | Yes      |
| ProgressBar      | Alerts     | Shipped | `alerts/progressBar`                 | Yes   | Yes      |
| ToastAlert       | Alerts     | Shipped | `alerts/toastAlert`                  | Yes   | Yes      |
| Card             | Containers | Shipped | `containers/card`                    | Yes   | Shared   |
| DynamicContainer | Containers | Shipped | `containers/dynamicContainer`        | Yes   | Yes      |
| GraphicCard      | Containers | Shipped | `containers/card`                    | Yes   | Shared   |
| InteractiveCard  | Containers | Shipped | `containers/card`                    | Yes   | Shared   |
| Avatar           | Content    | Planned | `content/avatar`                     | No    | No       |
| Chip             | Content    | Shipped | `content/chip`                       | Yes   | Yes      |
| Icon             | Content    | Shipped | `content/icon`                       | Yes   | Yes      |
| Tag              | Content    | Shipped | `content/tag`                        | Yes   | Yes      |
| Table            | Data       | Shipped | `data/Table`                         | Yes   | Yes      |
| Checkbox         | Forms      | Shipped | `forms/Checkbox`                     | Yes   | Yes      |
| CheckboxGroup    | Forms      | Shipped | `forms/CheckboxGroup`                | Yes   | Yes      |
| ComboBox         | Forms      | Shipped | `forms/ComboBox`                     | Yes   | Yes      |
| Input            | Forms      | Shipped | `forms/Input`                        | Yes   | Yes      |
| Radio            | Forms      | Shipped | `forms/Radio`                        | Yes   | Yes      |
| RadioGroup       | Forms      | Shipped | `forms/RadioGroup`                   | Yes   | Yes      |
| SearchBox        | Forms      | Shipped | `forms/SearchBox`                    | Yes   | Yes      |
| SegmentedControl | Forms      | Shipped | `forms/SegmentedControl`             | Yes   | Yes      |
| Toggle           | Forms      | Shipped | `forms/Toggle`                       | Yes   | Yes      |
| Link             | Navigation | Shipped | `navigation/Link`                    | Yes   | Yes      |
| TabGroup         | Navigation | Shipped | `navigation/TabGroup`                | Yes   | Yes      |
| Code             | Typography | Shipped | `typography/body/code`               | Yes   | Shared   |
| CodeBlock        | Typography | Shipped | `typography/body/code`               | Yes   | Shared   |
| Emphasis         | Typography | Shipped | `typography/body/emphasis`           | Yes   | Shared   |
| List             | Typography | Shipped | `typography/body/lists`              | Yes   | Shared   |
| Paragraph        | Typography | Shipped | `typography/body/paragraph`          | Yes   | Shared   |
| Reference        | Typography | Shipped | `typography/body/reference`          | Yes   | Shared   |
| Strong           | Typography | Shipped | `typography/body/strong`             | Yes   | Shared   |
| PageHeading      | Typography | Shipped | `typography/headings/pageHeading`    | Yes   | Shared   |
| ProductHeading   | Typography | Shipped | `typography/headings/productHeading` | Yes   | Shared   |
| SectionHeading   | Typography | Shipped | `typography/headings/sectionHeading` | Yes   | Shared   |
| SubHeading       | Typography | Shipped | `typography/headings/subHeading`     | Yes   | Shared   |
| TitleHeading     | Typography | Shipped | `typography/headings/titleHeading`   | Yes   | Shared   |

## Components and their parts

- Actions
  - Button
    - `Button`
    - `buttonStyle`
  - FAB
- Alerts
  - BrowserAlert
    - `BrowserAlert` (a real `<dialog>` opened with `showModal()`)
    - `browserAlertStyles`
  - InlineAlert
    - `InlineAlert` (live region stays mounted while empty)
    - `inlineAlertStyles`
  - ProgressBar
    - `ProgressBar` (`<div role="progressbar">`; determinate with `value`,
      indeterminate without; not a live region)
    - `progressBarStyles`
  - ToastAlert
    - `ToastAlert`
    - `ToastRegion` (mounted once; toasts are appended into it)
    - `toastAlertStyles`
    - `toastRegionStyles`
  - Shared
    - `ALERT_TONE_LABELS`
    - `AlertTone` (type)
- Containers
  - Card
    - `Card`
    - `CardHeader`
    - `CardTitle`
    - `CardBody`
    - `CardFooter`
    - `CardContext` (internal)
    - `cardStyles` (shared by Card, GraphicCard and InteractiveCard)
  - DynamicContainer
    - `DynamicContainer`
    - `dynamicContainerStyles`
  - GraphicCard
    - `GraphicCard` (`orientation`: vertical or horizontal, collapses by
      container width)
    - Uses `CardHeader`, `CardTitle`, `CardBody`, `CardFooter` and `cardStyles`
  - InteractiveCard
    - `InteractiveCard` (link mode with `href`, button mode without)
    - Uses `cardStyles`
- Content
  - Avatar
  - Chip
    - `Chip` (`<button aria-pressed>` toggle for filter-style selection)
    - `chipStyles`
  - Icon
    - `Icon` (wraps a Lucide component; decorative unless `label` is set)
    - `iconStyles`
    - `ICON_SIZE_PX`, `ICON_STROKE_WIDTH` (internal)
    - `@retrojb/ui/icons` (subpath re-exporting `lucide-react`, with `Icon`
      shadowing Lucide's own)
  - Tag
    - `Tag` (static `<span>` label with a `tone`; not interactive)
    - `tagStyles`
- Data
  - Table
    - `Table` (parts also available as `Table.Head`, `Table.Body` and so on)
    - `TableHead`
    - `TableHeaderCell`
    - `TableBody`
    - `TableRow`
    - `TableCell`
    - `TableFoot`
    - `TableEmpty`
    - `tableStyle`
- Forms
  - Checkbox
    - `Checkbox`
    - `checkboxStyles`
  - CheckboxGroup
    - `CheckboxGroup` (lays out with `DynamicContainer`)
    - `CheckboxGroupContext` (internal)
    - `checkboxGroupStyles`
  - ComboBox
    - `ComboBox`
    - `OptionContent` (internal)
    - `comboBoxStyle`
    - `useComboBox` (hook, in `src/hooks/useComboBox.ts`)
    - `COMBOBOX_DEFAULT_LABELS`, `COMBOBOX_DEFAULT_MAX_RESULTS` (constants,
      exported with `useComboBox`)
    - `comboBoxFilter`, `highlightSegments` (utility, in `src/lib/filter.ts`)
  - Input
    - `Input`
    - `inputStyle`
  - Radio
    - `Radio` (native radio drawn with `appearance-none`)
    - `radioStyles`
  - RadioGroup
    - `RadioGroup` (`<fieldset role="radiogroup">`, lays out with
      `DynamicContainer`)
    - `RadioGroupContext` (internal)
    - `radioGroupStyles`
  - SearchBox
    - `SearchBox` (built on `useComboBox`, shares `comboBoxStyle`)
  - SegmentedControl
    - `SegmentedControl` (`<fieldset role="radiogroup">` of native radios)
    - `segmentedControlStyles`
  - Toggle
    - `Toggle` (native checkbox with `role="switch"`)
    - `toggleStyles`
- Navigation
  - Link
    - `Link`
    - `linkStyle`
  - TabGroup
    - `TabGroup` (container; owns the selection, controlled or not)
    - `TabList` (`role="tablist"` in a scroller; the keyboard contract)
    - `Tab` (`<button role="tab">`, roving `tabIndex`)
    - `TabPanel` (`role="tabpanel"`, a tab stop by default)
    - `TabGroupContext` (internal)
    - `tabGroupStyles`
- Typography
  - Body
    - Code
      - `Code` (inline)
      - `codeStyles`
    - CodeBlock
      - `CodeBlock` (`<pre><code>`, focusable scroll region, `label` required)
      - `codeBlockStyles`
    - Emphasis
      - `Emphasis` (`<em>`, italic; stress emphasis inside running text)
      - `emphasisStyles`
    - List
      - `List` (`ordered` switches `ul` / `ol`, keeps markers)
      - `ListItem`
      - `listStyles`
      - `listItemStyles`
    - Paragraph
      - `Paragraph`
      - `paragraphStyles`
    - Reference
      - `Reference` (attributed quotation: `figure`, `blockquote`, `figcaption`,
    - Strong
      - `Strong` (`<strong>`, bold; strong importance inside running text)
      - `strongStyles` `cite`)
      - `referenceStyles`
  - Headings
    - PageHeading
      - `PageHeading` (`heading-xl`, default `h1`)
      - `pageHeadingStyles`
    - ProductHeading
      - `ProductHeading` (`display`, default `h1`)
      - `productHeadingStyles`
    - SectionHeading
      - `SectionHeading` (`heading-md`, default `h2`)
      - `sectionHeadingStyles`
    - SubHeading
      - `SubHeading` (`heading-sm`, default `h3`)
      - `subHeadingStyles`
    - TitleHeading
      - `TitleHeading` (`heading-lg`, default `h2`)
      - `titleHeadingStyles`
    - Shared
      - `HeadingBase` (internal)
      - `headingStyles` (internal, extended by every heading's styles)
      - `HeadingLevel` (type)
      - `HeadingSize` (type)

## Shared hooks and utilities

Exported from `@retrojb/ui` but not tied to one component.

- `useControllableState` (hook, `src/hooks/useControllableState.ts`): the
  controlled / uncontrolled `value` pattern used by `CheckboxGroup`,
  `SegmentedControl`, `TabGroup` and `useComboBox`
- `cn`, `cx`, `tv`, `VariantProps` (utility, `src/lib/tv.ts`): class composition
  with the same merge rules the components use
- `TYPE_ROLES`, `TypeRole` (constant and type, `src/lib/tv.ts`): the semantic
  type roles; `text-${role}` is the utility for each

## Spreadsheet list

CSV, one row per component. Paste into a spreadsheet and split on commas.

```csv
Component,Category,Subcategory,Status,Path,Parts
Button,Actions,,Shipped,actions/Button,Button; buttonStyle
FAB,Actions,,Planned,actions/FAB,
BrowserAlert,Alerts,,Shipped,alerts/browserAlert,BrowserAlert; browserAlertStyles
InlineAlert,Alerts,,Shipped,alerts/inlineAlert,InlineAlert; inlineAlertStyles
ProgressBar,Alerts,,Shipped,alerts/progressBar,ProgressBar; progressBarStyles
ToastAlert,Alerts,,Shipped,alerts/toastAlert,ToastAlert; ToastRegion; toastAlertStyles; toastRegionStyles
Card,Containers,,Shipped,containers/card,Card; CardHeader; CardTitle; CardBody; CardFooter; CardContext; cardStyles
DynamicContainer,Containers,,Shipped,containers/dynamicContainer,DynamicContainer; dynamicContainerStyles
GraphicCard,Containers,,Shipped,containers/card,GraphicCard; CardHeader; CardTitle; CardBody; CardFooter; cardStyles
InteractiveCard,Containers,,Shipped,containers/card,InteractiveCard; cardStyles
Avatar,Content,,Planned,content/avatar,
Chip,Content,,Shipped,content/chip,Chip; chipStyles
Icon,Content,,Shipped,content/icon,Icon; iconStyles; ICON_SIZE_PX; ICON_STROKE_WIDTH; @retrojb/ui/icons
Tag,Content,,Shipped,content/tag,Tag; tagStyles
Table,Data,,Shipped,data/Table,Table; TableHead; TableHeaderCell; TableBody; TableRow; TableCell; TableFoot; TableEmpty; tableStyle
Checkbox,Forms,,Shipped,forms/Checkbox,Checkbox; checkboxStyles
CheckboxGroup,Forms,,Shipped,forms/CheckboxGroup,CheckboxGroup; CheckboxGroupContext; checkboxGroupStyles
ComboBox,Forms,,Shipped,forms/ComboBox,ComboBox; OptionContent; comboBoxStyle; useComboBox; COMBOBOX_DEFAULT_LABELS; COMBOBOX_DEFAULT_MAX_RESULTS; comboBoxFilter; highlightSegments
Input,Forms,,Shipped,forms/Input,Input; inputStyle
Radio,Forms,,Shipped,forms/Radio,Radio; radioStyles
RadioGroup,Forms,,Shipped,forms/RadioGroup,RadioGroup; RadioGroupContext; radioGroupStyles
SearchBox,Forms,,Shipped,forms/SearchBox,SearchBox
SegmentedControl,Forms,,Shipped,forms/SegmentedControl,SegmentedControl; segmentedControlStyles
Toggle,Forms,,Shipped,forms/Toggle,Toggle; toggleStyles
Link,Navigation,,Shipped,navigation/Link,Link; linkStyle
TabGroup,Navigation,,Shipped,navigation/TabGroup,TabGroup; TabList; Tab; TabPanel; TabGroupContext; tabGroupStyles
Code,Typography,Body,Shipped,typography/body/code,Code; codeStyles
CodeBlock,Typography,Body,Shipped,typography/body/code,CodeBlock; codeBlockStyles
Emphasis,Typography,Body,Shipped,typography/body/emphasis,Emphasis; emphasisStyles
List,Typography,Body,Shipped,typography/body/lists,List; ListItem; listStyles; listItemStyles
Paragraph,Typography,Body,Shipped,typography/body/paragraph,Paragraph; paragraphStyles
Reference,Typography,Body,Shipped,typography/body/reference,Reference; referenceStyles
Strong,Typography,Body,Shipped,typography/body/strong,Strong; strongStyles
PageHeading,Typography,Headings,Shipped,typography/headings/pageHeading,PageHeading; pageHeadingStyles; HeadingBase
ProductHeading,Typography,Headings,Shipped,typography/headings/productHeading,ProductHeading; productHeadingStyles; HeadingBase
SectionHeading,Typography,Headings,Shipped,typography/headings/sectionHeading,SectionHeading; sectionHeadingStyles; HeadingBase
SubHeading,Typography,Headings,Shipped,typography/headings/subHeading,SubHeading; subHeadingStyles; HeadingBase
TitleHeading,Typography,Headings,Shipped,typography/headings/titleHeading,TitleHeading; titleHeadingStyles; HeadingBase
```

---

author: John Baltes

updated: 2026-11-05

---
