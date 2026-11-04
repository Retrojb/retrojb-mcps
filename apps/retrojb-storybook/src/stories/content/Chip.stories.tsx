import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Chip } from "@retrojb/ui";

const meta = {
  title: "Content/Chip",
  component: Chip,
  parameters: {
    layout: "centered",
  },
  // No `autodocs` tag: the docs page is `Chip.mdx`, and Storybook refuses to
  // index both for one stories file. See `templates/Component.mdx`.
  argTypes: {
    text: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md"] },
    selected: { control: "boolean" },
    defaultSelected: { control: "boolean" },
    disabled: { control: "boolean" },
    onSelectedChange: { table: { disable: true } },
    onClick: { table: { disable: true } },
  },
  args: {
    onSelectedChange: fn(),
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `size="sm"`, uncontrolled and off. The chip keeps its own state,
 * so pressing it switches it on and shows the check icon. The `Controls` panel
 * sets `defaultSelected` only before the first render.
 */
export const Primary: Story = {
  args: {
    text: "Open",
  },
};

/**
 * A controlled chip: the story owns `selected` and updates it from
 * `onSelectedChange`. The play function presses the chip twice and checks that
 * `aria-pressed` follows, which is the state a screen reader announces.
 */
export const Selected: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState(true);
    return (
      <Chip
        {...args}
        selected={selected}
        onSelectedChange={(next) => {
          setSelected(next);
          args.onSelectedChange?.(next);
        }}
      />
    );
  },
  args: {
    text: "Open",
  },
  play: async ({ canvasElement, args }) => {
    const chip = within(canvasElement).getByRole("button", { name: "Open" });
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(chip);
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect(args.onSelectedChange).toHaveBeenLastCalledWith(false);
    await userEvent.click(chip);
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(args.onSelectedChange).toHaveBeenLastCalledWith(true);
  },
};

/**
 * Two sizes. `sm` is 24px tall with `label-sm` and `md` is 32px with
 * `label-md`. Both clear the 24px minimum target in WCAG 2.5.8. Neither
 * reaches the 44px target in 2.5.5.
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
      <Chip {...args} size="sm" text="Small" />
      <Chip {...args} size="sm" text="Small, on" defaultSelected />
      <Chip {...args} size="md" text="Medium" />
      <Chip {...args} size="md" text="Medium, on" defaultSelected />
    </div>
  ),
  args: { text: "Chip" },
};

/**
 * The native `disabled` attribute. A disabled chip is dimmed, shows a
 * `not-allowed` cursor and leaves the tab order. It keeps its pressed state, so
 * a disabled chip that is on still shows the check icon.
 */
export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <Chip {...args} text="Off" disabled />
      <Chip {...args} text="On" defaultSelected disabled />
    </div>
  ),
  args: { text: "Chip" },
};

const STATUSES = ["Open", "In review", "Closed", "Archived"] as const;

/**
 * The intended markup for a set of chips. There is no `ChipGroup`: the caller
 * supplies a `role="group"` named by a visible label with `aria-labelledby`,
 * and keeps the selection in its own state. A screen reader announces the group
 * name when focus enters it, then each chip with its pressed state.
 */
export const FilterGroup: Story = {
  render: function Render(args) {
    const [active, setActive] = useState<readonly string[]>(["Open"]);
    const toggle = (status: string, on: boolean): void => {
      setActive((current) =>
        on ? [...current, status] : current.filter((item) => item !== status),
      );
    };
    return (
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <span id="chip-filter-status">Status</span>
        <div
          role="group"
          aria-labelledby="chip-filter-status"
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
        >
          {STATUSES.map((status) => (
            <Chip
              key={status}
              size={args.size}
              text={status}
              selected={active.includes(status)}
              onSelectedChange={(on) => toggle(status, on)}
            />
          ))}
        </div>
        <span aria-live="polite">Showing: {active.join(", ") || "all"}</span>
      </div>
    );
  },
  args: { text: "Chip" },
};
