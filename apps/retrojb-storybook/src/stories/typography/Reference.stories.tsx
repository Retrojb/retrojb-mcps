import { Link, Reference } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Typography/Body/Reference",
  component: Reference,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "inline-radio", options: ["lg", "md"] },
    attribution: { control: "text" },
    work: { control: "text" },
    cite: { control: "text" },
    children: { control: "text" },
  },
  args: {
    children:
      "Make it easier for users to see and hear content including separating foreground from background.",
    attribution: "W3C",
    work: "Web Content Accessibility Guidelines 2.2",
    cite: "https://www.w3.org/TR/WCAG22/#distinguishable",
  },
} satisfies Meta<typeof Reference>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: `size="md"`, with an attribution and a work.
 *
 * `<figure>` around a `<blockquote>` and a `<figcaption>`, the HTML
 * specification's pattern for an attributed quotation. The attribution is
 * outside the quote, so it is not read as part of what was said; the work's
 * title is in a `<cite>`.
 */
export const Primary: Story = {};

/** A pull quote: `size="lg"` draws the quotation at `body-lg`. */
export const Large: Story = {
  args: { size: "lg" },
};

/**
 * With no `attribution` or `work` there is no `<figcaption>` — just the
 * bordered blockquote.
 */
export const QuoteOnly: Story = {
  args: { attribution: undefined, work: undefined, cite: undefined },
};

/**
 * `cite` is invisible to users, so a source they should be able to open goes in
 * `work` as a `Link`.
 */
export const LinkedSource: Story = {
  args: {
    work: (
      <Link href="https://www.w3.org/TR/WCAG22/#distinguishable">
        WCAG 2.2, Guideline 1.4
      </Link>
    ),
  },
};
