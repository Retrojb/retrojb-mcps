import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, Paragraph } from "@retrojb/ui";

/*
 * A sample picture as an inline SVG, so the stories need no network and no
 * binary asset. A plain gradient with a head-and-shoulders shape.
 */
const SAMPLE_PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#956fb1"/><stop offset="1" stop-color="#219a2f"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="25" r="11" fill="#fefdff"/><path d="M12 64c2-14 10-20 20-20s18 6 20 20z" fill="#fefdff"/></svg>`,
)}`;

const row = "flex flex-wrap items-center gap-(--space-4)";

const meta = {
  title: "Content/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  // No `autodocs` tag: the docs page is `Avatar.mdx`, and Storybook refuses to
  // index both for one stories file. See `templates/Component.mdx`.
  argTypes: {
    name: { control: "text" },
    src: { control: "text" },
    initials: { control: "text" },
    shape: { control: "inline-radio", options: ["round", "square"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    elevated: { control: "boolean" },
    decorative: { control: "boolean" },
  },
  args: {
    name: "Ada Lovelace",
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `shape="round"`, `size="md"`, no picture, so it shows the
 * initials from `name`.
 */
export const Primary: Story = {};

/**
 * `round` for a person, `square` for a team, organisation or project, each
 * with a picture and with initials.
 */
export const Shapes: Story = {
  render: (args) => (
    <div className={row}>
      <Avatar {...args} shape="round" src={SAMPLE_PICTURE} />
      <Avatar {...args} shape="round" />
      <Avatar
        {...args}
        name="Retro Studio"
        shape="square"
        src={SAMPLE_PICTURE}
      />
      <Avatar {...args} name="Retro Studio" shape="square" />
    </div>
  ),
};

/** 24, 40 and 64px, in both shapes. Density does not change these sizes. */
export const Sizes: Story = {
  render: (args) => (
    <div className="grid gap-(--space-4)">
      {(["round", "square"] as const).map((shape) => (
        <div key={shape} className={row}>
          <Avatar {...args} shape={shape} size="sm" />
          <Avatar {...args} shape={shape} size="md" />
          <Avatar {...args} shape={shape} size="lg" />
          <Avatar {...args} shape={shape} size="lg" src={SAMPLE_PICTURE} />
        </div>
      ))}
    </div>
  ),
};

/**
 * What shows when there is no usable picture: initials from the first and
 * last word, one initial for a single word, an `initials` override, and the
 * person glyph from `initials=""`. The last avatar's `src` does not exist, so
 * it falls back to its initials.
 */
export const Fallbacks: Story = {
  render: (args) => (
    <div className={row}>
      <Avatar {...args} name="Grace Brewster Murray Hopper" />
      <Avatar {...args} name="Cher" />
      <Avatar {...args} name="李小龙" initials="李" />
      <Avatar {...args} name="Anonymous visitor" initials="" />
      <Avatar
        {...args}
        name="Broken Picture"
        src="/this-picture-does-not-exist.png"
        data-testid="broken"
      />
    </div>
  ),
};

/**
 * `elevated` adds the `raised-1` shadow. The border stays, and is all that is
 * left in forced-colors mode.
 */
export const Elevated: Story = {
  args: { elevated: true, size: "lg", src: SAMPLE_PICTURE },
  render: (args) => (
    <div className={row}>
      <Avatar {...args} />
      <Avatar {...args} shape="square" name="Retro Studio" />
    </div>
  ),
};

/**
 * Beside a visible name, the avatar is `decorative`, so a screen reader reads
 * "Ada Lovelace" once, from the text.
 */
export const BesideAName: Story = {
  name: "Beside a name",
  args: { decorative: true },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-(--space-3)">
      <Avatar {...args} src={SAMPLE_PICTURE} />
      <Paragraph size="sm">{args.name}</Paragraph>
    </div>
  ),
};
