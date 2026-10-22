import { DynamicContainer, SubHeading, Toggle } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

const meta = {
  title: "Forms/Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md"] },
    labelPosition: { control: "inline-radio", options: ["start", "end"] },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
    onChange: { table: { disable: true } },
    onCheckedChange: { table: { disable: true } },
  },
  args: {
    label: "Wi-Fi",
    name: "wifi",
    onChange: fn(),
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: off, uncontrolled, `size="md"`, `labelPosition="start"`. The
 * label leads and the switch ends the row, the layout settings screens use. The
 * `<label>` wraps both, so a click anywhere on the row flips it, and Space flips
 * it from the keyboard.
 */
export const Primary: Story = {};

/**
 * `defaultChecked` — uncontrolled, starting on. The thumb moves to the end, the
 * track fills and a check appears in the thumb: three cues, not just a colour.
 */
export const Checked: Story = {
  args: { defaultChecked: true },
};

/**
 * Native `disabled`, off: out of the tab order, and the track, thumb and label
 * dim together.
 */
export const DisabledOff: Story = {
  args: { disabled: true },
};

/** Native `disabled`, on. The state stays readable while dimmed. */
export const DisabledOn: Story = {
  args: { disabled: true, defaultChecked: true },
};

/**
 * Helper text, wired with `aria-describedby`. It lines up with the label and
 * stays clear of the track.
 */
export const WithDescription: Story = {
  args: {
    label: "Automatic updates",
    name: "updates",
    description: "Install updates overnight while the device is charging.",
  },
};

/**
 * `error` sets `aria-invalid`, turns the track border red and renders the
 * message, associated with `aria-describedby` — so the state is never colour
 * alone.
 */
export const WithError: Story = {
  args: {
    label: "Share usage data",
    name: "usage",
    required: true,
    error: "Usage data is required on managed devices.",
  },
};

/**
 * `sm` and `md`. The `sm` track is 36 × 20, below 24px tall on its own, but the
 * label row is the click target and is never shorter than 24px.
 */
export const Sizes: Story = {
  render: (args) => (
    <DynamicContainer direction="vertical" gap="lg">
      <Toggle {...args} size="sm" label="Small" name="small" />
      <Toggle {...args} size="md" label="Medium" name="medium" />
    </DynamicContainer>
  ),
};

/**
 * `labelPosition="end"` puts the switch first and keeps the row to its content,
 * like a Checkbox. `"start"` is the default.
 */
export const LabelAtEnd: Story = {
  args: {
    labelPosition: "end",
    label: "Reduce motion",
    name: "reduce-motion",
    description: "Turn off animations across the app.",
  },
};

/**
 * Controlled with `checked` and `onCheckedChange`. The parent's state is the
 * only source of truth; the `<output>` reflects it.
 */
export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

const ControlledDemo = (args: ComponentProps<typeof Toggle>) => {
  const [on, setOn] = useState(true);
  return (
    <DynamicContainer direction="vertical" gap="lg">
      <Toggle
        {...args}
        label="Bluetooth"
        name="bluetooth"
        defaultChecked={undefined}
        checked={on}
        onCheckedChange={(next) => {
          setOn(next);
          args.onCheckedChange?.(next);
        }}
      />
      <output>Bluetooth is {on ? "on" : "off"}</output>
    </DynamicContainer>
  );
};

/**
 * A settings list. `DynamicContainer as="ul" direction="vertical"` stacks the
 * rows; with the label at the start each row spans the list, so the switches
 * line up in one column at the end. The heading names the list through
 * `aria-labelledby`.
 */
export const SettingsList: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <section style={{ maxWidth: "28rem" }}>
      <SubHeading id="toggle-settings-heading">Notifications</SubHeading>
      <DynamicContainer
        as="ul"
        direction="vertical"
        gap="lg"
        aria-labelledby="toggle-settings-heading"
      >
        <li>
          <Toggle
            {...args}
            label="Push notifications"
            name="push"
            defaultChecked
          />
        </li>
        <li>
          <Toggle
            {...args}
            label="Email digest"
            name="digest"
            description="A summary of activity, every Monday."
          />
        </li>
        <li>
          <Toggle {...args} label="Sounds" name="sounds" defaultChecked />
        </li>
        <li>
          <Toggle
            {...args}
            label="Marketing email"
            name="marketing"
            description="Managed by your organisation."
            disabled
          />
        </li>
      </DynamicContainer>
    </section>
  ),
};
