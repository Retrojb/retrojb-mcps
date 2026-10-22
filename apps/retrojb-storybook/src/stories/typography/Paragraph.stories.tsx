import { Code, Paragraph } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const copy =
  "Retro Studio keeps design tokens and components in step. Change a role in the token layer and every heading, paragraph and label that uses it follows, in both colour schemes, without a rebuild of the components that read it.";

const meta = {
  title: "Typography/Body/Paragraph",
  component: Paragraph,
  parameters: {
    // Running text fills its container; the measure is only visible padded.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "inline-radio", options: ["lg", "md", "sm"] },
    tone: { control: "inline-radio", options: ["default", "muted"] },
    measure: { control: "boolean" },
    children: { control: "text" },
  },
  args: {
    children: copy,
  },
} satisfies Meta<typeof Paragraph>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `size="md"`, `tone="default"`, no measure.
 *
 * `body-md` is 1rem on a 1.5 line height — the 1.4.12 floor, so a user's
 * text-spacing stylesheet reflows nothing. No measure by default, because most
 * paragraphs already sit in a narrower container than the page.
 */
export const Primary: Story = {};

/**
 * A lead paragraph: `size="lg"` with `measure`, which caps the line at 65ch.
 * Widen the canvas to see the cap hold.
 */
export const Lead: Story = {
  args: { size: "lg", measure: true },
};

/**
 * Supporting copy. `--foreground-muted` is still 6.25:1 or more on every
 * surface, so muting costs nothing against 1.4.3.
 */
export const Muted: Story = {
  args: { size: "sm", tone: "muted" },
};

/** Every size, one above the other, all with `measure`. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--spacing-60)" }}>
      <Paragraph size="lg" measure>
        {copy}
      </Paragraph>
      <Paragraph size="md" measure>
        {copy}
      </Paragraph>
      <Paragraph size="sm" measure>
        {copy}
      </Paragraph>
    </div>
  ),
};

/**
 * Inline `Code` follows the paragraph's size, because `text-code` is `0.9em`.
 */
export const WithInlineCode: Story = {
  args: {
    children: (
      <>
        Call <Code>paragraphStyles()</Code> from a server component to style a
        paragraph this package does not render.
      </>
    ),
  },
};
