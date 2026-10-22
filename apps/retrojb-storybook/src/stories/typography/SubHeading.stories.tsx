import { SubHeading } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Headings/SubHeading",
  component: SubHeading,
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
    children: "Past due",
  },
} satisfies Meta<typeof SubHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `level={3}`, `size="heading-sm"`.
 *
 * A subsection, under an `<h2>`.
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
 * alone. Here it is still an `<h3>`, drawn at `heading-md`.
 */
export const SizeOverride: Story = {
  args: { size: "heading-md" },
};

/**
 * Below the third level, keep stepping `level`, and drop to
 * `size="heading-xs"` when the design needs the step to show.
 */
export const DeepOutline: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
      <SubHeading>Past due</SubHeading>
      <SubHeading level={4} size="heading-xs">
        Over 30 days
      </SubHeading>
    </div>
  ),
};
