import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag } from "@retrojb/ui";

const meta = {
  title: "Content/Tag",
  component: Tag,
  parameters: {
    layout: "centered",
  },
  // No `autodocs` tag: the docs page is `Tag.mdx`, and Storybook refuses to
  // index both for one stories file. See `templates/Component.mdx`.
  argTypes: {
    text: { control: "text" },
    tone: {
      control: "inline-radio",
      options: ["neutral", "info", "success", "danger"],
    },
    size: { control: "inline-radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default: `tone="neutral"`, `size="sm"`. */
export const Primary: Story = {
  args: {
    text: "Draft",
  },
};

/**
 * Four tones. `neutral` is a plain category, `info` is accent, and `success`
 * and `danger` state an outcome. Each tag carries its own word, because the
 * colour only reinforces it (WCAG 1.4.1). There is no `warning` tone.
 */
export const Tones: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <Tag {...args} tone="neutral" text="Neutral" />
      <Tag {...args} tone="info" text="Info" />
      <Tag {...args} tone="success" text="Success" />
      <Tag {...args} tone="danger" text="Danger" />
    </div>
  ),
  args: { text: "Tag" },
};

/**
 * Two sizes, set by the `label-sm` and `label-md` type roles. A tag is not a
 * pointer target, so the 24px minimum in WCAG 2.5.8 does not apply.
 */
export const Sizes: Story = {
  render: (args) => (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Tag {...args} size="sm" text="Small" />
      <Tag {...args} size="md" text="Medium" />
    </div>
  ),
  args: { text: "Tag" },
};

/**
 * The status of a component, as shown on these docs pages. Each tag is
 * labelled with its own word, so the status reads the same without colour:
 * `planned` and `stub` are neutral, `experimental` is info, `shipped` is
 * success and `deprecated` is danger.
 */
export const Statuses: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <Tag {...args} tone="neutral" text="planned" />
      <Tag {...args} tone="neutral" text="stub" />
      <Tag {...args} tone="info" text="experimental" />
      <Tag {...args} tone="success" text="shipped" />
      <Tag {...args} tone="danger" text="deprecated" />
    </div>
  ),
  args: { text: "Tag" },
};
