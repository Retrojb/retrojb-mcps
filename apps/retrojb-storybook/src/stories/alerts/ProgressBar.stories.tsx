import {
  Button,
  DynamicContainer,
  InlineAlert,
  ProgressBar,
  SubHeading,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState, type ComponentProps } from "react";

const meta = {
  title: "Alerts/ProgressBar",
  component: ProgressBar,
  parameters: {
    // Not `centered`: the bar is a block that takes the width of whatever
    // contains it, and a centring flex container would collapse it.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    value: { control: { type: "number" } },
    min: { control: { type: "number" } },
    max: { control: { type: "number" } },
    valueText: { control: "text" },
    showValue: { control: "boolean" },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    tone: { control: "inline-radio", options: ["info", "success", "danger"] },
    fullWidth: { control: "boolean" },
    labelHidden: { control: "boolean" },
    formatValue: { table: { disable: true } },
  },
  args: {
    label: "Uploading report.pdf",
    value: 40,
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: determinate, `min={0}`, `max={100}`, `size="md"`,
 * `tone="info"`, full width, no readout. The track's `--border-strong` edge
 * shows the whole range and the `--accent` fill shows how much of it is done.
 * The label is the progressbar's accessible name.
 */
export const Primary: Story = {};

/**
 * No `value`: indeterminate. The segment slides from the inline start to the
 * inline end, and `aria-valuenow`, `aria-valuemin` and `aria-valuemax` are all
 * omitted. Use it when there is no honest number yet — connecting, preparing —
 * rather than a fake percentage.
 */
export const Indeterminate: Story = {
  args: { label: "Connecting to the server", value: undefined },
};

/**
 * `sm`, `md` and `lg`: an 8, 12 and 16px track, border included. The label
 * steps through the `label-sm` / `label-md` / `label-lg` roles with it.
 */
export const Sizes: Story = {
  render: (args) => (
    <DynamicContainer direction="vertical" gap="xl">
      <ProgressBar {...args} size="sm" label="Small" showValue />
      <ProgressBar {...args} size="md" label="Medium" showValue />
      <ProgressBar {...args} size="lg" label="Large" showValue />
    </DynamicContainer>
  ),
};

/**
 * The three tones: the same union as the alerts, and no `warning`, for the
 * same reason (there is no `--warning` token). Tone recolours the fill only.
 * Each bar here also says its status in the label, because colour alone does
 * not carry it (1.4.1).
 */
export const Tones: Story = {
  render: (args) => (
    <DynamicContainer direction="vertical" gap="xl">
      <ProgressBar {...args} tone="info" label="Syncing contacts" value={40} />
      <ProgressBar
        {...args}
        tone="success"
        label="Backup complete"
        value={100}
        showValue
      />
      <ProgressBar
        {...args}
        tone="danger"
        label="Upload failed at 62%"
        value={62}
        description="The connection was lost. Retry to continue from where it stopped."
      />
    </DynamicContainer>
  ),
};

/**
 * `showValue` draws the value beside the label. The default readout is a whole
 * percentage rounded down, so it never shows "100%" before the work is done.
 * The readout is `aria-hidden`; the progressbar already exposes the value.
 */
export const WithValueReadout: Story = {
  args: { showValue: true, value: 99.6 },
};

/**
 * `valueText` becomes `aria-valuetext`, so a screen reader says "3 of 10
 * files" rather than a bare number. A custom `formatValue` changes the visible
 * readout, and when `valueText` is not set its output is announced as well, so
 * the readout and the speech match.
 */
export const ValueText: Story = {
  render: (args) => (
    <DynamicContainer direction="vertical" gap="xl">
      <ProgressBar
        {...args}
        label="Importing files"
        value={3}
        max={10}
        valueText="3 of 10 files"
      />
      <ProgressBar
        {...args}
        label="Importing files"
        value={3}
        max={10}
        showValue
        formatValue={({ value, max }) =>
          `${String(value)} of ${String(max)} files`
        }
      />
      <ProgressBar
        {...args}
        label="Checkout"
        value={2}
        min={1}
        max={4}
        showValue
        formatValue={({ value, max }) =>
          `Step ${String(value)} of ${String(max)}`
        }
        description="Step 2: Payment"
      />
    </DynamicContainer>
  ),
};

/**
 * Helper text, wired with `aria-describedby`. A caller-supplied
 * `aria-describedby` is kept and listed after it.
 */
export const WithDescription: Story = {
  args: {
    label: "Exporting the workspace",
    value: 25,
    showValue: true,
    description: "About two minutes left. You can leave this page.",
  },
};

/**
 * `labelHidden` — for when a heading right above already says what is
 * loading. The label is visually hidden but is still the bar's accessible name.
 */
export const LabelHidden: Story = {
  render: (args) => (
    <section>
      <SubHeading>Storage</SubHeading>
      <ProgressBar
        {...args}
        label="Storage used"
        labelHidden
        value={7.2}
        max={10}
        showValue
        formatValue={({ value, max }) =>
          `${String(value)} of ${String(max)} GB`
        }
      />
    </section>
  ),
};

/**
 * `fullWidth={false}`: a 20rem bar, capped at its container, for a bar in a
 * row beside other content. Set any other width with `rootClassName`.
 */
export const FixedWidth: Story = {
  args: { fullWidth: false, showValue: true },
};

/**
 * Simulated upload. Press the button: the bar starts indeterminate while the
 * upload "prepares", then fills. Three things to notice:
 *
 * - The bar is not a live region, so it does not announce every step.
 * - The file list is the region being loaded, so it carries
 *   `aria-busy="true"` while the upload runs. The bar sits outside it, since
 *   assistive technology may hold back a busy region's content.
 * - Completion is announced by an `InlineAlert` with `live="polite"`. It is
 *   rendered from the start with no message, so its live region already
 *   exists when "Upload complete" arrives.
 */
export const SimulatedProgress: Story = {
  render: (args) => <SimulatedDemo {...args} />,
};

const SimulatedDemo = (args: ComponentProps<typeof ProgressBar>) => {
  // `undefined` while preparing (indeterminate), then 0–100.
  const [value, setValue] = useState<number | undefined>(0);
  const [running, setRunning] = useState(false);
  const [files, setFiles] = useState<readonly string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    let ticks = 0;
    let current = 0;
    const timer = setInterval(() => {
      ticks += 1;
      // Three ticks of "preparing" before there is a number to show.
      if (ticks <= 3) {
        return;
      }
      current = Math.min(100, current + 8);
      setValue(current);
      if (current === 100) {
        clearInterval(timer);
        setRunning(false);
        setFiles((list) => [...list, `report-${String(list.length + 1)}.pdf`]);
        setMessage("Upload complete. The file is in your files list.");
      }
    }, 400);
    return () => {
      clearInterval(timer);
    };
  }, [running]);

  return (
    <DynamicContainer direction="vertical" gap="lg">
      <div>
        <Button
          text="Upload report.pdf"
          disabled={running}
          onClick={() => {
            setMessage(null);
            setValue(undefined);
            setRunning(true);
          }}
        />
      </div>
      <ProgressBar
        {...args}
        label="Uploading report.pdf"
        value={value}
        valueText={value === undefined ? "Preparing" : undefined}
        showValue
      />
      <InlineAlert tone="success" live="polite">
        {message}
      </InlineAlert>
      <section
        aria-labelledby="simulated-files"
        aria-busy={running || undefined}
      >
        <SubHeading id="simulated-files">Your files</SubHeading>
        {files.length === 0 ? (
          <p>No files yet.</p>
        ) : (
          <ul>
            {files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        )}
      </section>
    </DynamicContainer>
  );
};

/**
 * Reduced motion. With `prefers-reduced-motion: reduce`, the indeterminate
 * bar stops moving and shows a still band of diagonal stripes instead, which
 * still reads as "working" and cannot be mistaken for an empty or a full bar.
 * Determinate fills stop easing between values and jump.
 *
 * Storybook cannot switch the media query for you. To see it, turn on
 * "Reduce motion" in the OS accessibility settings, or in Chrome DevTools open
 * Rendering and set "Emulate CSS media feature prefers-reduced-motion" to
 * `reduce`.
 */
export const ReducedMotion: Story = {
  render: (args) => (
    <DynamicContainer direction="vertical" gap="xl">
      <ProgressBar {...args} label="Preparing the export" value={undefined} />
      <ProgressBar {...args} label="Exporting" value={55} showValue />
    </DynamicContainer>
  ),
};

/**
 * Under `dir="rtl"` the fill grows from the right, the readout sits on the
 * left, and the indeterminate segment travels right to left.
 */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl" lang="ar">
      <DynamicContainer direction="vertical" gap="xl">
        <ProgressBar {...args} label="جارٍ التحميل" value={30} showValue />
        <ProgressBar {...args} label="جارٍ الاتصال" value={undefined} />
      </DynamicContainer>
    </div>
  ),
};
