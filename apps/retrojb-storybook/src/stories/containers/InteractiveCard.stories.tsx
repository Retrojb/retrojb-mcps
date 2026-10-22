import {
  Button,
  InteractiveCard,
  type IInteractiveCardLinkProps,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentType } from "react";
import { fn } from "storybook/test";
import { MOUNTAINS } from "../../story-data/cardMedia";

/*
 * The props are a union — link mode or button mode, picked by `href` — and
 * Storybook's arg inference collapses a union to `never`. So the stories take one
 * flat shape, and `render` hands it to whichever mode `href` selects.
 */
type StoryArgs = Pick<
  IInteractiveCardLinkProps,
  | "as"
  | "title"
  | "children"
  | "media"
  | "actions"
  | "size"
  | "orientation"
  | "mediaRatio"
  | "headingLevel"
> & {
  readonly href?: string;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
};

const renderCard = ({ href, disabled, onClick, ...args }: StoryArgs) =>
  href === undefined ? (
    <InteractiveCard {...args} disabled={disabled} onClick={onClick} />
  ) : (
    <InteractiveCard {...args} href={href} />
  );

const meta = {
  title: "Containers/InteractiveCard",
  // Cast for the same reason as `StoryArgs`; autodocs still reads the real props.
  component: InteractiveCard as ComponentType<StoryArgs>,
  render: renderCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "inline-radio",
      options: ["div", "article", "section", "li"],
    },
    size: { control: "inline-radio", options: ["sm", "md"] },
    orientation: {
      control: "inline-radio",
      options: ["vertical", "horizontal"],
    },
    mediaRatio: {
      control: "inline-radio",
      options: ["16/9", "4/3", "3/2", "1/1"],
    },
    headingLevel: { control: "inline-radio", options: [2, 3, 4, 5, 6] },
    title: { control: "text" },
    href: { control: "text" },
    children: { control: "text" },
    media: { table: { disable: true } },
    actions: { table: { disable: true } },
    onClick: { table: { disable: true } },
  },
  args: {
    title: "Atlas",
    href: "#atlas",
    children: "Mapping pipeline · updated 2 hours ago",
  },
  /*
   * A resizable frame rather than a fixed width. The card fills whatever it is
   * given, so dragging the corner is the quickest way to see that — and, for the
   * horizontal story, to watch it stack below 28rem.
   */
  decorators: [
    (Story, { parameters }) => (
      <div
        style={{
          width: (parameters["frameWidth"] as string | undefined) ?? "24rem",
          maxWidth: "100%",
          resize: "horizontal",
          overflow: "auto",
          padding: "var(--spacing-20)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: link mode, because `href` is set.
 *
 * Click anywhere on the card and the link activates. Tab to it and the focus ring
 * outlines the whole card. A screen reader announces "Atlas, link", then the
 * description — the title is the name, and the copy is attached with
 * `aria-describedby` rather than read as one long link.
 */
export const Primary: Story = {};

/**
 * No `href`, so the control is a `<button type="button">`. Use it for an action
 * that does not navigate — creating something, opening a dialog.
 */
export const ButtonMode: Story = {
  args: {
    href: undefined,
    title: "Start from a blank project",
    children: "No template, no sample data.",
    onClick: fn(),
  },
};

/**
 * Button mode with the native `disabled` attribute. The button leaves the tab
 * order, the card dims and the hover state switches off. Link mode has no
 * disabled state — an `<a>` cannot be disabled, so the type does not offer one.
 */
export const Disabled: Story = {
  args: {
    href: undefined,
    title: "Import from GitHub",
    children: "Connect a GitHub account in Settings first.",
    disabled: true,
    onClick: fn(),
  },
};

/**
 * Secondary controls in `actions` sit above the overlay. Click "Star" and only
 * the star handler fires; click anywhere else and the card's link does. In tab
 * order they come after the primary control.
 */
export const WithActions: Story = {
  args: {
    actions: (
      <>
        <Button size="sm" intent="secondary" text="Star Atlas" onClick={fn()} />
        <Button size="sm" intent="ghost" text="Share Atlas" onClick={fn()} />
      </>
    ),
  },
};

/**
 * With media. The image is `alt=""` here, and that is the right call in an
 * interactive card more often than not: the illustration restates the title, and
 * a non-empty alt would be read alongside it on every card.
 */
export const WithMedia: Story = {
  args: {
    media: <img src={MOUNTAINS} alt="" />,
    title: "Ridge trail",
    children: "9.4 km, 620 m of climbing.",
  },
};

/**
 * Horizontal, with media. Widen the panel past 28rem and the media moves to the
 * start side; narrow it and the card stacks. The switch follows the card's width,
 * not the viewport's.
 */
export const HorizontalWithMedia: Story = {
  args: {
    orientation: "horizontal",
    media: <img src={MOUNTAINS} alt="" />,
    title: "Ridge trail",
    children: "9.4 km, 620 m of climbing.",
  },
  parameters: { frameWidth: "40rem" },
};
