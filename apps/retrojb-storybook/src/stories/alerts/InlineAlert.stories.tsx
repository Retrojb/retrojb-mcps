import { useState } from "react";

import { Button, InlineAlert } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

const meta = {
  title: "Alerts/InlineAlert",
  component: InlineAlert,
  parameters: {
    // Not `centered`: an inline alert is a block element that takes the width of
    // whatever contains it, and a centring flex container collapses it to its
    // content width.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "inline-radio", options: ["info", "success", "danger"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
    live: { control: "inline-radio", options: ["off", "polite", "assertive"] },
    label: { control: "text" },
    children: { control: "text" },
    dismissLabel: { control: "text" },
    onDismiss: { table: { disable: true } },
  },
  args: {
    children: "Your changes have not been saved yet.",
  },
} satisfies Meta<typeof InlineAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `tone="info"`, and `live="off"` so nothing is announced.
 *
 * `off` is right here because the message was already on the page when it loaded.
 * Nothing changed, so there is nothing for a live region to report — and a live
 * region that fires on load either says nothing or interrupts, depending on the
 * engine.
 */
export const Primary: Story = {};

/** The three tones. There is no `warning`; see the accessibility page for why. */
export const Success: Story = {
  args: {
    tone: "success",
    children: "Workspace created. You can invite people to it now.",
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    children: "The card was declined. Try another card or contact your bank.",
  },
};

/**
 * The tone word is overridable, and usually worth overriding. `"Payment failed"`
 * tells the user what happened; `"Error"` tells them only that something did.
 */
export const SpecificLabel: Story = {
  args: {
    tone: "danger",
    label: "Payment failed",
    children: "The card was declined. Try another card or contact your bank.",
  },
};

/** The compact scale, for an alert inside a card or a form field group. */
export const Small: Story = {
  args: {
    size: "sm",
    children: "This project is archived. Unarchive it to make changes.",
  },
};

/**
 * Passing `onDismiss` renders the close button. Dismissal is the caller's to
 * implement — the component does not own whether it exists, and unmounting itself
 * would fight whatever state put it on the page.
 */
export const Dismissible: Story = {
  args: {
    onDismiss: fn(),
    dismissLabel: "Dismiss the unsaved changes notice",
  },
};

/**
 * The one that matters. Turn on a screen reader and press the button.
 *
 * Both alerts below are `live="assertive"`. The left one is rendered
 * unconditionally with `children` toggling, so its live region was already in the
 * DOM when the message arrived and the message is announced. The right one is
 * mounted conditionally — `{message && <InlineAlert>}` — so the region and the text
 * appear in the same commit, and most screen readers announce nothing at all.
 *
 * That is the failure this component is shaped to prevent, and it is invisible from
 * the markup: both produce `role="alert"` with the right text inside it.
 */
export const AnnouncementPattern: Story = {
  parameters: { layout: "padded" },
  render: (args) => <AnnouncementDemo {...args} />,
};

// `args.children` is spread in but the JSX children below override it — the JSX
// transform passes children positionally, which wins over anything in props.
const AnnouncementDemo = (args: React.ComponentProps<typeof InlineAlert>) => {
  const [message, setMessage] = useState<string>("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          text="Trigger both"
          onClick={() =>
            setMessage("Session expired. Sign in again to continue.")
          }
        />
        <Button
          intent="secondary"
          text="Clear"
          onClick={() => setMessage("")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-success">
            Announces — region always mounted
          </p>
          <InlineAlert {...args} tone="danger" live="assertive">
            {message}
          </InlineAlert>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-danger">
            Usually silent — region mounted with the text
          </p>
          {message === "" ? null : (
            <InlineAlert {...args} tone="danger" live="assertive">
              {message}
            </InlineAlert>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * `live="polite"` waits for a pause in whatever the screen reader is saying rather
 * than cutting in. Right for confirmations and progress; `assertive` is close to
 * rude for anything that is not blocking the user.
 */
export const Polite: Story = {
  args: {
    tone: "success",
    live: "polite",
    label: "Saved",
    children: "Draft saved to your account.",
  },
};
