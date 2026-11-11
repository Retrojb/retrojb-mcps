import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Containers/Card",
  component: Card,
  parameters: {
    // Not `centered`: a card fills its container, and a centring flex box would
    // collapse it to its content width.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "inline-radio",
      options: ["div", "article", "section", "li"],
    },
    size: { control: "inline-radio", options: ["sm", "md"] },
    elevated: { control: "boolean" },
    children: { table: { disable: true } },
  },
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
        </CardHeader>
        <CardBody>
          1,204 of 5,000 requests. Resets on the first of the month.
        </CardBody>
      </>
    ),
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `as="div"`, `size="md"`.
 *
 * A `div` because a box that is only a box should add no semantics. Reach for
 * `as` when the card is something more specific — an `article`, a `section`, or a
 * list item.
 */
export const Primary: Story = {};

/**
 * `CardFooter` pins to the bottom with `mt-auto`. Inside a static `Card` the
 * buttons are ordinary controls — there is no overlay to lift them above.
 */
export const WithFooter: Story = {
  args: {
    as: "article",
    children: (
      <>
        <CardHeader>
          <CardTitle level={2}>Invite your team</CardTitle>
        </CardHeader>
        <CardBody>
          Workspaces with more than one member get shared billing and audit
          logs.
        </CardBody>
        <CardFooter>
          <Button size="sm" text="Invite people" />
          <Button size="sm" intent="ghost" text="Not now" />
        </CardFooter>
      </>
    ),
  },
};

/** The compact scale: tighter padding and gaps, smaller title. */
export const Small: Story = {
  args: { size: "sm" },
};

/**
 * Cards as a list. `as="li"` inside a `<ul>` gives a screen reader user the count
 * — "list, 3 items" — before the first card, which a stack of `div`s cannot.
 *
 * The grid stretches each card to the row's height (`h-full`), so the footers
 * line up even though the copy does not.
 */
export const AsListItems: Story = {
  render: () => (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-(--space-4) p-0">
      {[
        ["Starter", "For trying things out."],
        [
          "Team",
          "Shared billing, audit logs and up to 20 members per workspace.",
        ],
        ["Enterprise", "SSO, custom contracts."],
      ].map(([name, copy]) => (
        <Card as="li" key={name}>
          <CardHeader>
            <CardTitle>{name}</CardTitle>
          </CardHeader>
          <CardBody>{copy}</CardBody>
          <CardFooter>
            <Button size="sm" intent="secondary" text={`Choose ${name}`} />
          </CardFooter>
        </Card>
      ))}
    </ul>
  ),
};

/**
 * `elevated` lifts the card with the `raised-1` shadow on the `raised-1`
 * surface. The border stays, and it is the only edge left in forced-colors
 * mode, which removes box-shadows.
 */
export const Elevated: Story = {
  args: { elevated: true },
};

/**
 * An overlay is already the top surface, so an elevated card inside one drops
 * its shadow and keeps its border. The library's overlays (`BrowserAlert`,
 * `ToastAlert`, the `ComboBox` popup) set `data-surface="overlay"`; this
 * stands in for one.
 */
export const InsideAnOverlay: Story = {
  name: "Inside an overlay",
  args: { elevated: true },
  render: (args) => (
    <div
      data-surface="overlay"
      className="grid max-w-lg gap-(--space-4) rounded-control border border-border-strong bg-surface-overlay p-(--space-6) shadow-modal"
    >
      <Card {...args} />
    </div>
  ),
};
