import { Button, Code, Input, Paragraph } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

const DENSITIES = ["compact", "comfort", "spacious"] as const;
type Density = (typeof DENSITIES)[number];

const STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/*
 * One width utility per step, written out so Tailwind finds each in the
 * source. A class built from the step (`w-(--space-${step})`) compiles to
 * nothing.
 */
const STEP_WIDTH: Record<(typeof STEPS)[number], string> = {
  0: "w-(--space-0)",
  1: "w-(--space-1)",
  2: "w-(--space-2)",
  3: "w-(--space-3)",
  4: "w-(--space-4)",
  5: "w-(--space-5)",
  6: "w-(--space-6)",
  7: "w-(--space-7)",
  8: "w-(--space-8)",
  9: "w-(--space-9)",
  10: "w-(--space-10)",
};

const CONTROL_HEIGHTS = ["xs", "sm", "md", "lg"] as const;

/*
 * `--border` is decorative here, as in `Table`'s row separators: the rows are
 * identified by their header cells, not by the lines between them.
 */
const cell =
  "border-b border-border px-(--space-3) py-(--space-2) text-start align-middle whitespace-nowrap";

/*
 * Each density column is its own `data-density` region, so the bars are
 * measured inside it. That is also the proof that density can be scoped to
 * part of a page: three densities render side by side.
 */
const StepCell = ({
  density,
  step,
}: {
  readonly density: Density;
  readonly step: (typeof STEPS)[number];
}) => {
  const barRef = useRef<HTMLSpanElement>(null);
  const [px, setPx] = useState<string | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (bar == null) return;
    setPx(`${String(bar.getBoundingClientRect().width)}px`);
  }, [density, step]);

  return (
    <td className={cell} data-density={density}>
      <span className="flex items-center gap-(--space-2)">
        <span
          ref={barRef}
          aria-hidden
          className={`inline-block h-3 bg-accent ${STEP_WIDTH[step]}`}
        />
        <span>{px}</span>
      </span>
    </td>
  );
};

const SpaceScale = () => (
  <div className="grid gap-(--space-4)">
    <Paragraph tone="muted" size="sm" measure>
      The <Code>--space-*</Code> scale in all three densities. Each column is a{" "}
      <Code>data-density</Code> region, and the px values are measured from the
      bars, so they follow the root font size. Comfort is the default. Density
      changes spacing only: control heights, icon sizes, borders and type stay
      the same.
    </Paragraph>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-foreground">
        <caption className="pb-(--space-2) text-start font-semibold">
          Space scale
        </caption>
        <thead>
          <tr>
            <th scope="col" className={cell}>
              Token
            </th>
            {DENSITIES.map((density) => (
              <th key={density} scope="col" className={cell}>
                {density}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STEPS.map((step) => (
            <tr key={step}>
              <th scope="row" className={cell}>
                <Code>--space-{step}</Code>
              </th>
              {DENSITIES.map((density) => (
                <StepCell key={density} density={density} step={step} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ControlHeights = () => (
  <div className="grid gap-(--space-4)">
    <Paragraph tone="muted" size="sm" measure>
      <Code>--control-height-*</Code> is a size, not spacing, so density does
      not change it. <Code>xs</Code> is 24px, the WCAG 2.5.8 minimum target
      size. Each row below is the same button and input in one density: the
      height holds and the padding moves.
    </Paragraph>
    <ul className="m-0 list-none p-0">
      {CONTROL_HEIGHTS.map((size) => (
        <li key={size}>
          <Code>--control-height-{size}</Code>
        </li>
      ))}
    </ul>
    {DENSITIES.map((density) => (
      <div
        key={density}
        data-density={density}
        className="flex flex-wrap items-end gap-(--space-3)"
      >
        <Button size="sm" text={`${density} sm`} />
        <Button size="md" text={`${density} md`} />
        <Button size="lg" text={`${density} lg`} />
        <Input label={`${density} input`} size="md" />
      </div>
    ))}
  </div>
);

const meta = {
  title: "Foundations/Spacing",
  component: SpaceScale,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The `--space-*` scale in compact, comfort and spacious, and the `--control-height-*` sizes that density leaves alone. The full rules are in `project-docs/references/SPACING.md`.",
      },
    },
  },
} satisfies Meta<typeof SpaceScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {};

export const ControlHeightsAcrossDensities: Story = {
  name: "Control heights across densities",
  render: () => <ControlHeights />,
};
