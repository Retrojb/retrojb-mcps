import { Radio } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

const meta = {
  title: "Forms/Radio",
  component: Radio,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    label: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
    onChange: { table: { disable: true } },
  },
  args: {
    label: "Standard delivery",
    name: "delivery",
    value: "standard",
    onChange: fn(),
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `size="md"`, unchecked and uncontrolled. The `<label>` wraps the
 * circle and the text, so a click anywhere on the row selects it. On its own a
 * radio can only be selected, never cleared — use it inside a `RadioGroup`.
 */
export const Primary: Story = {};

/** `defaultChecked` — the `--accent` fill plus the dot, so not colour alone. */
export const Checked: Story = {
  args: { defaultChecked: true },
};

/**
 * `sm` / `md` / `lg`: 16 / 20 / 24px circles. The row is at least 24px tall in
 * every size, so the target clears 2.5.8 even when the circle does not.
 */
export const Sizes: Story = {
  render: (args) => (
    <div className="grid gap-(--space-4)">
      <Radio {...args} size="sm" value="sm" label="Small" defaultChecked />
      <Radio {...args} size="md" value="md" label="Medium" />
      <Radio {...args} size="lg" value="lg" label="Large" />
    </div>
  ),
  args: { name: "sizes" },
};

/**
 * Native `disabled`: out of the tab order, and the circle, dot and label dim
 * together.
 */
export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};

/**
 * Helper text sits under the label text, not under the circle, and is wired
 * with `aria-describedby`.
 */
export const WithDescription: Story = {
  args: { description: "3–5 working days. Free over £40." },
};

/**
 * Two radios sharing a `name`, with no `RadioGroup`. The browser still makes
 * them one group — one tab stop, arrow keys move the selection — but nothing
 * names the group for a screen reader. Prefer `RadioGroup`.
 */
export const SharedName: Story = {
  render: (args) => (
    <div className="grid gap-(--space-2)">
      <Radio {...args} value="standard" label="Standard" defaultChecked />
      <Radio {...args} value="express" label="Express" />
    </div>
  ),
};
