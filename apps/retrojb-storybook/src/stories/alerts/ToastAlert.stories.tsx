import { useState } from "react";

import { Button, ToastAlert, ToastRegion, type AlertTone } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

/*
 * Every story renders the toast inside a real `ToastRegion`, including the ones that
 * only exist to show a tone.
 *
 * Showing a bare `ToastAlert` would be the more convenient gallery and would teach
 * the wrong thing: outside a region a toast draws perfectly and announces nothing,
 * because the live region is the region's job. A docs page that demonstrates the
 * broken arrangement is how the broken arrangement spreads.
 *
 * `layout: "fullscreen"` so the region's fixed positioning lands where it actually
 * would, rather than inside a padded preview box.
 */
const meta = {
  title: "Alerts/ToastAlert",
  component: ToastAlert,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "inline-radio", options: ["info", "success", "danger"] },
    label: { control: "text" },
    children: { control: "text" },
    dismissLabel: { control: "text" },
    duration: { control: "number" },
    onDismiss: { table: { disable: true } },
  },
  args: {
    children: "Draft saved to your account.",
    onDismiss: fn(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-96 p-6">
        <p className="text-sm text-foreground-muted">
          The region is pinned to the bottom-end corner of this frame.
        </p>
        <ToastRegion label="Notifications">
          <Story />
        </ToastRegion>
      </div>
    ),
  ],
} satisfies Meta<typeof ToastAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One toast, in its region.
 *
 * No `duration`, so it stays until dismissed. That is the default on purpose: a
 * message that removes itself is a time limit on reading it, which is what WCAG 2.2.1
 * governs, and nothing here can know how long a given user needs.
 */
export const Primary: Story = {};

export const Success: Story = {
  args: {
    tone: "success",
    label: "Upload complete",
    children: "3 files added.",
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    label: "Upload failed",
    children: "invoice-04.pdf is larger than the 10 MB limit.",
  },
};

/**
 * With a `duration` the toast dismisses itself — and the timer pauses while the
 * pointer is over it or focus is inside it, so a user who is reading or tabbing does
 * not lose the message part-way through. Hover this one and watch it wait.
 *
 * That covers 2.2.1's "extend" allowance for pointer and keyboard users. It cannot
 * cover a touch user, who has no hover at all, which is the reason errors should keep
 * the default and stay until dismissed.
 */
export const AutoDismiss: Story = {
  args: {
    duration: 6000,
    label: "Saved",
    children: "Hover to pause the six-second timer.",
  },
};

/**
 * A stack, driven by state, which is how this is used for real.
 *
 * The region is mounted once by the decorator and never unmounts. Adding a toast
 * appends to it, and because the region was already being watched, the addition is
 * announced — `aria-atomic="false"` on the region means only the new toast is read,
 * not the whole stack again.
 */
export const Stack: Story = {
  render: () => <StackDemo />,
};

interface DemoToast {
  readonly id: number;
  readonly tone: AlertTone;
  readonly label: string;
  readonly message: string;
}

const SAMPLES: readonly Omit<DemoToast, "id">[] = [
  { tone: "success", label: "Saved", message: "Draft saved to your account." },
  { tone: "info", label: "Syncing", message: "Two devices are catching up." },
  {
    tone: "danger",
    label: "Upload failed",
    message: "invoice-04.pdf is larger than the 10 MB limit.",
  },
];

let nextId = 0;

const StackDemo = () => {
  const [toasts, setToasts] = useState<readonly DemoToast[]>([]);

  const push = () => {
    const sample = SAMPLES[nextId % SAMPLES.length];
    if (sample === undefined) return;
    nextId += 1;
    setToasts((current) => [...current, { ...sample, id: nextId }]);
  };

  const remove = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex gap-2">
        <Button text="Add a toast" onClick={push} />
        <Button
          intent="secondary"
          text="Clear all"
          onClick={() => setToasts([])}
        />
      </div>
      <p className="text-sm text-foreground-muted">
        {toasts.length} in the stack. Errors have no timer; the other two clear
        after eight seconds.
      </p>

      {/*
       * Mounted unconditionally, outside the state that fills it. It sits here
       * empty until the first toast arrives, which is the only arrangement in which
       * that first toast is announced — see `ToastRegion`.
       */}
      <ToastRegion label="Notifications">
        {toasts.map((toast) => (
          <ToastAlert
            key={toast.id}
            tone={toast.tone}
            label={toast.label}
            dismissLabel={`Dismiss: ${toast.label}`}
            duration={toast.tone === "danger" ? null : 8000}
            onDismiss={() => remove(toast.id)}
          >
            {toast.message}
          </ToastAlert>
        ))}
      </ToastRegion>
    </div>
  );
};

/*
 * `Stack` renders its own region because it owns the toast list, so the decorator's
 * region would be a second, empty one. Turning the decorator off for this story keeps
 * there to exactly one live region on the page — two would both be announced.
 */
Stack.decorators = [
  (Story: () => React.ReactNode) => (
    <div className="min-h-96 p-6">
      <Story />
    </div>
  ),
];
