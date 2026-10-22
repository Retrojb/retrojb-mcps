import { Code, CodeBlock, Paragraph, SectionHeading } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Body/Code",
  component: Code,
  parameters: {
    // Inline code is shown inside running text, and the block fills its width.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text" },
  },
  args: {
    children: "tv()",
  },
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: inline `<code>` at `text-code`, on `--surface-raised` with the
 * decorative `--border` edge. The monospace face identifies it; the edge is
 * there for looks, which is why it does not need 3:1.
 */
export const Primary: Story = {};

/**
 * `text-code` is `0.9em`, so inline code follows its context — body-sized in a
 * paragraph, heading-sized in a heading.
 */
export const InContext: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
      <SectionHeading>
        Configuring <Code>tv()</Code>
      </SectionHeading>
      <Paragraph>
        Import <Code>tv</Code> from <Code>lib/tv.ts</Code>, never from{" "}
        <Code>tailwind-variants</Code> directly.
      </Paragraph>
      <Paragraph size="sm" tone="muted">
        A long identifier such as{" "}
        <Code>registerTypeRolesWithTailwindMergeConfiguration</Code> wraps
        rather than overflowing.
      </Paragraph>
    </div>
  ),
};

/**
 * `CodeBlock`: `<pre><code>`, whitespace preserved, scrolling sideways.
 *
 * Tab to it and use the arrow keys to scroll. It is a focusable region named by
 * the required `label`, which is what makes the overflow reachable without a
 * mouse (2.1.1).
 */
export const Block: Story = {
  render: () => (
    <CodeBlock label="Example: a variant definition">
      {`import { tv } from "../../../lib/tv";

const paragraphStyles = tv({
  base: ["m-0 min-w-0", "text-pretty wrap-break-word"],
  variants: { size: { lg: "text-body-lg", md: "text-body-md", sm: "text-body-sm" } },
  defaultVariants: { size: "md" },
});`}
    </CodeBlock>
  ),
};

/** A one-line block, the common install-command case. */
export const OneLineBlock: Story = {
  render: () => (
    <CodeBlock label="Install command">npm install @retrojb/ui</CodeBlock>
  ),
};
