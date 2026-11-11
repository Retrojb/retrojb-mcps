import {
  BEVELS,
  Code,
  Paragraph,
  SHADOW_ROLES,
  type Bevel,
  type ShadowRole,
} from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/*
 * The utilities are written out in full rather than built from the role name,
 * because Tailwind only emits classes it finds as literal strings. These are
 * also emitted by `@source inline` in `packages/ui/src/styles/index.css`.
 */
const SHADOW_CLASS: Record<ShadowRole, string> = {
  control: "shadow-control",
  "control-hover": "shadow-control-hover",
  "raised-1": "shadow-raised-1",
  "raised-2": "shadow-raised-2",
  overlay: "shadow-overlay",
  modal: "shadow-modal",
};

const BEVEL_CLASS: Record<Bevel, string> = {
  "bevel-sm": "inset-shadow-bevel-sm",
  "bevel-md": "inset-shadow-bevel-md",
  "bevel-lg": "inset-shadow-bevel-lg",
  "bevel-pressed": "inset-shadow-bevel-pressed",
};

/* The surface each role pairs with, per the table in `base.css`. */
const ROLE_SURFACE: Record<ShadowRole, string> = {
  control: "bg-surface-raised-1",
  "control-hover": "bg-surface-raised-1",
  "raised-1": "bg-surface-raised-1",
  "raised-2": "bg-surface-raised-2",
  overlay: "bg-surface-overlay",
  modal: "bg-surface-overlay",
};

const ROLE_LEVEL: Record<ShadowRole, number> = {
  control: 1,
  "control-hover": 2,
  "raised-1": 2,
  "raised-2": 3,
  overlay: 4,
  modal: 5,
};

/* The surfaces the samples sit on: token name, and its background utility. */
const SURFACES = [
  ["--background", "bg-background"],
  ["--surface-sunken", "bg-surface-sunken"],
  ["--surface-base", "bg-surface-base"],
] as const;

/*
 * Every sample keeps a real border. Box shadows are removed in forced-colors
 * mode, and the border is what is left to show the edge.
 */
const sample =
  "grid min-h-24 place-items-center rounded-control border border-border-strong p-(--space-3) text-center text-foreground";

const grid =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-(--space-6)";

const Roles = () => (
  <div className="grid gap-(--space-6)">
    <Paragraph tone="muted" size="sm" measure>
      Each elevation role on the surfaces it can sit on, each on the surface it
      pairs with. Switch the theme in the toolbar: the geometry is the same, the
      dark theme uses black at several times the alpha.
    </Paragraph>
    {SURFACES.map(([token, background]) => (
      <section
        key={token}
        aria-label={`On ${token}`}
        className={`${background} grid gap-(--space-4) rounded-control p-(--space-6)`}
      >
        <Paragraph size="sm">
          On <Code>{token}</Code>
        </Paragraph>
        <div className={grid}>
          {SHADOW_ROLES.map((role) => (
            <div
              key={role}
              className={`${sample} ${ROLE_SURFACE[role]} ${SHADOW_CLASS[role]}`}
            >
              <span>
                <Code>{SHADOW_CLASS[role]}</Code>
                <br />
                level {ROLE_LEVEL[role]}
              </span>
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
);

const Bevels = () => (
  <div className="grid gap-(--space-6)">
    <Paragraph tone="muted" size="sm" measure>
      Bevels are inset shadows lit from the top left. They use the{" "}
      <Code>inset-shadow-*</Code> utilities, so a bevel and an elevation role
      stack on one element: the last sample has both.
    </Paragraph>
    <div className={grid}>
      {BEVELS.map((bevel) => (
        <div
          key={bevel}
          className={`${sample} bg-surface-raised-1 ${BEVEL_CLASS[bevel]}`}
        >
          <Code>{BEVEL_CLASS[bevel]}</Code>
        </div>
      ))}
      <div
        className={`${sample} bg-surface-raised-1 shadow-raised-1 inset-shadow-bevel-md`}
        data-testid="composed"
      >
        <span>
          <Code>shadow-raised-1</Code>
          <br />+ <Code>inset-shadow-bevel-md</Code>
        </span>
      </div>
    </div>
  </div>
);

const meta = {
  title: "Foundations/Elevation",
  component: Roles,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The `--elevation-*` roles as `shadow-*` utilities on each surface, and the `--bevel-*` tokens as `inset-shadow-*` utilities. Components use roles, never the numbered levels. See `project-docs/references/ELEVATION.md`.",
      },
    },
  },
} satisfies Meta<typeof Roles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ElevationRoles: Story = { name: "Elevation roles" };

export const BevelsAndComposition: Story = {
  name: "Bevels and composition",
  render: () => <Bevels />,
};
