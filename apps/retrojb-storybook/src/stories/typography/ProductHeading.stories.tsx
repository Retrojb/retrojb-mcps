import { PageHeading, ProductHeading } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Headings/ProductHeading",
  component: ProductHeading,
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
    children: "Retro Studio",
  },
} satisfies Meta<typeof ProductHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `level={1}`, `size="display"`.
 *
 * Use it once, for the product name or hero headline. On a page that also
 * has a `PageHeading`, this one steps down a level.
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
 * A marketing page with both: the product name drawn at `display` but
 * demoted to `level={2}`, so the page keeps one `<h1>`. The visual order and the
 * outline disagree here on purpose.
 */
export const AboveThePageTitle: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
      <PageHeading>Pricing</PageHeading>
      <ProductHeading level={2}>Retro Studio</ProductHeading>
    </div>
  ),
};
