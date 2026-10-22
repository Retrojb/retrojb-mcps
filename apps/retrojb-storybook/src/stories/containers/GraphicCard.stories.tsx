import {
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  GraphicCard,
  InteractiveCard,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BANDS, MOUNTAINS } from "../../story-data/cardMedia";

const meta = {
  title: "Containers/GraphicCard",
  component: GraphicCard,
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
    media: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  args: {
    media: (
      <img src={MOUNTAINS} alt="Three purple peaks under a pale moon at dusk" />
    ),
    children: (
      <>
        <CardHeader>
          <CardTitle>Ridge trail</CardTitle>
        </CardHeader>
        <CardBody>
          9.4 km, 620 m of climbing. Best walked east to west.
        </CardBody>
      </>
    ),
  },
} satisfies Meta<typeof GraphicCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A frame the card has to fill. Drag the corner to resize it. */
const Frame = ({
  width,
  label,
  children,
}: {
  readonly width: string;
  readonly label: string;
  readonly children: React.ReactNode;
}) => (
  <figure style={{ margin: 0 }}>
    <figcaption
      style={{
        font: "inherit",
        fontSize: "0.75rem",
        marginBlockEnd: "0.25rem",
      }}
    >
      {label}
    </figcaption>
    <div
      style={{
        width,
        maxWidth: "100%",
        resize: "horizontal",
        overflow: "auto",
        outline: "1px dashed currentColor",
        padding: "var(--spacing-20)",
      }}
    >
      {children}
    </div>
  </figure>
);

/**
 * The default: `orientation="vertical"`, `mediaRatio="16/9"`.
 *
 * The source image is square; the media region is 16:9, so `object-cover` crops
 * it rather than stretching it or letting it set the card's height. The alt text
 * describes the image because here the image is content — remove it and a reader
 * loses what the trail looks like.
 */
export const Primary: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "22rem" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Media on the start side, content on the end — once the card is at least 28rem
 * wide. Narrower than that it stacks. The width that matters is the card's own,
 * via an `@container` on the root, so this holds in a sidebar on a wide screen.
 */
export const Horizontal: Story = {
  args: { orientation: "horizontal" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "40rem" }}>
        <Story />
      </div>
    ),
  ],
};

/** The four ratios, each cropping the same very wide image differently. */
export const MediaRatios: Story = {
  render: (args) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))",
        gap: "var(--spacing-40)",
      }}
    >
      {(["16/9", "4/3", "3/2", "1/1"] as const).map((ratio) => (
        <GraphicCard
          key={ratio}
          {...args}
          mediaRatio={ratio}
          media={<img src={BANDS} alt="" />}
        >
          <CardTitle>{ratio}</CardTitle>
        </GraphicCard>
      ))}
    </div>
  ),
};

/**
 * Hugging the container. The same horizontal card in four frames, each one
 * resizable from its corner.
 *
 * The card fills each frame's width exactly and never overflows it; the image is
 * cropped to the media region and never pushes the card wider or taller. Below
 * 28rem of *card* width it stacks — and the viewport is the same for all four,
 * which is the point: a viewport breakpoint would lay all four out the same way.
 *
 * The last frame is a grid row with a fixed height. `h-full` stretches the card to
 * fill it and `mt-auto` keeps the footer on the bottom edge.
 */
export const HuggingContainers: Story = {
  args: {
    orientation: "horizontal",
    children: (
      <>
        <CardHeader>
          <CardTitle>Ridge trail</CardTitle>
        </CardHeader>
        <CardBody>9.4 km, 620 m of climbing.</CardBody>
        <CardFooter>
          <Button size="sm" intent="secondary" text="Save route" />
        </CardFooter>
      </>
    ),
  },
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--spacing-60)" }}>
      <Frame width="16rem" label="16rem — stacked">
        <GraphicCard {...args} />
      </Frame>
      <Frame width="26rem" label="26rem — still stacked (card is under 28rem)">
        <GraphicCard {...args} />
      </Frame>
      <Frame width="44rem" label="44rem — side by side">
        <GraphicCard {...args} />
      </Frame>
      <Frame width="44rem" label="44rem, fixed 20rem row — fills the height">
        <div style={{ display: "grid", height: "20rem" }}>
          <GraphicCard {...args} />
        </div>
      </Frame>
    </div>
  ),
};

/**
 * Decorative media takes `alt=""`. It drops out of the accessibility tree, so the
 * card is announced by its title alone. An `<img>` with no `alt` at all is not
 * the same — most screen readers read the file name instead, which for a data URI
 * is a few hundred characters of noise.
 */
export const DecorativeMedia: Story = {
  args: {
    media: <img src={BANDS} alt="" />,
    children: (
      <>
        <CardHeader>
          <CardTitle>Release notes</CardTitle>
        </CardHeader>
        <CardBody>What changed in 4.2.</CardBody>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "22rem" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * A graphic card that is a link. `InteractiveCard` takes the same `media`,
 * `orientation` and `mediaRatio`, so an interactive graphic card is that
 * component with media rather than a fourth one.
 */
export const Interactive: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
        gap: "var(--spacing-40)",
      }}
    >
      <InteractiveCard
        href="#ridge"
        title="Ridge trail"
        media={<img src={MOUNTAINS} alt="" />}
      >
        9.4 km, 620 m of climbing.
      </InteractiveCard>
      <InteractiveCard
        href="#valley"
        title="Valley loop"
        media={<img src={BANDS} alt="" />}
        actions={<Button size="sm" intent="ghost" text="Save Valley loop" />}
      >
        5.1 km, mostly flat.
      </InteractiveCard>
    </div>
  ),
};
