import {
  Button,
  DynamicContainer,
  SegmentedControl,
  SubHeading,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

const ranges = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const meta = {
  title: "Forms/SegmentedControl",
  component: SegmentedControl,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    fullWidth: { control: "boolean" },
    labelHidden: { control: "boolean" },
    disabled: { control: "boolean" },
    options: { table: { disable: true } },
    onValueChange: { table: { disable: true } },
  },
  args: {
    label: "Range",
    name: "range",
    options: ranges,
    defaultValue: "week",
    onValueChange: fn(),
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: uncontrolled, `size="md"`, content-sized. Tab lands on the
 * selected segment — the group is one tab stop — and the arrow keys move the
 * selection, wrapping at either end. Home and End jump to the first and last
 * segment.
 */
export const Primary: Story = {};

/**
 * `sm`, `md` and `lg`: 24, 32 and 40px segments, so every size clears the 24px
 * target minimum on its own.
 */
export const Sizes: Story = {
  render: (args) => (
    <DynamicContainer direction="vertical" gap="lg">
      <SegmentedControl {...args} size="sm" label="Small" name="range-sm" />
      <SegmentedControl {...args} size="md" label="Medium" name="range-md" />
      <SegmentedControl {...args} size="lg" label="Large" name="range-lg" />
    </DynamicContainer>
  ),
};

/**
 * `fullWidth` stretches the track across its container and gives every segment
 * an equal share.
 */
export const FullWidth: Story = {
  parameters: { layout: "padded" },
  args: { fullWidth: true },
};

/**
 * `labelHidden` — for when a heading right above already says what the choice
 * is. The legend is visually hidden but is still the group's accessible name.
 */
export const LabelHidden: Story = {
  render: (args) => (
    <section>
      <SubHeading>Revenue</SubHeading>
      <SegmentedControl {...args} label="Revenue range" labelHidden />
    </section>
  ),
};

/**
 * One disabled option. It dims, is not clickable, and the arrow keys skip
 * straight over it — from "Week", Right goes to "Year".
 */
export const DisabledOption: Story = {
  args: {
    options: [
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
      { value: "month", label: "Month", disabled: true },
      { value: "year", label: "Year" },
    ],
  },
};

/**
 * `disabled` on the group. The fieldset disables every radio inside it,
 * natively, so the whole control leaves the tab order. The selection stays
 * readable while dimmed.
 */
export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * No `defaultValue`: nothing is selected. Tab lands on the first enabled
 * segment, and the first arrow key press makes a selection.
 */
export const NoSelection: Story = {
  args: { defaultValue: undefined },
};

/**
 * Controlled with `value` and `onValueChange`. The parent's state is the only
 * source of truth; the `<output>` reflects it.
 */
export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

const ControlledDemo = (args: ComponentProps<typeof SegmentedControl>) => {
  const [value, setValue] = useState("month");
  return (
    <DynamicContainer direction="vertical" gap="lg">
      <SegmentedControl
        {...args}
        defaultValue={undefined}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          args.onValueChange?.(next);
        }}
      />
      <output>Showing: {value}</output>
    </DynamicContainer>
  );
};

/**
 * In a form. The selected segment submits as `name=value` through `FormData`,
 * like any radio group.
 */
export const InAForm: Story = {
  render: (args) => <FormDemo {...args} />,
};

const FormDemo = (args: ComponentProps<typeof SegmentedControl>) => {
  const [submitted, setSubmitted] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSubmitted(String(data.get("units") ?? ""));
      }}
      style={{ display: "grid", gap: "var(--spacing-40)" }}
    >
      <SegmentedControl
        {...args}
        label="Units"
        name="units"
        defaultValue="metric"
        options={[
          { value: "metric", label: "Metric" },
          { value: "imperial", label: "Imperial" },
        ]}
      />
      <div>
        <Button type="submit" text="Save" />
      </div>
      <output>
        {submitted !== "" ? `Submitted: units=${submitted}` : null}
      </output>
    </form>
  );
};
