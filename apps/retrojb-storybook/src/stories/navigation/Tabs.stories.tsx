import {
  DynamicContainer,
  Input,
  Paragraph,
  SubHeading,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

const sections = [
  {
    value: "overview",
    label: "Overview",
    copy: "Usage this month: 1,204 of 5,000 requests.",
  },
  {
    value: "billing",
    label: "Billing",
    copy: "Next invoice on the first of the month.",
  },
  {
    value: "members",
    label: "Members",
    copy: "Three people have access to this workspace.",
  },
  {
    value: "security",
    label: "Security",
    copy: "Two-factor authentication is on.",
  },
];

/** The list and one panel per section, as `children` for the stories. */
const tabsFor = (items: typeof sections) => (
  <>
    <TabList>
      {items.map((item) => (
        <Tab key={item.value} value={item.value}>
          {item.label}
        </Tab>
      ))}
    </TabList>
    {items.map((item) => (
      <TabPanel key={item.value} value={item.value}>
        <Paragraph>{item.copy}</Paragraph>
      </TabPanel>
    ))}
  </>
);

const meta = {
  title: "Navigation/Tabs",
  component: TabGroup,
  subcomponents: { TabList, Tab, TabPanel },
  parameters: {
    // Not `centered`: a tab group fills its container, and the baseline under
    // the list should run its full width.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    fullWidth: { control: "boolean" },
    activation: {
      control: "inline-radio",
      options: ["automatic", "manual"],
    },
    keepMounted: { control: "boolean" },
    children: { table: { disable: true } },
    onValueChange: { table: { disable: true } },
  },
  args: {
    label: "Workspace",
    defaultValue: "overview",
    onValueChange: fn(),
    children: tabsFor(sections),
  },
} satisfies Meta<typeof TabGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: uncontrolled, `orientation="horizontal"`, `size="md"`,
 * `activation="automatic"`, inactive panels kept mounted and `hidden`.
 *
 * Tab lands on the selected tab — the list is one tab stop — and Left / Right
 * move between tabs, wrapping at either end, with the panel following focus.
 * Home and End jump to the first and last tab. The next Tab moves into the
 * panel, which is itself a stop so its text is not skipped.
 */
export const Primary: Story = {};

/**
 * `sm`, `md` and `lg`: at least 32, 40 and 48px tall — the `Button` heights —
 * so every size clears the 24px target minimum on its own.
 */
export const Sizes: Story = {
  render: (args) => (
    <DynamicContainer direction="vertical" gap="lg">
      <TabGroup {...args} size="sm" label="Workspace, small" />
      <TabGroup {...args} size="md" label="Workspace, medium" />
      <TabGroup {...args} size="lg" label="Workspace, large" />
    </DynamicContainer>
  ),
};

/** `fullWidth` shares the row equally between the tabs. */
export const FullWidth: Story = {
  args: { fullWidth: true, children: tabsFor(sections.slice(0, 3)) },
};

/**
 * `orientation="vertical"`: the list beside the panels, the indicator on the
 * inline end, and Up / Down in place of Left / Right. The tablist reports
 * `aria-orientation="vertical"`, so a screen reader announces the right keys.
 */
export const Vertical: Story = {
  args: { orientation: "vertical" },
};

/**
 * `activation="manual"`: the arrow keys move focus only, and Enter or Space
 * selects. For panels that are slow to show — arrowing past a tab should not
 * start a fetch nobody asked for.
 */
export const ManualActivation: Story = {
  args: { activation: "manual" },
};

/**
 * A disabled tab. It dims, is not clickable, and the arrow keys skip straight
 * over it — from "Billing", Right goes to "Security".
 */
export const DisabledTab: Story = {
  args: {
    children: (
      <>
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="billing">Billing</Tab>
          <Tab value="members" disabled>
            Members
          </Tab>
          <Tab value="security">Security</Tab>
        </TabList>
        {sections.map((item) => (
          <TabPanel key={item.value} value={item.value}>
            <Paragraph>{item.copy}</Paragraph>
          </TabPanel>
        ))}
      </>
    ),
  },
};

const manySections = [
  "Overview",
  "Activity",
  "Billing",
  "Invoices",
  "Members",
  "Roles",
  "Security",
  "Audit log",
  "Integrations",
  "Webhooks",
  "API keys",
  "Danger zone",
].map((label) => ({
  value: label.toLowerCase().replace(/\s+/g, "-"),
  label,
  copy: `The ${label.toLowerCase()} settings.`,
}));

/**
 * More tabs than fit. The row does not wrap; it scrolls sideways inside the
 * list's own scroller instead of overflowing the page. The arrow keys reach
 * every tab and scroll each one into view as it is focused, so the scroller
 * needs no tab stop of its own.
 */
export const Overflow: Story = {
  args: { children: tabsFor(manySections) },
  render: (args) => (
    <div style={{ maxWidth: "28rem" }}>
      <TabGroup {...args} />
    </div>
  ),
};

/**
 * The tablist named by a visible heading. `label` is still required, but
 * `aria-labelledby` on `TabList` outranks the `aria-label` it sets, so the
 * heading is what is announced and nothing says the name twice.
 */
export const LabelledByHeading: Story = {
  render: (args) => (
    <section>
      <SubHeading id="workspace-heading">Workspace settings</SubHeading>
      <TabGroup {...args}>
        <TabList aria-labelledby="workspace-heading">
          {sections.map((item) => (
            <Tab key={item.value} value={item.value}>
              {item.label}
            </Tab>
          ))}
        </TabList>
        {sections.map((item) => (
          <TabPanel key={item.value} value={item.value}>
            <Paragraph>{item.copy}</Paragraph>
          </TabPanel>
        ))}
      </TabGroup>
    </section>
  ),
};

/**
 * Panels whose first content is a control. Kept mounted (the default), so
 * text typed in one panel survives switching away and back. `tabIndex={-1}`
 * removes the panel's own stop, because Tab already lands on the input.
 */
export const PanelsWithControls: Story = {
  args: {
    defaultValue: "profile",
    children: (
      <>
        <TabList>
          <Tab value="profile">Profile</Tab>
          <Tab value="contact">Contact</Tab>
        </TabList>
        <TabPanel value="profile" tabIndex={-1}>
          <Input label="Display name" />
        </TabPanel>
        <TabPanel value="contact" tabIndex={-1}>
          <Input label="Email" type="email" />
        </TabPanel>
      </>
    ),
  },
};

/**
 * `keepMounted={false}`: inactive panels render nothing, and unselected tabs
 * drop `aria-controls` rather than point at an element that is not there.
 * Panel state does not survive switching — type in a field, switch tabs and
 * back, and it is empty.
 */
export const UnmountInactive: Story = {
  args: { ...PanelsWithControls.args, keepMounted: false },
};

/**
 * Under `dir="rtl"` the row runs right to left and the arrow keys follow it:
 * Left moves to the next tab, Right to the previous. Vertical lists move
 * their indicator to the left edge.
 */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <TabGroup {...args} />
    </div>
  ),
};

/**
 * Controlled with `value` and `onValueChange`. The parent's state is the only
 * source of truth; the `<output>` reflects it.
 */
export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

const ControlledDemo = (args: ComponentProps<typeof TabGroup>) => {
  const [value, setValue] = useState("billing");
  return (
    <DynamicContainer direction="vertical" gap="lg">
      <TabGroup
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
