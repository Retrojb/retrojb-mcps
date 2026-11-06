import { Emphasis, Paragraph, SectionHeading, Strong } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Body/Strong",
  component: Strong,
  parameters: {
    // Inline text is shown inside running text, which fills its container.
    layout: "padded",
  },
  // No `autodocs` tag: the docs page is `Strong.mdx`, and Storybook refuses to
  // index both for one stories file. See `templates/Component.mdx`.
  argTypes: {
    children: { control: "text" },
  },
  args: {
    children: "Warning:",
  },
} satisfies Meta<typeof Strong>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: a `<strong>` in `font-bold` (700) inside a sentence. It takes
 * the paragraph's colour, size and line height. The word "Warning:" is there on
 * purpose: most screen readers do not announce `<strong>`, so the meaning is in
 * the words and the weight only reinforces it (WCAG 1.4.1).
 */
export const Primary: Story = {
  render: (args) => (
    <Paragraph>
      <Strong {...args} /> this deletes the project and its history.
    </Paragraph>
  ),
};

/**
 * `Strong` sets 700 whatever the parent sets. Heading roles are 600, so here it
 * is one step heavier than the rest of the heading. In a 700 role (`display`,
 * `heading-xl`, so `ProductHeading` and `PageHeading`) it would look the same
 * as the surrounding text, which is why the demonstration uses `SectionHeading`.
 * Size and colour still come from the heading.
 */
export const InHeading: Story = {
  render: (args) => (
    <SectionHeading>
      Billing is <Strong {...args} /> for every workspace
    </SectionHeading>
  ),
  args: { children: "required" },
};

/**
 * Importance and stress are different things and can nest: `Emphasis` inside
 * `Strong`, or the other way round. Each element keeps its own meaning, and
 * the result is bold and italic.
 */
export const WithEmphasis: Story = {
  render: (args) => (
    <Paragraph>
      <Strong {...args}>
        Never share your <Emphasis>private</Emphasis> key.
      </Strong>{" "}
      The public key is safe to publish.
    </Paragraph>
  ),
};
