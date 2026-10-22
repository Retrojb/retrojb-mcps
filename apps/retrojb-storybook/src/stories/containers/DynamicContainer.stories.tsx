import { Card, CardBody, DynamicContainer } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** Plain boxes, so the layout is the only thing on screen. */
const Item = ({ label }: { readonly label: string }) => (
  <Card size="sm">
    <CardBody>{label}</CardBody>
  </Card>
);

const items = (
  <>
    <Item label="First" />
    <Item label="Second" />
    <Item label="Third" />
  </>
);

const meta = {
  title: "Containers/DynamicContainer",
  component: DynamicContainer,
  parameters: {
    // A block layout that fills its container; `centered` would shrink it.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    as: { control: "inline-radio", options: ["div", "ul", "ol", "section"] },
    direction: {
      control: "inline-radio",
      options: ["responsive", "vertical", "horizontal"],
    },
    responsiveTo: {
      control: "inline-radio",
      options: ["viewport", "container"],
    },
    gap: {
      control: "inline-radio",
      options: ["none", "xs", "sm", "md", "lg", "xl"],
    },
    align: {
      control: "inline-radio",
      options: ["start", "center", "end", "baseline", "stretch"],
    },
    children: { table: { disable: true } },
  },
  args: {
    children: items,
  },
} satisfies Meta<typeof DynamicContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `direction="responsive"`, `gap="md"`, `align="stretch"`.
 *
 * A column below the viewport `sm` breakpoint (40rem), a wrapping row from
 * there up. Resize the canvas, or switch the viewport toolbar to a phone size,
 * to see it stack.
 */
export const Primary: Story = {};

/** Always a column, whatever the viewport. */
export const Vertical: Story = {
  args: { direction: "vertical" },
};

/**
 * Always a row. It wraps, so a set too wide for the line breaks onto a second
 * one rather than overflowing.
 */
export const Horizontal: Story = {
  args: {
    direction: "horizontal",
    children: (
      <>
        {["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"].map(
          (label) => (
            <Item key={label} label={label} />
          ),
        )}
      </>
    ),
  },
};

/**
 * `as="ul"` with `<li>` children. The root restores `role="list"`, which WebKit
 * drops from a `list-style: none` list, so VoiceOver still announces the count.
 */
export const AsList: Story = {
  args: {
    as: "ul",
    gap: "sm",
    children: (
      <>
        <li>Email</li>
        <li>Text message</li>
        <li>Push notification</li>
      </>
    ),
  },
};

/**
 * The opt-in container mode. The same container in a narrow and a wide frame,
 * on one viewport: each frame is an `@container`, and the switch happens at
 * `@sm` (24rem) of the frame's width rather than at the viewport breakpoint.
 */
export const ContainerQuery: Story = {
  args: { responsiveTo: "container" },
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--spacing-60)" }}>
      {["16rem", "36rem"].map((width) => (
        <div
          key={width}
          style={{
            width,
            containerType: "inline-size",
            outline: "1px dashed currentColor",
          }}
        >
          <DynamicContainer {...args} />
        </div>
      ))}
    </div>
  ),
};
