# Component Quick Reference

Components in `@retrojb/ui`, from
`packages/ui/src/components/<category>/<name>`.

Status key:

- Shipped: implemented and exported from `packages/ui/src/index.ts`
- Stub: placeholder files with markup but no real implementation, not exported
- Planned: empty scaffold files only

## Components by category

| Component        | Category     | Status  | Path                                 |
| ---------------- | ------------ | ------- | ------------------------------------ |
| BrowserAlert     | Alerts       | Shipped | `alerts/browserAlert`                |
| InlineAlert      | Alerts       | Shipped | `alerts/inlineAlert`                 |
| ToastAlert       | Alerts       | Shipped | `alerts/toastAlert`                  |
| Card             | Containers   | Shipped | `containers/card`                    |
| DynamicContainer | Containers   | Shipped | `containers/dynamicContainer`        |
| GraphicCard      | Containers   | Shipped | `containers/card`                    |
| InteractiveCard  | Containers   | Shipped | `containers/card`                    |
| Avatar           | Content      | Planned | `content/avatar`                     |
| Chips            | Content      | Planned | `content/chips`                      |
| Tags             | Content      | Planned | `content/tags`                       |
| Table            | Data         | Shipped | `data/Table`                         |
| Checkbox         | Forms        | Shipped | `forms/Checkbox`                     |
| CheckboxGroup    | Forms        | Shipped | `forms/CheckboxGroup`                |
| ComboBox         | Forms        | Shipped | `forms/ComboBox`                     |
| Input            | Forms        | Shipped | `forms/Input`                        |
| SearchBox        | Forms        | Shipped | `forms/SearchBox`                    |
| SegmentedControl | Forms        | Shipped | `forms/SegmentedControl`             |
| Toggle           | Forms        | Shipped | `forms/Toggle`                       |
| Button           | Interactions | Shipped | `interactions/Button`                |
| Link             | Navigation   | Shipped | `navigation/Link`                    |
| Tabs             | Navigation   | Planned | `navigation/Tabs`                    |
| Code             | Typography   | Shipped | `typography/body/code`               |
| Lists            | Typography   | Shipped | `typography/body/lists`              |
| Paragraph        | Typography   | Shipped | `typography/body/paragraph`          |
| Reference        | Typography   | Shipped | `typography/body/reference`          |
| PageHeading      | Typography   | Shipped | `typography/headings/pageHeading`    |
| ProductHeading   | Typography   | Shipped | `typography/headings/productHeading` |
| SectionHeading   | Typography   | Shipped | `typography/headings/sectionHeading` |
| SubHeading       | Typography   | Shipped | `typography/headings/subHeading`     |
| TitleHeading     | Typography   | Shipped | `typography/headings/titleHeading`   |

## Components and their parts

- Alerts
  - BrowserAlert
    - `BrowserAlert`
    - `browserAlertStyles`
  - InlineAlert
    - `InlineAlert`
    - `inlineAlertStyles`
  - ToastAlert
    - `ToastAlert`
    - `ToastRegion`
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
  - Chips
  - Tags
- Data
  - Table
    - `Table`
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
    - `useComboBox` (hook)
    - `comboBoxFilter`, `highlightSegments` (filter utilities)
  - Input
    - `Input`
    - `inputStyle`
  - SearchBox
    - `SearchBox` (built on `useComboBox`, shares `comboBoxStyle`)
  - SegmentedControl
    - `SegmentedControl` (`<fieldset role="radiogroup">` of native radios)
    - `segmentedControlStyles`
  - Toggle
    - `Toggle` (native checkbox with `role="switch"`)
    - `toggleStyles`
- Interactions
  - Button
    - `Button`
    - `buttonStyle`
- Navigation
  - Link
    - `Link`
    - `linkStyle`
  - Tabs
- Typography
  - Body
    - Code
      - `Code` (inline)
      - `CodeBlock` (`<pre><code>`, focusable scroll region, `label` required)
      - `codeStyles`
      - `codeBlockStyles`
    - Lists
      - `List` (`ordered` switches `ul` / `ol`, keeps markers)
      - `ListItem`
      - `listStyles`
      - `listItemStyles`
    - Paragraph
      - `Paragraph`
      - `paragraphStyles`
    - Reference
      - `Reference` (attributed quotation: `figure`, `blockquote`, `figcaption`,
        `cite`)
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

## Spreadsheet list

CSV, one row per component. Paste into a spreadsheet and split on commas.

```csv
Component,Category,Subcategory,Status,Path,Parts
BrowserAlert,Alerts,,Shipped,alerts/browserAlert,BrowserAlert; browserAlertStyles
InlineAlert,Alerts,,Shipped,alerts/inlineAlert,InlineAlert; inlineAlertStyles
ToastAlert,Alerts,,Shipped,alerts/toastAlert,ToastAlert; ToastRegion; toastAlertStyles; toastRegionStyles
Card,Containers,,Shipped,containers/card,Card; CardHeader; CardTitle; CardBody; CardFooter; CardContext; cardStyles
DynamicContainer,Containers,,Shipped,containers/dynamicContainer,DynamicContainer; dynamicContainerStyles
GraphicCard,Containers,,Shipped,containers/card,GraphicCard; CardHeader; CardTitle; CardBody; CardFooter; cardStyles
InteractiveCard,Containers,,Shipped,containers/card,InteractiveCard; cardStyles
Avatar,Content,,Planned,content/avatar,
Chips,Content,,Planned,content/chips,
Tags,Content,,Planned,content/tags,
Table,Data,,Shipped,data/Table,Table; TableHead; TableHeaderCell; TableBody; TableRow; TableCell; TableFoot; TableEmpty; tableStyle
Checkbox,Forms,,Shipped,forms/Checkbox,Checkbox; checkboxStyles
CheckboxGroup,Forms,,Shipped,forms/CheckboxGroup,CheckboxGroup; CheckboxGroupContext; checkboxGroupStyles
ComboBox,Forms,,Shipped,forms/ComboBox,ComboBox; OptionContent; comboBoxStyle; useComboBox; comboBoxFilter; highlightSegments
Input,Forms,,Shipped,forms/Input,Input; inputStyle
SearchBox,Forms,,Shipped,forms/SearchBox,SearchBox
SegmentedControl,Forms,,Shipped,forms/SegmentedControl,SegmentedControl; segmentedControlStyles
Toggle,Forms,,Shipped,forms/Toggle,Toggle; toggleStyles
Button,Interactions,,Shipped,interactions/Button,Button; buttonStyle
Link,Navigation,,Shipped,navigation/Link,Link; linkStyle
Tabs,Navigation,,Planned,navigation/Tabs,
Code,Typography,Body,Shipped,typography/body/code,Code; CodeBlock; codeStyles; codeBlockStyles
Lists,Typography,Body,Shipped,typography/body/lists,List; ListItem; listStyles; listItemStyles
Paragraph,Typography,Body,Shipped,typography/body/paragraph,Paragraph; paragraphStyles
Reference,Typography,Body,Shipped,typography/body/reference,Reference; referenceStyles
PageHeading,Typography,Headings,Shipped,typography/headings/pageHeading,PageHeading; pageHeadingStyles; HeadingBase
ProductHeading,Typography,Headings,Shipped,typography/headings/productHeading,ProductHeading; productHeadingStyles; HeadingBase
SectionHeading,Typography,Headings,Shipped,typography/headings/sectionHeading,SectionHeading; sectionHeadingStyles; HeadingBase
SubHeading,Typography,Headings,Shipped,typography/headings/subHeading,SubHeading; subHeadingStyles; HeadingBase
TitleHeading,Typography,Headings,Shipped,typography/headings/titleHeading,TitleHeading; titleHeadingStyles; HeadingBase
```
