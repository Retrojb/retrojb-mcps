import { Code, List, ListItem } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Body/List",
  component: List,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    ordered: { control: "boolean" },
    size: { control: "inline-radio", options: ["lg", "md", "sm"] },
    children: { table: { disable: true } },
  },
  args: {
    children: (
      <>
        <ListItem>Semantic colour tokens</ListItem>
        <ListItem>Semantic type roles</ListItem>
        <ListItem>A spacing scale in rem</ListItem>
      </>
    ),
  },
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `ordered={false}`, `size="md"` — a `<ul>` with disc markers at
 * `body-md`.
 *
 * The markers stay. A screen reader announces "list, 3 items", and in Safari
 * keeping `list-style` is also what keeps the list semantics.
 */
export const Primary: Story = {};

/**
 * `ordered` renders `<ol>` with decimal markers, for when the sequence matters.
 * Native `start` and `reversed` pass through.
 */
export const Ordered: Story = {
  args: {
    ordered: true,
    children: (
      <>
        <ListItem>
          Install <Code>@retrojb/ui</Code>.
        </ListItem>
        <ListItem>
          Import <Code>@retrojb/ui/styles.css</Code> once, at the app entry.
        </ListItem>
        <ListItem>Render a component.</ListItem>
      </>
    ),
  },
};

/** The compact size, matching `Paragraph size="sm"`. */
export const Small: Story = {
  args: { size: "sm" },
};

/**
 * A list nested in an item. Each nested `List` sets its own marker style, so
 * the nested bullets stay discs rather than switching to the UA's circles.
 */
export const Nested: Story = {
  args: {
    children: (
      <>
        <ListItem>
          Headings
          <List>
            <ListItem>PageHeading</ListItem>
            <ListItem>SectionHeading</ListItem>
          </List>
        </ListItem>
        <ListItem>
          Body
          <List ordered>
            <ListItem>Paragraph</ListItem>
            <ListItem>List</ListItem>
          </List>
        </ListItem>
      </>
    ),
  },
};
