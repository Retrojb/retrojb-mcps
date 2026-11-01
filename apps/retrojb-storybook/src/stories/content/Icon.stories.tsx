import {
  buttonStyle,
  Code,
  DynamicContainer,
  Icon,
  Link,
  Paragraph,
} from "@retrojb/ui";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  ExternalLink,
  Info,
  Menu,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  TriangleAlert,
  User,
  X,
  type LucideIcon,
} from "@retrojb/ui/icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

/*
 * The button stories use native `<button>` elements styled with `buttonStyle`
 * rather than `<Button>`. `Button` renders only its `text` prop, so it cannot
 * hold an icon yet; `buttonStyle` is exported for exactly this case, markup the
 * package does not own.
 */

/*
 * A handful of icons for the `icon` control. The mapping lives in the story,
 * not in the package: a name-to-component map is exactly what `Icon` refuses to
 * have, because it would pull every icon into every bundle.
 */
const iconOptions = {
  Search,
  Bell,
  Settings,
  CircleAlert,
  ChevronRight,
  Trash2,
} satisfies Record<string, LucideIcon>;

const meta = {
  title: "Content/Icon",
  component: Icon,
  parameters: {
    // A single graphic with a natural size.
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    icon: {
      control: "select",
      options: Object.keys(iconOptions),
      mapping: iconOptions,
    },
    label: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    tone: {
      control: "inline-radio",
      options: ["inherit", "muted", "info", "success", "danger"],
    },
    mirrorInRtl: { control: "boolean" },
    strokeWidth: { control: { type: "number", step: 0.25 } },
  },
  args: {
    icon: Search,
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default: decorative, `size="md"` (20px), `tone="inherit"`. The `<svg>`
 * gets `aria-hidden="true"` and `focusable="false"`, so a screen reader skips
 * it. Decorative is the right default because most icons sit next to text or
 * inside a named control, and the text already says what the icon shows.
 */
export const Primary: Story = {};

/**
 * `label` makes the icon meaningful: `role="img"` with `aria-label`. Use it
 * only when nothing else on the page says what the icon says, as with a status
 * icon standing on its own. The label describes the meaning ("Payment
 * failed"), not the picture. A meaningful icon needs 3:1 against its
 * background (1.4.11); every `tone` clears that.
 */
export const Labelled: Story = {
  args: { icon: CircleAlert, label: "Payment failed", tone: "danger" },
};

/**
 * `sm`, `md` and `lg`: 16, 20 and 24px, the same three steps as `Button` and
 * `SegmentedControl`. `sm` draws a 2.25-unit stroke (1.5px) rather than
 * Lucide's 2 (1.33px at that size), so the line does not thin out into a
 * lighter grey on a 1x screen.
 */
export const Sizes: Story = {
  render: (args) => (
    <DynamicContainer direction="horizontal" gap="lg" align="center">
      <Icon {...args} size="sm" />
      <Icon {...args} size="md" />
      <Icon {...args} size="lg" />
    </DynamicContainer>
  ),
};

/**
 * Every `tone`, each with a label that says the status in words. `tone` is
 * colour only, and colour is never the only carrier of the meaning (1.4.1).
 * In forced-colors mode all of them become the system text colour.
 */
export const Tones: Story = {
  render: (args) => (
    <DynamicContainer direction="horizontal" gap="lg" align="center">
      <Icon {...args} icon={Bell} tone="inherit" label="Notifications" />
      <Icon {...args} icon={Info} tone="muted" label="Details" />
      <Icon {...args} icon={Info} tone="info" label="Information" />
      <Icon {...args} icon={CircleCheck} tone="success" label="Saved" />
      <Icon {...args} icon={TriangleAlert} tone="danger" label="Error" />
    </DynamicContainer>
  ),
};

/**
 * With no `tone` the stroke is `currentColor`, so the icon takes the text
 * colour of whatever it sits in. Here it follows each `Button` intent and a
 * `Link` without being told, including their hover colours. This is the
 * pairing that has to clear 3:1 for a meaningful icon, and it is the
 * container's, not the icon's.
 */
export const InheritsCurrentColor: Story = {
  render: (args) => (
    <DynamicContainer direction="horizontal" gap="lg" align="center">
      <button type="button" className={buttonStyle({ intent: "primary" })}>
        <Icon {...args} icon={Plus} size="sm" />
        New project
      </button>
      <button type="button" className={buttonStyle({ intent: "secondary" })}>
        <Icon {...args} icon={Download} size="sm" />
        Export
      </button>
      <button type="button" className={buttonStyle({ intent: "ghost" })}>
        <Icon {...args} icon={Pencil} size="sm" />
        Edit
      </button>
      <button type="button" className={buttonStyle({ intent: "danger" })}>
        <Icon {...args} icon={Trash2} size="sm" />
        Delete
      </button>
      <Link href="#">
        Documentation
        <Icon {...args} icon={ExternalLink} size="sm" />
      </Link>
    </DynamicContainer>
  ),
};

/**
 * An icon-only button, done right. The name goes on the **button**
 * (`aria-label="Search"`), and the icon inside stays decorative. A screen
 * reader says "Search, button". A `label` on the icon instead would make the
 * button take its name from a child image's text, which is one step removed
 * from the control and easy to lose when the icon changes. Doing both adds
 * nothing: the button's `aria-label` replaces its content as its name.
 *
 * Without visible text the purpose has to be obvious from the icon alone.
 * Prefer a visible label where there is room.
 */
export const IconOnlyButton: Story = {
  render: (args) => (
    <DynamicContainer direction="horizontal" gap="md" align="center">
      <button
        type="button"
        className={buttonStyle({ intent: "secondary" })}
        aria-label="Search"
      >
        <Icon {...args} icon={Search} />
      </button>
      <button
        type="button"
        className={buttonStyle({ intent: "secondary" })}
        aria-label="Settings"
      >
        <Icon {...args} icon={Settings} />
      </button>
      <button
        type="button"
        className={buttonStyle({ intent: "ghost" })}
        aria-label="Close"
      >
        <Icon {...args} icon={X} />
      </button>
    </DynamicContainer>
  ),
};

/**
 * Next to visible text the icon is decorative. The text is the information;
 * labelling the icon too would announce "Success, Saved". The icon also
 * aligns with running text: `inline-block align-middle` keeps it on the line.
 */
export const NextToText: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <DynamicContainer direction="vertical" gap="md">
      <DynamicContainer direction="horizontal" gap="sm" align="center">
        <Icon {...args} icon={CircleCheck} tone="success" />
        <span>Saved</span>
      </DynamicContainer>
      <Paragraph>
        Press <Icon {...args} icon={Copy} size="sm" /> Copy to put the link on
        your clipboard, then share it with your team.
      </Paragraph>
    </DynamicContainer>
  ),
};

/**
 * Under `dir="rtl"`, `mirrorInRtl` flips directional icons. The top row sets
 * it on back / forward arrows and chevrons, which point along the reading
 * order and so must flip. The bottom row leaves it off on icons that must not
 * flip: refresh (clocks turn the same way everywhere), play (follows the tape,
 * not the text), a checkmark and a download arrow.
 */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <DynamicContainer direction="vertical" gap="lg">
        <DynamicContainer direction="horizontal" gap="md" align="center">
          <button
            type="button"
            className={buttonStyle({ intent: "secondary" })}
          >
            <Icon {...args} icon={ArrowLeft} size="sm" mirrorInRtl />
            Back
          </button>
          <button
            type="button"
            className={buttonStyle({ intent: "secondary" })}
          >
            Next
            <Icon {...args} icon={ArrowRight} size="sm" mirrorInRtl />
          </button>
          <Icon {...args} icon={ChevronLeft} mirrorInRtl label="Previous" />
          <Icon {...args} icon={ChevronRight} mirrorInRtl label="Next" />
        </DynamicContainer>
        <DynamicContainer direction="horizontal" gap="md" align="center">
          <Icon {...args} icon={RefreshCw} label="Refresh" />
          <Icon {...args} icon={Play} label="Play" />
          <Icon {...args} icon={Check} label="Done" />
          <Icon {...args} icon={Download} label="Download" />
        </DynamicContainer>
      </DynamicContainer>
    </div>
  ),
};

const gallery = {
  Search,
  Menu,
  X,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Settings,
  User,
  Bell,
  Pencil,
  Trash2,
  Copy,
  Download,
  ExternalLink,
  Info,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
} satisfies Record<string, LucideIcon>;

/**
 * A few common icons, each imported by name from `@retrojb/ui/icons`. Only
 * the icons a module imports are bundled. The name under each is the visible
 * text, so the icons themselves are decorative.
 */
export const Gallery: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <DynamicContainer as="ul" direction="horizontal" gap="lg">
      {Object.entries(gallery).map(([name, icon]) => (
        <li key={name}>
          <DynamicContainer direction="vertical" gap="xs" align="center">
            <Icon {...args} icon={icon} size="lg" />
            <Code>{name}</Code>
          </DynamicContainer>
        </li>
      ))}
    </DynamicContainer>
  ),
};
