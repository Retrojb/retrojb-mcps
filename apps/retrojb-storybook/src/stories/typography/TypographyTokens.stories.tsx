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
const cell = {
  padding: "var(--spacing-20) var(--spacing-30)",
  borderBlockEnd: "1px solid var(--border)",
  verticalAlign: "baseline",
};

const readToken = (root: CSSStyleDeclaration, name: string): string =>
  root.getPropertyValue(name).trim() || "—";

/*
 * One row of the scale.
 *
 * The sample is styled with the `--text-<role>` theme variables inline rather
 * than with the `text-<role>` class. `dist/styles.css` only contains the
 * utilities the package's own components use, so a class for a role no
 * component uses yet (`overline`, say) would render unstyled here. The theme
 * variables are emitted for every role, so this shows all of them — and it
 * exercises the `theme.css` mapping the utilities read.
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
      <th
        scope="row"
        style={{ ...cell, textAlign: "start", whiteSpace: "nowrap" }}
      >
        <Code>text-{role}</Code>
      </th>
      <td
        ref={sampleRef}
        style={{
          ...cell,
          fontSize: `var(--text-${role})`,
          lineHeight: `var(--text-${role}--line-height)`,
          fontWeight: `var(--text-${role}--font-weight)`,
          letterSpacing: `var(--text-${role}--letter-spacing)`,
          textTransform: role === "overline" ? "uppercase" : undefined,
          fontFamily: role === "code" ? "var(--font-mono)" : undefined,
        }}
      >
        The quick brown fox
      </td>
      <td style={cell}>
        {values?.size} ({values?.computedSize})
      </td>
      <td style={cell}>
        {values?.lineHeight} ({values?.computedLineHeight})
      </td>
      <td style={cell}>{values?.weight}</td>
      <td style={cell}>{values?.tracking}</td>
    </tr>
  );
};

const TypeScale = () => (
  <div style={{ display: "grid", gap: "var(--spacing-40)" }}>
    <Paragraph tone="muted" size="sm" measure>
      Every semantic type role in <Code>tokens.css</Code>, in order. Values are
      read from the page: the token&apos;s resolved value, then in brackets the
      px the browser computed at the current root font size. Raise the
      browser&apos;s default font size and the px column grows with it — every
      size is rem (or em, for code).
    </Paragraph>
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          color: "var(--foreground)",
        }}
      >
        <caption
          style={{
            textAlign: "start",
            fontWeight: 600,
            paddingBlockEnd: "var(--spacing-20)",
          }}
        >
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
              <th
                key={heading}
                scope="col"
                style={{ ...cell, textAlign: "start" }}
              >
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
