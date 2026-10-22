import { PageHeading, SectionHeading, SubHeading } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Headings/PageHeading",
  component: PageHeading,
  parameters: {
    // A block element that fills its container and wraps; `centered` would
    // shrink it to its content and hide `text-balance`.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    level: { control: "inline-radio", options: [1, 2, 3, 4, 5, 6] },
    size: {
      control: "select",
      options: [
        "display",
        "heading-xl",
        "heading-lg",
        "heading-md",
        "heading-sm",
        "heading-xs",
      ],
    },
    children: { control: "text" },
  },
  args: {
    children: "Billing",
  },
} satisfies Meta<typeof PageHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `level={1}`, `size="heading-xl"`.
 *
 * One per page. A screen reader user pressing `1` expects exactly one
 * answer.
 */
export const Primary: Story = {};

/**
 * A long heading wraps with `text-balance`, so the lines come out close to even
 * instead of ending on one orphaned word.
 */
export const LongTitle: Story = {
  args: {
    children: "A heading long enough to wrap onto a second line at most widths",
  },
};

/**
 * `size` redraws the heading at another heading role and leaves the element
 * alone. Here it is still an `<h1>`, drawn at `heading-sm`.
 */
export const SizeOverride: Story = {
  args: { size: "heading-sm" },
};

/**
 * A page outline: the `<h1>`, two `<h2>` sections and an `<h3>` subsection,
 * each at its preset size. The a11y panel's heading-order check stays clean.
 */
export const WithSections: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
      <PageHeading>Billing</PageHeading>
      <SectionHeading>Payment methods</SectionHeading>
      <SubHeading>Cards on file</SubHeading>
      <SectionHeading>Invoices</SectionHeading>
    </div>
  ),
};
