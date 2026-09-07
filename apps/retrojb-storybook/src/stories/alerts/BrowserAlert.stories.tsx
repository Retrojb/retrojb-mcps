import { useState } from "react";

import { BrowserAlert, Button } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

/*
 * Every story goes through a trigger button rather than rendering the dialog open.
 *
 * Partly because that is how it is used, and partly because the interesting behaviour
 * only exists once `showModal()` has run: the focus trap, the inert background, Escape
 * to close, and focus returning to the trigger afterwards. A dialog rendered already
 * open in a docs frame demonstrates none of it.
 *
 * Worth trying with the keyboard: open it, Tab around — focus will not leave the
 * dialog — press Escape, and note that focus lands back on the button you opened it
 * from. None of that is code in the component; it is what the platform `<dialog>`
 * gives you for free.
 */
const meta = {
  title: "Alerts/BrowserAlert",
  component: BrowserAlert,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "inline-radio", options: ["info", "success", "danger"] },
    title: { control: "text" },
    label: { control: "text" },
    children: { control: "text" },
    confirmLabel: { control: "text" },
    cancelLabel: { control: "text" },
    open: { table: { disable: true } },
    onClose: { table: { disable: true } },
    onConfirm: { table: { disable: true } },
    onCancel: { table: { disable: true } },
  },
  args: {
    open: false,
    onClose: fn(),
    title: "Your session has expired",
    children: "Sign in again to pick up where you left off.",
  },
  render: (args) => <TriggerDemo {...args} />,
} satisfies Meta<typeof BrowserAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Acknowledge-only — the replacement for `window.alert()`.
 *
 * One button, which is the minimum: `role="alertdialog"` requires at least one
 * focusable control, so there is always something for focus to land on and always a
 * way out that is not Escape.
 */
export const Primary: Story = {};

/**
 * Two buttons — the replacement for `window.confirm()`. Supplying `cancelLabel` or
 * `onCancel` is what switches it into this mode.
 *
 * Note where focus lands when it opens: on **Keep it**, not **Delete**. For a
 * destructive confirmation the safe default is the way out, and leaving it to DOM
 * order is how a dialog ends up with the irreversible action one Enter keypress away.
 * The danger tone also moves to the confirm button, so the thing that does the
 * irreversible work looks like it.
 */
export const DestructiveConfirmation: Story = {
  args: {
    tone: "danger",
    title: "Delete workspace?",
    label: "Delete workspace",
    children:
      "Every project and invoice in it goes too. This cannot be undone.",
    confirmLabel: "Delete",
    cancelLabel: "Keep it",
    onConfirm: fn(),
    onCancel: fn(),
  },
};

/** The success tone, for a dialog that reports something finished rather than failed. */
export const Success: Story = {
  args: {
    tone: "success",
    title: "Export ready",
    label: "Export complete",
    children: "The file has been emailed to you and is available for 7 days.",
    confirmLabel: "Done",
  },
};

/**
 * A long message, to check the dialog stays usable when it grows: the action row
 * wraps rather than overflowing, and the shell keeps a gap to the viewport edges so
 * nothing is clipped at 200% zoom (WCAG 1.4.10).
 */
export const LongMessage: Story = {
  args: {
    tone: "danger",
    title: "We could not process your payment",
    label: "Payment failed",
    children:
      "Your bank declined the transaction without giving a reason. This usually " +
      "means the card has expired, the billing address does not match, or a " +
      "daily limit has been reached. Nothing has been charged, and your " +
      "subscription stays active until the end of the current period.",
    confirmLabel: "Update payment method",
    cancelLabel: "Not now",
    onConfirm: fn(),
    onCancel: fn(),
  },
};

/**
 * The trigger, and the state the dialog is controlled by.
 *
 * `open` comes from here rather than from args, because a controlled dialog needs a
 * real state owner — the point of the prop is that the caller decides when it closes,
 * so a confirm handler that fails validation can leave it open.
 */
// `args.open` rides along in the spread and is overridden by the explicit `open`
// below, which is passed after it.
const TriggerDemo = ({
  onClose,
  onConfirm,
  onCancel,
  ...args
}: React.ComponentProps<typeof BrowserAlert>) => {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<string>("");

  const close = () => {
    setOpen(false);
    onClose();
  };

  return (
    <div className="flex min-h-96 flex-col items-start gap-3 p-6">
      <Button
        text="Open the alert"
        onClick={() => {
          setOutcome("");
          setOpen(true);
        }}
      />

      <p className="text-sm text-foreground-muted">
        {outcome === "" ? "Nothing chosen yet." : outcome}
      </p>

      <BrowserAlert
        {...args}
        open={open}
        onClose={close}
        {...(onConfirm === undefined
          ? {}
          : {
              onConfirm: () => {
                onConfirm();
                setOutcome("Confirmed.");
                close();
              },
            })}
        {...(onCancel === undefined
          ? {}
          : {
              onCancel: () => {
                onCancel();
                setOutcome("Cancelled.");
                close();
              },
            })}
      />
    </div>
  );
};
