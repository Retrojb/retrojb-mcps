import type { Metadata } from "next";
import Link from "next/link";
import {
  SUCCESS_CRITERIA,
  TOPICS,
  TOPIC_LABELS,
  queryCriteria,
} from "@retrojb/wcag-a11y-scanner";
import { Callout, Intro, Section, TableFigure } from "../../_components/prose";

export const metadata: Metadata = {
  title: "wcag-a11y-scanner MCP",
  description:
    "An MCP server that gives an AI coding agent WCAG 2 knowledge plus tools to compute contrast ratios and audit markup.",
};

const TOOLS = [
  {
    name: "check_color_contrast",
    purpose:
      "Computes the contrast ratio for a colour pairing and evaluates it against every criterion that applies — 1.4.3 and 1.4.6 for text, 1.4.11 for controls and graphics. Returns a per-criterion verdict plus replacement colours when it fails.",
    inputs:
      "foreground, background, contentType, fontSizePx / fontSizePt, bold, targetLevel",
  },
  {
    name: "suggest_accessible_color",
    purpose:
      "Given a colour, a background, and a target ratio, returns the nearest variants that reach it. Holds hue and saturation constant and moves only lightness, so the result still looks like the original.",
    inputs: "color, background, targetRatio",
  },
  {
    name: "audit_html",
    purpose:
      "Scans a document or fragment and returns findings ordered by severity, each mapped to the criteria it violates with a concrete fix. Findings that need human confirmation are marked rather than presented as proven failures.",
    inputs: "html, topics, minImpact, includeNeedsReview, limit, format",
  },
  {
    name: "explain_wcag_criterion",
    purpose:
      "Returns one criterion in plain language: what it requires, how to meet it, and how it is commonly failed.",
    inputs: "criterion",
  },
  {
    name: "list_wcag_criteria",
    purpose:
      "Lists the covered criteria, filterable by topic, conformance level, and free-text search. Level filtering is cumulative, matching how WCAG conformance works.",
    inputs: "topics, upToLevel, search, detail",
  },
] as const;

export default function ScannerPage(): React.ReactElement {
  return (
    <article>
      <h1>
        <code>wcag-a11y-scanner</code>
      </h1>
      <Intro>
        An MCP server that gives an AI coding agent the WCAG 2 knowledge in
        these pages, plus tools to compute contrast ratios and scan markup. It
        covers colour contrast, screen reader support, and keyboard navigation.
      </Intro>

      <Section id="what-it-does" title="What it does">
        <p>
          The server exposes {TOOLS.length} tools and a set of reference
          resources over the Model Context Protocol, so an agent working in your
          editor can check a colour before writing it, audit a component it just
          generated, or look up the requirement behind a review comment.
        </p>
        <p>
          It knows {SUCCESS_CRITERIA.length} success criteria across{" "}
          {TOPICS.length} areas:
        </p>
        <ul>
          {TOPICS.map((topic) => (
            <li key={topic}>
              <strong>{TOPIC_LABELS[topic]}</strong> —{" "}
              {queryCriteria({ topics: [topic] }).length} criteria
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tools" title="Tools">
        <TableFigure caption="Tools exposed by the server">
          <thead>
            <tr>
              <th scope="col">Tool</th>
              <th scope="col">What it does</th>
              <th scope="col">Inputs</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((tool) => (
              <tr key={tool.name}>
                <th scope="row">
                  <code>{tool.name}</code>
                </th>
                <td>{tool.purpose}</td>
                <td>
                  <code>{tool.inputs}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </TableFigure>
      </Section>

      <Section id="resources" title="Resources">
        <p>
          Alongside the tools, the server publishes reference material an agent
          can pull into context directly:
        </p>
        <ul>
          <li>
            <code>wcag://guide/color-contrast</code>,{" "}
            <code>wcag://guide/screen-reader</code>,{" "}
            <code>wcag://guide/keyboard</code> — every criterion for that area,
            in plain language.
          </li>
          <li>
            <code>wcag://criterion/&#123;id&#125;</code> — one criterion by its
            dotted number, e.g. <code>wcag://criterion/1.4.3</code>.
          </li>
          <li>
            <code>wcag://checklist</code> — the manual passes that cannot be
            automated, ordered cheapest first.
          </li>
        </ul>
      </Section>

      <Section id="setup" title="Setup">
        <p>Build the server, then register it with your MCP host.</p>
        <pre>
          <code>{`npm install
npx turbo build --filter=@retrojb/wcag-a11y-scanner`}</code>
        </pre>
        <p>
          In Kiro, add it to <code>.kiro/settings/mcp.json</code> in the
          workspace, or <code>~/.kiro/settings/mcp.json</code> for every
          project:
        </p>
        <pre>
          <code>{`{
  "mcpServers": {
    "@retrojb/wcag-a11y-scanner": {
      "command": "node",
      "args": [
        "packages/wcag-a11y-scanner/dist/bin.js"
      ],
      "disabled": false
    }
  }
}`}</code>
        </pre>
        <p>
          The same command works for any stdio-based MCP host. To exercise the
          tools without a host, use the inspector:
        </p>
        <pre>
          <code>npm run inspect --workspace @retrojb/wcag-a11y-scanner</code>
        </pre>
      </Section>

      <Section id="limits" title="What it cannot do">
        <p>
          The audit is static analysis of markup. It does not run JavaScript,
          apply stylesheets, or observe focus behaviour, so it sees the initial
          HTML rather than what a user encounters. Three consequences worth
          being explicit about:
        </p>
        <ul>
          <li>
            <strong>Contrast coverage is partial.</strong> Only colours written
            into inline <code>style</code> attributes get measured. Anything
            from a stylesheet, a class, or a custom property needs its computed
            value passed to <code>check_color_contrast</code> by hand.
          </li>
          <li>
            <strong>Keyboard behaviour is inferred, not observed.</strong> Focus
            order, focus visibility, and keyboard traps are runtime properties.
            The rules catch common static causes — positive{" "}
            <code>tabindex</code>, handlers on unfocusable elements, suppressed
            outlines — not the behaviours themselves.
          </li>
          <li>
            <strong>Judgement calls stay with you.</strong> Whether alt text
            describes the right thing, whether a heading summarises its section,
            whether a custom widget behaves as its role promises: none of this
            is machine-decidable.
          </li>
        </ul>

        <Callout label="Findings are graded for a reason" variant="warn">
          <p>
            Every finding carries a <code>needsReview</code> flag. When it is
            set, the rule has found a <em>candidate</em>, not a proven violation
            — vague link text and CSS reordering are the usual examples. Every
            audit result also carries a <code>limitations</code> list, and{" "}
            <code>audit_html</code> reports it even when nothing was flagged,
            because a clean scan is not conformance.
          </p>
        </Callout>
      </Section>

      <Section id="docs-integration" title="These docs use it">
        <p>
          Every contrast ratio and verdict on the{" "}
          <Link href="/wcag/color-contrast">colour and contrast</Link> page is
          computed at build time by this package, and the criterion names and
          levels throughout the site come from its knowledge base. If the
          implementation and the documentation ever disagree, the build shows
          it.
        </p>
      </Section>
    </article>
  );
}
