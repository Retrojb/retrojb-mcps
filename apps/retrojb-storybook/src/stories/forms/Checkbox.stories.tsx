import { Checkbox } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

const meta = {
  title: "Forms/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    indeterminate: { control: "boolean" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
    onChange: { table: { disable: true } },
    onCheckedChange: { table: { disable: true } },
  },
  args: {
    label: "Email me about new releases",
    name: "releases",
    onChange: fn(),
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: unchecked and uncontrolled. The `<label>` wraps the box and the
 * text, so a click anywhere on the row toggles it.
 */
export const Primary: Story = {};

/** `defaultChecked` — uncontrolled, starting checked. */
export const Checked: Story = {
  args: { defaultChecked: true },
};

/**
 * `indeterminate` sets the DOM property, so the input reports "mixed" to
 * assistive technology. The dash wins over the check while it is set.
 */
export const Indeterminate: Story = {
  args: { label: "Select all", indeterminate: true },
};

/**
 * Native `disabled`: out of the tab order, and the box, glyph and label dim
 * together.
 */
export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};

/**
 * `error` sets `aria-invalid`, turns the border red and renders the message,
 * associated with `aria-describedby` — so the state is never colour alone.
 */
export const WithError: Story = {
  args: {
    label: "I accept the terms of service",
    name: "terms",
    required: true,
    error: "Accept the terms to continue.",
  },
};

/**
 * Helper text sits under the label text, not under the box, and is wired with
 * `aria-describedby`.
 */
export const WithDescription: Story = {
  args: {
    label: "Weekly digest",
    description: "One email every Monday. Unsubscribe at any time.",
  },
};
