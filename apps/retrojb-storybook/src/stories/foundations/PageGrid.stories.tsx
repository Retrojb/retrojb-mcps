import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  GridItem,
  PageGrid,
  Paragraph,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

/*
 * A visible box for a region, so the columns can be seen. The layout of the
 * page itself comes from `PageGrid` and `GridItem`; only the decoration is
 * inline.
 */
const box: CSSProperties = {
  minBlockSize: "3rem",
  padding: "var(--space-2)",
  border: "1px dashed var(--border-strong)",
  borderRadius: "var(--radius-control)",
  background: "var(--surface-base)",
  color: "var(--foreground)",
  font: "inherit",
};

const Label = ({ children }: { readonly children: ReactNode }) => (
  <span style={{ fontSize: "var(--text-label-sm)" }}>{children}</span>
);

const meta = {
  title: "Foundations/Page grid",
  component: PageGrid,
  parameters: {
    // The grid owns the page margin, so no Storybook padding around it.
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Twelve columns, with a gutter and outer margin that widen at `md` and `lg`, capped at `--grid-max-width`. Resize the canvas or use the viewport toolbar to see each breakpoint. See `project-docs/references/LAYOUT.md`.",
      },
    },
  },
} satisfies Meta<typeof PageGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The twelve columns, one item each. */
export const Columns: Story = {
  render: () => (
    <PageGrid style={{ paddingBlock: "var(--space-6)" }}>
      {Array.from({ length: 12 }, (_, index) => (
        <GridItem key={index} span={1} style={box}>
          <Label>{index + 1}</Label>
        </GridItem>
      ))}
    </PageGrid>
  ),
};

/**
 * Full width below `md`, half from `md`, a third from `lg`. Unset breakpoints
 * inherit from the next smaller one.
 */
export const ResponsiveSpans: Story = {
  name: "Responsive spans",
  render: () => (
    <PageGrid style={{ paddingBlock: "var(--space-6)" }}>
      {["One", "Two", "Three", "Four", "Five", "Six"].map((name) => (
        <GridItem key={name} span={{ base: "full", md: 6, lg: 4 }} style={box}>
          <Label>
            {name}: <Code>{`span={{ base: "full", md: 6, lg: 4 }}`}</Code>
          </Label>
        </GridItem>
      ))}
    </PageGrid>
  ),
};

/** `offset` leaves columns empty before the item, here to centre it. */
export const Offset: Story = {
  render: () => (
    <PageGrid style={{ paddingBlock: "var(--space-6)" }}>
      <GridItem span={{ base: "full", md: 8 }} offset={{ md: 2 }} style={box}>
        <Label>
          <Code>{`span={{ base: "full", md: 8 }} offset={{ md: 2 }}`}</Code>
        </Label>
      </GridItem>
      <GridItem span={{ base: "full", lg: 6 }} offset={{ lg: 6 }} style={box}>
        <Label>
          <Code>{`span={{ base: "full", lg: 6 }} offset={{ lg: 6 }}`}</Code>
        </Label>
      </GridItem>
    </PageGrid>
  ),
};

/**
 * `subgrid` puts a section's children on the page's own columns. The inner
 * items line up with the column markers above them.
 */
export const Subgrid: Story = {
  render: () => (
    <PageGrid style={{ paddingBlock: "var(--space-6)" }}>
      {Array.from({ length: 12 }, (_, index) => (
        <GridItem
          key={index}
          span={1}
          style={{ ...box, minBlockSize: "1.5rem" }}
        >
          <Label>{index + 1}</Label>
        </GridItem>
      ))}
      <GridItem
        as="section"
        aria-label="Subgrid section"
        span={{ base: "full", md: 8 }}
        offset={{ md: 2 }}
        subgrid
        data-testid="subgrid"
        style={{ ...box, borderStyle: "solid" }}
      >
        <GridItem
          span={{ base: "full", md: 4 }}
          style={box}
          data-testid="subgrid-child"
        >
          <Label>span 4 of the section&apos;s 8</Label>
        </GridItem>
        <GridItem span={{ base: "full", md: 4 }} style={box}>
          <Label>span 4</Label>
        </GridItem>
        <GridItem style={box} data-testid="subgrid-full">
          <Label>No span: the section&apos;s full width</Label>
        </GridItem>
      </GridItem>
    </PageGrid>
  ),
};

/**
 * A root layout: header, main content with a sidebar, footer. Each region is
 * its own `PageGrid`, so the landmarks are real elements and every region
 * shares the same columns. In an app this lives in the root layout and every
 * page renders into `main`.
 *
 * ```tsx
 * // app/layout.tsx (Next.js) — no "use client" needed
 * <body>
 *   <PageGrid as="header">…</PageGrid>
 *   <PageGrid as="main">{children}</PageGrid>
 *   <PageGrid as="footer">…</PageGrid>
 * </body>
 * ```
 */
export const RootLayoutTemplate: Story = {
  name: "Root layout template",
  render: () => (
    <div
      style={{
        display: "grid",
        gap: "var(--space-6)",
        paddingBlock: "var(--space-6)",
      }}
    >
      <PageGrid as="header">
        <GridItem style={box}>
          <Label>
            <Code>{`<PageGrid as="header">`}</Code> site header
          </Label>
        </GridItem>
      </PageGrid>
      <PageGrid as="main">
        <GridItem
          as="section"
          span={{ base: "full", lg: 8 }}
          aria-label="Article"
        >
          <Card>
            <CardHeader>
              <CardTitle level={2}>Main content</CardTitle>
            </CardHeader>
            <CardBody>
              <Code>{`span={{ base: "full", lg: 8 }}`}</Code>. Below{" "}
              <Code>lg</Code> the sidebar drops underneath, in DOM order.
            </CardBody>
          </Card>
        </GridItem>
        <GridItem
          as="aside"
          span={{ base: "full", lg: 4 }}
          aria-label="Related"
        >
          <Card>
            <CardHeader>
              <CardTitle level={2}>Sidebar</CardTitle>
            </CardHeader>
            <CardBody>
              <Code>as=&quot;aside&quot;</Code>, four columns from{" "}
              <Code>lg</Code>.
            </CardBody>
          </Card>
        </GridItem>
      </PageGrid>
      <PageGrid as="footer">
        <GridItem style={box}>
          <Paragraph size="sm">
            <Code>{`<PageGrid as="footer">`}</Code> site footer
          </Paragraph>
        </GridItem>
      </PageGrid>
    </div>
  ),
};
