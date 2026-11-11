import { Code, Paragraph, TYPE_ROLES, type TypeRole } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

/** What a role resolves to: the token values and what the browser computed. */
interface IRoleValues {
  readonly size: string;
  readonly lineHeight: string;
  readonly weight: string;
  readonly tracking: string;
  readonly computedSize: string;
  readonly computedLineHeight: string;
}

/*
 * `--border` is decorative here, as in `Table`'s row separators: the rows are
 * identified by their header cells, not by the lines between them.
 */
const cell =
  "border-b border-border px-(--space-3) py-(--space-2) align-baseline";

/*
 * The utility for each role, written out so Tailwind finds every one in the
 * source: a class built from the role name (`text-${role}`) would compile to
 * nothing in this preview's build. `satisfies` makes a role added to
 * `TYPE_ROLES` without a class here a type error.
 */
const ROLE_CLASS = {
  display: "text-display",
  "heading-xl": "text-heading-xl",
  "heading-lg": "text-heading-lg",
  "heading-md": "text-heading-md",
  "heading-sm": "text-heading-sm",
  "heading-xs": "text-heading-xs",
  "title-md": "text-title-md",
  "title-sm": "text-title-sm",
  "body-lg": "text-body-lg",
  "body-md": "text-body-md",
  "body-sm": "text-body-sm",
  "label-lg": "text-label-lg",
  "label-md": "text-label-md",
  "label-sm": "text-label-sm",
  caption: "text-caption",
  overline: "text-overline",
  code: "text-code",
} as const satisfies Record<TypeRole, `text-${TypeRole}`>;

const readToken = (root: CSSStyleDeclaration, name: string): string =>
  root.getPropertyValue(name).trim() || "—";

/*
 * One row of the scale.
 *
 * The sample uses the role's own `text-<role>` utility, so this page tests the
 * class an app would write. `overline` adds `uppercase`, which is
 * presentation rather than part of the role, and `code` adds the mono face.
 *
 * The token columns are read back from the page, not restated: the custom
 * properties' computed values, with every `var()` resolved, and the sample's
 * computed `font-size` and `line-height` in px. Retune a token and the table
 * follows.
 */
const RoleRow = ({ role }: { readonly role: TypeRole }) => {
  const sampleRef = useRef<HTMLTableCellElement>(null);
  const [values, setValues] = useState<IRoleValues | null>(null);

  useEffect(() => {
    const sample = sampleRef.current;
    if (sample == null) return;
    const root = getComputedStyle(document.documentElement);
    const computed = getComputedStyle(sample);
    setValues({
      size: readToken(root, `--type-${role}-size`),
      lineHeight: readToken(root, `--type-${role}-line-height`),
      weight: readToken(root, `--type-${role}-weight`),
      tracking: readToken(root, `--type-${role}-tracking`),
      computedSize: computed.fontSize,
      computedLineHeight: computed.lineHeight,
    });
  }, [role]);

  return (
    <tr>
      <th scope="row" className={`${cell} text-start whitespace-nowrap`}>
        <Code>text-{role}</Code>
      </th>
      <td
        ref={sampleRef}
        className={[
          cell,
          ROLE_CLASS[role],
          role === "overline" ? "uppercase" : "",
          role === "code" ? "font-mono" : "",
        ].join(" ")}
      >
        The quick brown fox
      </td>
      <td className={cell}>
        {values?.size} ({values?.computedSize})
      </td>
      <td className={cell}>
        {values?.lineHeight} ({values?.computedLineHeight})
      </td>
      <td className={cell}>{values?.weight}</td>
      <td className={cell}>{values?.tracking}</td>
    </tr>
  );
};

const TypeScale = () => (
  <div className="grid gap-(--space-4)">
    <Paragraph tone="muted" size="sm" measure>
      Every semantic type role in <Code>@retrojb/tokens</Code>, in order. Values
      are read from the page: the token&apos;s resolved value, then in brackets
      the px the browser computed at the current root font size. Raise the
      browser&apos;s default font size and the px column grows with it — every
      size is rem (or em, for code).
    </Paragraph>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-foreground">
        <caption className="pb-(--space-2) text-start font-semibold">
          Type roles
        </caption>
        <thead>
          <tr>
            {[
              "Role",
              "Sample",
              "Size",
              "Line height",
              "Weight",
              "Tracking",
            ].map((heading) => (
              <th key={heading} scope="col" className={`${cell} text-start`}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TYPE_ROLES.map((role) => (
            <RoleRow key={role} role={role} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const meta = {
  title: "Typography/Tokens",
  component: TypeScale,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The type scale: every `--type-<role>-*` token, rendered with the `--text-<role>` theme variables that back the `text-<role>` utilities.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TypeScale>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The whole scale, display down to code. `code` renders at `0.9em` of the
 * table cell, which is why its px value is relative to its context rather than
 * to the root.
 */
export const Scale: Story = {};
