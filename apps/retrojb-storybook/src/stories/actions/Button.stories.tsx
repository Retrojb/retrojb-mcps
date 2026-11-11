import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@retrojb/ui";

const meta = {
  title: "Actions/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    text: {
      control: "text",
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
/** The default: `intent="primary"`, `size="md"`. */
export const Primary: Story = {
  args: {
    intent: "primary",
    text: "Save changes",
    size: "md",
  },
};

export const Intents: Story = {
  args: { text: "Button" },
  render: (args) => (
    <div className="flex flex-wrap gap-(--space-3)">
      <Button {...args} intent="primary" text="Primary" />
      <Button {...args} intent="secondary" text="Secondary" />
      <Button {...args} intent="ghost" text="Ghost" />
      <Button {...args} intent="danger" text="Delete" />
    </div>
  ),
};

export const Sizes: Story = {
  args: { text: "Button" },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-(--space-3)">
      <Button {...args} size="sm" text="Small" />
      <Button {...args} size="md" text="Medium" />
      <Button {...args} size="lg" text="Large" />
    </div>
  ),
};

/** `fullWidth` stretches the button to its container, as in a narrow form. */
export const FullWidth: Story = {
  args: { text: "Continue", fullWidth: true },
  parameters: { layout: "padded" },
};

/**
 * `disabled` removes the button from the tab order and dims it. The label's
 * contrast drops below 4.5:1, which WCAG 1.4.3 permits for disabled controls.
 */
export const Disabled: Story = {
  args: { text: "Unavailable", disabled: true },
};

/**
 * `elevated` adds a resting shadow that lifts on hover and drops on press.
 * `ghost` and disabled buttons ignore it. The shadow is decoration: in
 * forced-colors mode it is removed, and each button's border and fill are
 * what remain.
 */
export const Elevated: Story = {
  args: { text: "Button", elevated: true },
  render: (args) => (
    <div className="flex flex-wrap gap-(--space-3)">
      <Button {...args} intent="primary" text="Primary" />
      <Button {...args} intent="secondary" text="Secondary" />
      <Button {...args} intent="ghost" text="Ghost (no shadow)" />
      <Button {...args} intent="danger" text="Delete" />
      <Button {...args} disabled text="Disabled (no shadow)" />
    </div>
  ),
};
