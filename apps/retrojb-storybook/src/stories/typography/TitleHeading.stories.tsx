import { TitleHeading } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Headings/TitleHeading",
  component: TitleHeading,
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
    children: "Payment methods",
  },
} satisfies Meta<typeof TitleHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `level={2}`, `size="heading-lg"`.
 *
 * A major region directly under the page title.
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
 * alone. Here it is still an `<h2>`, drawn at `heading-sm`.
 */
export const SizeOverride: Story = {
  args: { size: "heading-sm" },
};

/**
 * Inside a region that already has an `<h2>`, pass `level={3}`. The size is
 * unchanged; only the outline moves.
 */
export const NestedUnderARegion: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
      <TitleHeading>Account</TitleHeading>
      <TitleHeading level={3}>Security</TitleHeading>
    </div>
  ),
};
