import { Button, Radio, RadioGroup } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

const delivery = [
  {
    value: "standard",
    label: "Standard",
    description: "3–5 working days. Free over £40.",
  },
  { value: "express", label: "Express", description: "Next working day." },
  { value: "collect", label: "Click and collect" },
  { value: "same-day", label: "Same day", disabled: true },
];

const meta = {
  title: "Forms/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["vertical", "horizontal"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    gap: {
      control: "inline-radio",
      options: ["none", "xs", "sm", "md", "lg", "xl"],
    },
    label: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    labelHidden: { control: "boolean" },
    options: { table: { disable: true } },
    children: { table: { disable: true } },
    onValueChange: { table: { disable: true } },
  },
  args: {
    label: "Delivery",
    name: "delivery",
    options: delivery,
    defaultValue: "standard",
    onValueChange: fn(),
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `orientation="vertical"`, `size="md"`, uncontrolled. Tab lands
 * on the selected radio; the arrow keys move and select, skipping the disabled
 * option and wrapping; Home / End jump to the first / last enabled option.
 */
export const Primary: Story = {};

/** `orientation="horizontal"` — a wrapping row, for a few short options. */
export const Horizontal: Story = {
  args: {
    label: "Size",
    name: "size",
    defaultValue: "m",
    options: [
      { value: "s", label: "Small" },
      { value: "m", label: "Medium" },
      { value: "l", label: "Large" },
    ],
    orientation: "horizontal",
    gap: "lg",
  },
};

/**
 * Controlled with `value` and `onValueChange`. The radios take `checked` from
 * the parent's state, which is the only source of truth.
 */
export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

const ControlledDemo = (args: ComponentProps<typeof RadioGroup>) => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <RadioGroup
        {...args}
        defaultValue={undefined}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          args.onValueChange?.(next);
        }}
      />
      <output>Selected: {value ?? "none"}</output>
    </div>
  );
};

/**
 * `required` with nothing selected. Submit, and the browser's own validation
 * stops it — native `required` on a radio means "one of this `name`". Then
 * change the selection and press Reset: uncontrolled, the DOM owns the
 * selection, so `form.reset()` puts `defaultValue` back.
 */
export const InAForm: Story = {
  args: { defaultValue: null, required: true },
  render: (args) => <FormDemo {...args} />,
};

const FormDemo = (args: ComponentProps<typeof RadioGroup>) => {
  const [submitted, setSubmitted] = useState<string>("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSubmitted(String(data.get("delivery") ?? ""));
      }}
      onReset={() => {
        setSubmitted("");
      }}
      style={{ display: "grid", gap: "var(--space-4)" }}
    >
      <RadioGroup {...args} />
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button type="submit" text="Continue" />
        <Button type="reset" intent="secondary" text="Reset" />
      </div>
      <output>{submitted !== "" ? `Submitted: ${submitted}` : null}</output>
    </form>
  );
};

/**
 * A group error. The message is wired to the fieldset with `aria-describedby`,
 * and every radio turns red and carries `aria-invalid`.
 */
export const WithError: Story = {
  args: {
    defaultValue: null,
    required: true,
    description: "We can only deliver to UK addresses.",
    error: "Choose a delivery option.",
  },
};

/**
 * Composed from `<Radio>` children instead of `options`. Every `Radio` inside
 * the group joins it through context and takes its `name`.
 */
export const Composed: Story = {
  args: {
    options: undefined,
    label: "Plan",
    name: "plan",
    defaultValue: "team",
    children: (
      <>
        <Radio value="personal" label="Personal" description="One seat." />
        <Radio value="team" label="Team" description="Up to 20 seats." />
        <Radio
          value="enterprise"
          label="Enterprise"
          description="Unlimited seats and SSO."
        />
      </>
    ),
  },
};

/** `size="lg"` on the group reaches every radio through context. */
export const LargeSize: Story = {
  args: { size: "lg" },
};

/**
 * `labelHidden` — the legend is visually hidden but is still the group's
 * accessible name. For a group whose label would repeat a heading above it.
 */
export const LabelHidden: Story = {
  args: { labelHidden: true },
};

/** `disabled` on the fieldset disables every radio inside it, natively. */
export const Disabled: Story = {
  args: { disabled: true },
};
