import { Button, Checkbox, CheckboxGroup } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

const channels = [
  { value: "email", label: "Email" },
  { value: "sms", label: "Text message", description: "Carrier rates apply." },
  { value: "push", label: "Push notification" },
  { value: "post", label: "Post", disabled: true },
];

const meta = {
  title: "Forms/CheckboxGroup",
  component: CheckboxGroup,
  parameters: {
    // A block that fills its container, so the responsive row has room to form.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    direction: {
      control: "inline-radio",
      options: ["responsive", "vertical", "horizontal"],
    },
    gap: {
      control: "inline-radio",
      options: ["none", "xs", "sm", "md", "lg", "xl"],
    },
    label: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    options: { table: { disable: true } },
    children: { table: { disable: true } },
    onValueChange: { table: { disable: true } },
  },
  args: {
    label: "Notify me by",
    name: "channels",
    options: channels,
    defaultValue: ["email"],
    onValueChange: fn(),
  },
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `direction="responsive"`, uncontrolled.
 *
 * Stacked below the viewport `sm` breakpoint, a wrapping row from `sm` up —
 * the layout is `DynamicContainer`'s. Narrow the canvas to see it stack.
 */
export const Primary: Story = {};

/** `direction="vertical"` — always stacked, the usual choice for long labels. */
export const Vertical: Story = {
  args: { direction: "vertical" },
};

/** `direction="horizontal"` — always a row, wrapping when it runs out of room. */
export const Horizontal: Story = {
  args: { direction: "horizontal", gap: "lg" },
};

/**
 * Controlled with `value` and `onValueChange`. The group never applies a change
 * itself while controlled, so the parent's state is the only source of truth.
 */
export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

const ControlledDemo = (args: ComponentProps<typeof CheckboxGroup>) => {
  const [value, setValue] = useState<string[]>(["sms"]);
  return (
    <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
      <CheckboxGroup
        {...args}
        defaultValue={undefined}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          args.onValueChange?.(next);
        }}
      />
      <output>Selected: {value.length > 0 ? value.join(", ") : "none"}</output>
    </div>
  );
};

/**
 * A group error. The message is wired to the fieldset with `aria-describedby`,
 * and every member turns red and carries `aria-invalid`.
 */
export const WithError: Story = {
  args: {
    defaultValue: [],
    required: true,
    description: "Choose at least one.",
    error: "Choose at least one way to be notified.",
  },
};

/**
 * `required` means "at least one". Submit with nothing checked and the
 * browser's own validation stops it; check any box and it lifts, because the
 * group only sets `required` on its members while none is checked.
 */
export const RequiredAtLeastOne: Story = {
  args: {
    defaultValue: [],
    required: true,
    description: "Choose at least one.",
  },
  render: (args) => <RequiredDemo {...args} />,
};

const RequiredDemo = (args: ComponentProps<typeof CheckboxGroup>) => {
  const [submitted, setSubmitted] = useState<string>("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSubmitted(data.getAll("channels").join(", "));
      }}
      style={{ display: "grid", gap: "var(--spacing-40)" }}
    >
      <CheckboxGroup {...args} />
      <div>
        <Button type="submit" text="Save" />
      </div>
      <output>{submitted !== "" ? `Submitted: ${submitted}` : null}</output>
    </form>
  );
};

/**
 * A parent checkbox from `selectAllLabel`. Indeterminate while some options are
 * checked; it checks or clears the enabled ones only, leaving the disabled
 * option as it was.
 */
export const SelectAll: Story = {
  args: { direction: "vertical", selectAllLabel: "All channels" },
};

/**
 * Composed from `<Checkbox value>` children instead of `options`. Each child
 * with a `value` joins the group through context; a child without one stays
 * standalone.
 */
export const Composed: Story = {
  args: {
    options: undefined,
    label: "Workspace permissions",
    name: "permissions",
    defaultValue: ["read"],
    children: (
      <>
        <Checkbox value="read" label="Read" />
        <Checkbox
          value="write"
          label="Write"
          description="Create and edit documents."
        />
        <Checkbox value="admin" label="Administer" />
      </>
    ),
  },
};

/** `disabled` on the fieldset disables every checkbox inside it, natively. */
export const Disabled: Story = {
  args: { disabled: true },
};
