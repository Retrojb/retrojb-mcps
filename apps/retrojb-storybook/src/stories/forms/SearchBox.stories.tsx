import { SearchBox } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

interface IPage {
  readonly label: string;
  readonly value: string;
  readonly href: string;
}

const pages: readonly IPage[] = [
  { label: "Getting started", value: "start", href: "/docs/start" },
  { label: "Button", value: "button", href: "/docs/button" },
  { label: "ComboBox", value: "combobox", href: "/docs/combobox" },
  { label: "Input", value: "input", href: "/docs/input" },
  { label: "Inline alerts", value: "inline-alert", href: "/docs/inline-alert" },
  { label: "Toast alerts", value: "toast-alert", href: "/docs/toast-alert" },
  { label: "Browser alerts", value: "browser-alert", href: "/docs/browser" },
  { label: "Link", value: "link", href: "/docs/link" },
  { label: "Table", value: "table", href: "/docs/table" },
  { label: "Design tokens", value: "tokens", href: "/docs/tokens" },
  { label: "Colour contrast", value: "contrast", href: "/docs/contrast" },
  { label: "Accessibility testing", value: "a11y", href: "/docs/a11y" },
];

const meta = {
  title: "Forms/SearchBox",
  component: SearchBox<IPage>,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {},
  decorators: [
    (Story) => (
      <div style={{ minHeight: "22rem", width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchBox<IPage>>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The query is a valid outcome on its own, so Enter with nothing highlighted
 * submits it. Arrow onto a suggestion first and Enter picks that instead.
 */
export const Primary: Story = {
  args: {
    label: "Search docs",
    labelHidden: true,
    placeholder: "Search docs…",
    options: pages,
  },
  render: (args) => {
    const [log, setLog] = useState<readonly string[]>([]);

    const append = (entry: string) => {
      setLog((previous) => [entry, ...previous].slice(0, 4));
    };

    return (
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <SearchBox
          {...args}
          onSubmit={(query) => {
            append(`submitted query: ${JSON.stringify(query)}`);
          }}
          onSelect={(page) => {
            append(`selected suggestion: ${page.href}`);
          }}
        />
        <ul style={{ fontSize: "0.875rem", opacity: 0.7, paddingLeft: "1rem" }}>
          {log.length === 0 ? (
            <li>Press Enter, or pick a suggestion.</li>
          ) : (
            log.map((entry) => <li key={entry}>{entry}</li>)
          )}
        </ul>
      </div>
    );
  },
};

/**
 * `onSubmit` and `onSelect` are separate because they usually do different
 * things: a suggestion goes straight to a record, a query goes to a results
 * page.
 */
export const WithVisibleLabel: Story = {
  args: {
    label: "Search documentation",
    options: pages,
    description: "Suggestions are shortcuts. The query works on its own.",
  },
};

/**
 * `submitLabel` adds a focusable submit button. It is in the tab order, unlike
 * the clear affordance, because it is the control's primary action.
 */
export const WithSubmitButton: Story = {
  args: {
    label: "Search docs",
    labelHidden: true,
    placeholder: "Search docs…",
    options: pages,
    submitLabel: "Run search",
  },
};

/**
 * `landmark={false}` drops the `<search>` element.
 *
 * Use it for a filter that is not the page's search. Landmarks are a navigation
 * menu for screen reader users, and five "search" entries are harder to use than
 * one.
 */
export const AsAFilter: Story = {
  args: {
    label: "Filter rows",
    options: pages,
    landmark: false,
    size: "sm",
    description: "Not a landmark — this is a column filter, not the site search.",
  },
};

export const Invalid: Story = {
  args: {
    label: "Search docs",
    options: pages,
    error: "Enter at least two characters.",
    defaultInputValue: "a",
  },
};

/**
 * Nothing matched. The empty row is distinct from a loading row and from an
 * error row, because the three mean different things to the reader.
 */
export const NoResults: Story = {
  args: {
    label: "Search docs",
    options: pages,
    defaultOpen: true,
    defaultInputValue: "kubernetes",
    emptyMessage: "Nothing matched. Try a shorter query.",
  },
};
