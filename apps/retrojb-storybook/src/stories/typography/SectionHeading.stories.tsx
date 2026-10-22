import { SectionHeading, TitleHeading } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Headings/SectionHeading",
  component: SectionHeading,
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
    children: "Invoices",
  },
} satisfies Meta<typeof SectionHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `level={2}`, `size="heading-md"`.
 *
 * A section of the page. Shares `level={2}` with `TitleHeading` and draws a
 * step smaller; most pages need only one of the two at that level.
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
 * Under a `TitleHeading`, a section is one level down: `level={3}`.
 */
export const UnderATitleHeading: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
      <TitleHeading>Account</TitleHeading>
      <SectionHeading level={3}>Profile</SectionHeading>
      <SectionHeading level={3}>Notifications</SectionHeading>
    </div>
  ),
};
