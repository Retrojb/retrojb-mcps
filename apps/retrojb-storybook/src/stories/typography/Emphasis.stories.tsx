import { Emphasis, Paragraph, SectionHeading, Strong } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Body/Emphasis",
  component: Emphasis,
  parameters: {
    // Inline text is shown inside running text, which fills its container.
    layout: "padded",
  },
  // No `autodocs` tag: the docs page is `Emphasis.mdx`, and Storybook refuses to
  // index both for one stories file. See `templates/Component.mdx`.
  argTypes: {
    children: { control: "text" },
  },
  args: {
    children: "tomorrow",
  },
} satisfies Meta<typeof Emphasis>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: an `<em>` in `italic` inside a sentence. It marks the word you
 * would lean on when speaking, so moving it changes what the sentence says. It
 * takes the paragraph's colour, size and line height.
 */
export const Primary: Story = {
  render: (args) => (
    <Paragraph>
      I said <Emphasis {...args} />, not today.
    </Paragraph>
  ),
};

/**
 * In a heading, `Emphasis` keeps the heading's size, weight and colour and only
 * adds the slant. Keep it to a word: italic is harder to read at length for
 * some readers.
 */
export const InHeading: Story = {
  render: (args) => (
    <SectionHeading>
      Your data, <Emphasis {...args} /> yours
    </SectionHeading>
  ),
  args: { children: "only" },
};

/**
 * Stress and importance are different things and can nest: `Strong` inside
 * `Emphasis`, or the other way round. Each element keeps its own meaning, and
 * the result is italic and bold.
 */
export const WithStrong: Story = {
  render: (args) => (
    <Paragraph>
      <Emphasis {...args}>
        This is <Strong>not</Strong> reversible
      </Emphasis>
      , so check the project name first.
    </Paragraph>
  ),
  args: { children: undefined },
};
