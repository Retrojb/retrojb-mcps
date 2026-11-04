import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "@retrojb/ui";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Actions/Button",
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // No `autodocs` tag: this component's docs page is `Button.mdx`, and
  // Storybook refuses to index a docs page and an autodocs tag for the same
  // file. See `templates/Component.mdx`.
  //
  // More on argTypes: https://storybook.js.org/docs/api/arg-types
  argTypes: {
    text: {
      control: "text",
    },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#story-args
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
/** The default: `intent="primary"`, `size="md"`. */
export const Primary: Story = {
  args: {
    text: "Save changes",
  },
};

/**
 * Four intents. `primary` is the one main action on a screen, `secondary` and
 * `ghost` are quieter alternatives, and `danger` is for actions that destroy
 * data.
 */
export const Intents: Story = {
  args: { text: "Button" },
  render: (args) => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <Button {...args} intent="primary" text="Primary" />
      <Button {...args} intent="secondary" text="Secondary" />
      <Button {...args} intent="ghost" text="Ghost" />
      <Button {...args} intent="danger" text="Delete" />
    </div>
  ),
};

/**
 * Three heights: 32px, 40px and 48px. Only `lg` meets the 44px target in
 * WCAG 2.5.5, so use it where that level is required.
 */
export const Sizes: Story = {
  args: { text: "Button" },
  render: (args) => (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
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
