import { useState } from "react";

import { Button, Drawer, Input } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

/*
 * Every story opens through a trigger button rather than rendering the drawer
 * already open.
 *
 * Partly because that is how it is used, and partly because the interesting
 * behaviour only exists once `showModal()` has run: the focus trap, the inert
 * background, Escape to close, and focus returning to the trigger afterwards. A
 * drawer rendered open in a docs frame demonstrates none of it, and its fixed
 * position would escape the frame.
 *
 * Worth trying with the keyboard: open it, Tab around — focus will not leave the
 * drawer — press Escape, and note that focus lands back on the button you opened
 * it from. Try it again with the OS "reduce motion" setting on: the slide is
 * dropped and the drawer appears and disappears without animating.
 */
const meta = {
  title: "Containers/Drawer",
  component: Drawer,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    side: { control: "inline-radio", options: ["start", "end"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    dismissOnBackdropClick: { control: "boolean" },
    resizable: { control: "boolean" },
    width: { table: { disable: true } },
    onWidthChange: { table: { disable: true } },
    title: { control: "text" },
    open: { table: { disable: true } },
    onOpenChange: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  args: {
    title: "Filters",
    side: "end",
    size: "md",
    dismissOnBackdropClick: true,
    onOpenChange: fn(),
  },
  render: (args) => <TriggerDemo {...args} />,
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `side="end"`, `size="md"`. The panel slides in from the end edge
 * (the right in LTR) over the scrim.
 */
export const Primary: Story = {};

/** Anchored to the start edge, so it slides in from the left in LTR. */
export const StartSide: Story = {
  args: { side: "start", title: "Navigation" },
};

/** The narrow and wide resting widths. Each is still capped at half the viewport. */
export const Small: Story = {
  args: { size: "sm" },
};

export const Large: Story = {
  args: { size: "lg" },
};

/**
 * Named by `aria-label` instead of a visible `title`, for a design with no room
 * for a heading. The name is then in the accessibility tree only — prefer
 * `title` wherever there is room.
 */
export const LabelledNotTitled: Story = {
  args: { title: undefined, "aria-label": "Quick settings" },
};

/**
 * `resizable`: drag the strip on the drawer's inner edge to widen it, or focus
 * it with Tab and use Left and Right, Home and End. `size` is the starting width
 * and the minimum, and the drawer can grow by half of it, so this `md` drawer
 * runs from 400px to 600px.
 */
export const Resizable: Story = {
  args: { resizable: true, title: "Filters" },
};

/** A `start` drawer resizes from its right edge, and `lg` runs 560px to 840px (capped at half the viewport). */
export const ResizableStartLarge: Story = {
  args: { resizable: true, side: "start", size: "lg", title: "Navigation" },
};

/**
 * `dismissOnBackdropClick={false}`: a click on the scrim does nothing, so the
 * user has to act in the drawer or press Escape to leave. For a drawer holding a
 * step the user should not dismiss by accident.
 */
export const NoBackdropDismiss: Story = {
  args: { dismissOnBackdropClick: false, title: "Confirm your details" },
};

/**
 * The trigger and the state the drawer is controlled by.
 *
 * `open` lives here rather than in args, because a controlled drawer needs a
 * real state owner: the whole point of the prop is that the caller decides when
 * it closes. `onOpenChange` is the single close path — Escape, the backdrop and
 * the close button all arrive here — so flipping state in it covers them all.
 */
const TriggerDemo = ({
  onOpenChange,
  ...args
}: React.ComponentProps<typeof Drawer>) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className="flex min-h-96 flex-col items-start gap-(--space-3) p-(--space-6)">
      <Button text="Open the drawer" onClick={() => setOpen(true)} />

      <Drawer {...args} open={open} onOpenChange={handleOpenChange}>
        <div className="flex flex-col gap-(--space-4)">
          <Input label="Keyword" type="search" />
          <Input label="Author" />
          <div className="mt-(--space-2) flex gap-(--space-3)">
            <Button text="Apply" onClick={() => setOpen(false)} />
            <Button
              intent="secondary"
              text="Cancel"
              onClick={() => setOpen(false)}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
};
