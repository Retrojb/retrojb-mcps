import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { auditHtml, formatAuditReport } from "./audit/index.js";
import { checkContrast, suggestForeground } from "./color/contrast.js";
import { flattenOver, parseColor, toHex } from "./color/parse.js";
import {
  getCriterion,
  knownCriterionIds,
  queryCriteria,
  SUCCESS_CRITERIA,
} from "./wcag/criteria.js";
import {
  TOPIC_LABELS,
  TOPICS,
  type SuccessCriterion,
  type Topic,
} from "./wcag/types.js";

// The identity advertised over MCP. Deliberately unscoped and independent of the
// npm package name: clients reference this string in their own configuration.
export const SERVER_NAME = "wcag-a11y-scanner";
export const SERVER_VERSION = "0.1.0";

// -----------------------------------------------------------------------------
// Shared schema fragments
// -----------------------------------------------------------------------------

const topicSchema = z
  .enum(["color-contrast", "screen-reader", "keyboard"])
  .describe(
    "color-contrast: colour and contrast criteria. screen-reader: text alternatives, semantics, names and roles. keyboard: focus order, operability, and tab navigation.",
  );

const levelSchema = z
  .enum(["A", "AA", "AAA"])
  .describe(
    "WCAG conformance level. AA is the usual legal and contractual target.",
  );

const colorSchema = z
  .string()
  .min(1)
  .describe(
    'A CSS colour: hex (#fff, #ffffff, #ffffffcc), rgb()/rgba(), hsl()/hsla(), a named colour ("rebeccapurple"), or "transparent". Wide-gamut notations such as oklch() and unresolved var() references are not supported.',
  );

// -----------------------------------------------------------------------------
// Formatting helpers
// -----------------------------------------------------------------------------

function text(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}

/** Renders one criterion as Markdown. */
function renderCriterion(criterion: SuccessCriterion): string {
  const lines = [
    `## ${criterion.id} ${criterion.name} (Level ${criterion.level})`,
    "",
    `- Principle: ${criterion.principle} / ${criterion.guideline}`,
    `- Introduced in WCAG ${criterion.addedIn}`,
    `- Topics: ${criterion.topics.map((topic) => TOPIC_LABELS[topic]).join(", ")}`,
    `- Automated testability: ${criterion.testability}`,
    `- Reference: ${criterion.understandingUrl}`,
    "",
    `### In plain language`,
    criterion.plainLanguage,
    "",
    `### The requirement`,
    criterion.requirement,
    "",
    `### How to meet it`,
    ...criterion.howToMeet.map((item) => `- ${item}`),
    "",
    `### Common failures`,
    ...criterion.commonFailures.map((item) => `- ${item}`),
  ];

  return lines.join("\n");
}

/** Renders a topic overview: every criterion this server covers for it. */
function renderTopicGuide(topic: Topic): string {
  const criteria = queryCriteria({ topics: [topic] });

  const intro: Record<Topic, string> = {
    "color-contrast":
      "Contrast is a ratio between the relative luminance of two colours, from 1:1 (identical) to 21:1 (black on white). WCAG sets different floors depending on how large the text is and whether the thing being measured is text at all.",
    "screen-reader":
      "A screen reader reads the accessibility tree, not the screen. Anything conveyed only by visual styling — a bold div that looks like a heading, a red border that means error — does not exist for it. The work is making structure and naming explicit in markup.",
    keyboard:
      "Keyboard access is the substrate almost every other assistive technology sits on: screen readers, switch access, and voice control all drive the page through the same focus model. If the keyboard cannot reach something, nothing else can either.",
  };

  const lines = [
    `# ${TOPIC_LABELS[topic]}`,
    "",
    intro[topic],
    "",
    `Covers ${criteria.length} success criteria.`,
    "",
    "| Criterion | Name | Level | Testable by machine |",
    "| --- | --- | --- | --- |",
    ...criteria.map(
      (criterion) =>
        `| ${criterion.id} | ${criterion.name} | ${criterion.level} | ${criterion.testability} |`,
    ),
    "",
  ];

  for (const criterion of criteria) {
    lines.push(renderCriterion(criterion), "");
  }

  return lines.join("\n");
}

// -----------------------------------------------------------------------------
// Server factory
// -----------------------------------------------------------------------------

/**
 * Builds a fully configured server instance.
 *
 * Exported as a factory rather than a singleton because the transport entry
 * points construct one instance per connection.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Applies WCAG 2.2 for colour contrast, screen reader support, and keyboard/tab navigation. " +
        "Use check_color_contrast for any colour pairing decision, audit_html to scan markup, and " +
        "explain_wcag_criterion when you need the requirement behind a finding. " +
        "Static analysis cannot decide WCAG conformance on its own: treat findings marked needsReview " +
        "as leads for a human, and always report the limitations alongside the results.",
    },
  );

  registerContrastTools(server);
  registerAuditTool(server);
  registerGuidelineTools(server);
  registerResources(server);

  return server;
}

// -----------------------------------------------------------------------------
// Colour tools
// -----------------------------------------------------------------------------

function registerContrastTools(server: McpServer): void {
  server.registerTool(
    "check_color_contrast",
    {
      title: "Check colour contrast against WCAG",
      description:
        "Computes the WCAG contrast ratio between a foreground and background colour and evaluates it against the criteria that apply. " +
        "For text, that is 1.4.3 (AA) and 1.4.6 (AAA), with the threshold depending on font size and weight. " +
        "For borders, icons, focus rings, and chart strokes, pass contentType 'ui-component' or 'graphical-object' to evaluate against 1.4.11 (AA, 3:1). " +
        "Returns a pass/fail per criterion plus replacement colours when it fails.",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
      inputSchema: z.object({
        foreground: colorSchema.describe(
          "The text or graphic colour. Translucent values are composited over the background before measuring.",
        ),
        background: colorSchema.describe(
          "The colour directly behind the foreground. WCAG assumes white when a background is unknown.",
        ),
        contentType: z
          .enum(["text", "ui-component", "graphical-object"])
          .default("text")
          .describe(
            "text: any glyphs, governed by 1.4.3/1.4.6. ui-component: a control's border or state indicator, governed by 1.4.11. graphical-object: part of a graphic needed to understand the content, also 1.4.11.",
          ),
        fontSizePx: z
          .number()
          .positive()
          .optional()
          .describe(
            "Font size in CSS pixels. Only used when contentType is 'text'. Omit and normal-size text is assumed, which is the stricter threshold.",
          ),
        fontSizePt: z
          .number()
          .positive()
          .optional()
          .describe("Font size in points, as an alternative to fontSizePx."),
        bold: z
          .boolean()
          .default(false)
          .describe(
            "Whether the text renders at weight 700 or heavier. Bold text qualifies as large from 14pt (about 18.66px) instead of 18pt (24px).",
          ),
        targetLevel: levelSchema
          .default("AA")
          .describe("The level to report an overall verdict against."),
      }),
      outputSchema: z.object({
        ratio: z.number(),
        passesTarget: z.boolean(),
        summary: z.string(),
        foregroundHex: z.string(),
        backgroundHex: z.string(),
        textSizeClass: z.string().nullable(),
        results: z.array(
          z.object({
            criterion: z.string(),
            name: z.string(),
            level: z.string(),
            requiredRatio: z.number(),
            passes: z.boolean(),
            shortfall: z.number(),
          }),
        ),
        suggestions: z.array(
          z.object({
            hex: z.string(),
            ratio: z.number(),
            direction: z.string(),
            note: z.string(),
          }),
        ),
        notes: z.array(z.string()),
      }),
    },
    ({
      foreground,
      background,
      contentType,
      fontSizePx,
      fontSizePt,
      bold,
      targetLevel,
    }) => {
      const result = checkContrast({
        foreground,
        background,
        contentType,
        targetLevel,
        text: { fontSizePx, fontSizePt, bold },
      });

      const lines = [
        `# Contrast: ${result.foreground.hex} on ${result.background.hex}`,
        "",
        `**${result.ratio}:1** — ${result.passesTarget ? `passes level ${targetLevel}` : `fails level ${targetLevel}`}`,
        "",
        result.summary,
        "",
        "| Criterion | Level | Required | Result |",
        "| --- | --- | --- | --- |",
        ...result.results.map(
          (entry) =>
            `| ${entry.criterion} ${entry.name} | ${entry.level} | ${entry.requiredRatio}:1 | ${entry.passes ? "pass" : `fail, short by ${entry.shortfall}`} |`,
        ),
      ];

      if (result.suggestions.length > 0) {
        lines.push(
          "",
          `## Colours that would meet level ${targetLevel}`,
          ...result.suggestions.map(
            (suggestion) => `- \`${suggestion.hex}\` — ${suggestion.note}`,
          ),
          "",
          "These hold hue and saturation and move only lightness, so they stay close to the original. Changing the background instead is often the better call.",
        );
      }

      if (result.notes.length > 0) {
        lines.push("", "## Notes", ...result.notes.map((note) => `- ${note}`));
      }

      return {
        ...text(lines.join("\n")),
        structuredContent: {
          ratio: result.ratio,
          passesTarget: result.passesTarget,
          summary: result.summary,
          foregroundHex: result.foreground.hex,
          backgroundHex: result.background.hex,
          textSizeClass: result.textSize?.classification ?? null,
          results: result.results.map((entry) => ({
            criterion: entry.criterion,
            name: entry.name,
            level: entry.level,
            requiredRatio: entry.requiredRatio,
            passes: entry.passes,
            shortfall: entry.shortfall,
          })),
          suggestions: result.suggestions.map((suggestion) => ({
            hex: suggestion.hex,
            ratio: suggestion.ratio,
            direction: suggestion.direction,
            note: suggestion.note,
          })),
          notes: [...result.notes],
        },
      };
    },
  );

  server.registerTool(
    "suggest_accessible_color",
    {
      title: "Adjust a colour to reach a contrast target",
      description:
        "Given a colour and the background it sits on, returns the nearest variants that reach a target contrast ratio. " +
        "Holds hue and saturation constant and moves only lightness, so the result stays recognisably the same colour. " +
        "Use this when check_color_contrast reports a failure and you need a concrete replacement.",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
      inputSchema: z.object({
        color: colorSchema.describe("The colour to adjust."),
        background: colorSchema.describe("The colour it sits on."),
        targetRatio: z
          .number()
          .min(1)
          .max(21)
          .default(4.5)
          .describe(
            "Contrast ratio to reach. 4.5 for normal text at AA, 3 for large text or UI components, 7 for normal text at AAA.",
          ),
      }),
    },
    ({ color, background, targetRatio }) => {
      const white = { r: 255, g: 255, b: 255, a: 1 };
      const bg = flattenOver(parseColor(background), white);
      const fg = flattenOver(parseColor(color), bg);

      const current = checkContrast({ foreground: color, background });
      const suggestions = suggestForeground({
        foreground: fg,
        background: bg,
        targetRatio,
      });

      const lines = [
        `# Reaching ${targetRatio}:1 against ${toHex(bg)}`,
        "",
        `\`${toHex(fg)}\` currently gives ${current.ratio}:1.`,
        "",
      ];

      if (current.ratio >= targetRatio) {
        lines.push(
          `It already meets ${targetRatio}:1, so no change is needed.`,
        );
      } else if (suggestions.length === 0) {
        lines.push(
          `No variant of this hue reaches ${targetRatio}:1 against ${toHex(bg)} by lightness alone.`,
          "",
          "Change the background instead, reduce the saturation before adjusting lightness, or pick a different hue. Highly saturated yellows, cyans, and oranges cannot reach high ratios against white at any lightness.",
        );
      } else {
        lines.push(
          ...suggestions.map(
            (suggestion) =>
              `- \`${suggestion.hex}\` (${suggestion.ratio}:1) — ${suggestion.note}`,
          ),
          "",
          "Nearest to the original first. Check the result in context: a colour that passes on white may fail on your surface colour.",
        );
      }

      return text(lines.join("\n"));
    },
  );
}

// -----------------------------------------------------------------------------
// Audit tool
// -----------------------------------------------------------------------------

function registerAuditTool(server: McpServer): void {
  server.registerTool(
    "audit_html",
    {
      title: "Audit HTML against WCAG 2",
      description:
        "Scans an HTML document or fragment for WCAG 2 problems across three areas: screen reader support (text alternatives, semantics, accessible names), " +
        "keyboard and tab navigation (focus order, operability, focus visibility), and colour contrast (inline style declarations only). " +
        "Returns findings ordered by severity, each mapped to the success criteria it violates, with a fix. " +
        "Findings marked needsReview are candidates a human must confirm, not proven violations. " +
        "This is static analysis: it does not run JavaScript or apply stylesheets, so a clean result is not conformance.",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
      inputSchema: z.object({
        html: z
          .string()
          .min(1)
          .describe(
            "The markup to audit. A full document enables page-level rules (lang, title, landmarks, skip links); a fragment skips them.",
          ),
        topics: z
          .array(topicSchema)
          .optional()
          .describe(
            "Restrict the audit to these areas. Defaults to all three.",
          ),
        minImpact: z
          .enum(["critical", "serious", "moderate", "minor", "info"])
          .default("info")
          .describe("Drop findings less severe than this."),
        includeNeedsReview: z
          .boolean()
          .default(true)
          .describe(
            "Include findings that need human confirmation. Turning this off makes the audit look more conclusive than it is.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(500)
          .default(100)
          .describe("Maximum findings to return, after sorting by severity."),
        format: z
          .enum(["markdown", "json"])
          .default("markdown")
          .describe(
            "markdown for a readable report, json for the raw finding objects.",
          ),
      }),
    },
    ({ html, topics, minImpact, includeNeedsReview, limit, format }) => {
      const result = auditHtml(html, {
        topics,
        minImpact,
        includeNeedsReview,
        limit,
      });

      if (format === "json") {
        return text(JSON.stringify(result, null, 2));
      }

      return text(formatAuditReport(result));
    },
  );
}

// -----------------------------------------------------------------------------
// Guideline reference tools
// -----------------------------------------------------------------------------

function registerGuidelineTools(server: McpServer): void {
  server.registerTool(
    "explain_wcag_criterion",
    {
      title: "Explain a WCAG success criterion",
      description:
        "Returns a plain-language explanation of a WCAG 2 success criterion: what it requires, how to meet it, and how it is commonly failed. " +
        "Covers the criteria relevant to colour contrast, screen reader support, and keyboard navigation.",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
      inputSchema: z.object({
        criterion: z
          .string()
          .min(1)
          .describe('A dotted criterion number, e.g. "1.4.3" or "2.4.7".'),
      }),
    },
    ({ criterion }) => {
      const normalised = criterion.trim().replace(/^(wcag\s*)?/i, "");
      const found = getCriterion(normalised);

      if (!found) {
        return {
          ...text(
            `This server does not cover criterion "${criterion}". It focuses on colour contrast, screen reader support, and keyboard navigation.\n\n` +
              `Available: ${knownCriterionIds().join(", ")}.\n\n` +
              `For anything outside that set, see https://www.w3.org/TR/WCAG22/.`,
          ),
          isError: true,
        };
      }

      return text(renderCriterion(found));
    },
  );

  server.registerTool(
    "list_wcag_criteria",
    {
      title: "List WCAG criteria by topic or level",
      description:
        "Lists the WCAG 2 success criteria this server covers, filterable by topic, conformance level, and free-text search. " +
        "Use it to scope an accessibility review, or to find which criterion governs a specific concern.",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
      inputSchema: z.object({
        topics: z
          .array(topicSchema)
          .optional()
          .describe("Restrict to these topics. Defaults to all."),
        upToLevel: levelSchema
          .optional()
          .describe(
            "Include this level and everything below it, matching how WCAG conformance is cumulative: AA returns both A and AA criteria.",
          ),
        search: z
          .string()
          .optional()
          .describe(
            'Case-insensitive text match across names, requirements, and failure examples, e.g. "focus" or "alt text".',
          ),
        detail: z
          .enum(["summary", "full"])
          .default("summary")
          .describe(
            "summary for a table, full for the complete explanation of every match.",
          ),
      }),
    },
    ({ topics, upToLevel, search, detail }) => {
      const matches = queryCriteria({ topics, upToLevel, search });

      if (matches.length === 0) {
        return text(
          `No criteria matched. This server covers ${SUCCESS_CRITERIA.length} criteria across ${TOPICS.length} topics; try a broader filter.`,
        );
      }

      const filterNote = [
        topics && topics.length > 0
          ? `topics: ${topics.map((topic) => TOPIC_LABELS[topic]).join(", ")}`
          : undefined,
        upToLevel ? `up to level ${upToLevel}` : undefined,
        search ? `matching "${search}"` : undefined,
      ]
        .filter((part): part is string => part !== undefined)
        .join("; ");

      const lines = [
        `# WCAG criteria${filterNote ? ` (${filterNote})` : ""}`,
        "",
        `${matches.length} of ${SUCCESS_CRITERIA.length} covered criteria.`,
        "",
        "| Criterion | Name | Level | Topics | In plain language |",
        "| --- | --- | --- | --- | --- |",
        ...matches.map(
          (criterion) =>
            `| ${criterion.id} | ${criterion.name} | ${criterion.level} | ${criterion.topics.join(", ")} | ${criterion.plainLanguage.replace(/\n/g, " ")} |`,
        ),
      ];

      if (detail === "full") {
        lines.push("");
        for (const criterion of matches) {
          lines.push(renderCriterion(criterion), "");
        }
      }

      return text(lines.join("\n"));
    },
  );
}

// -----------------------------------------------------------------------------
// Resources
// -----------------------------------------------------------------------------

function registerResources(server: McpServer): void {
  for (const topic of TOPICS) {
    server.registerResource(
      `wcag-guide-${topic}`,
      `wcag://guide/${topic}`,
      {
        title: `WCAG 2 guide: ${TOPIC_LABELS[topic]}`,
        description: `Every success criterion this server covers for ${TOPIC_LABELS[topic].toLowerCase()}, in plain language, with how to meet it and how it is commonly failed.`,
        mimeType: "text/markdown",
      },
      (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: renderTopicGuide(topic),
          },
        ],
      }),
    );
  }

  server.registerResource(
    "wcag-criterion",
    new ResourceTemplate("wcag://criterion/{id}", {
      list: () => ({
        resources: SUCCESS_CRITERIA.map((criterion) => ({
          uri: `wcag://criterion/${criterion.id}`,
          name: `${criterion.id} ${criterion.name} (Level ${criterion.level})`,
          mimeType: "text/markdown",
        })),
      }),
    }),
    {
      title: "WCAG success criterion",
      description:
        "One success criterion in plain language, addressed by its dotted number, e.g. wcag://criterion/1.4.3.",
      mimeType: "text/markdown",
    },
    (uri, variables) => {
      const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
      const criterion = id === undefined ? undefined : getCriterion(String(id));

      if (!criterion) {
        throw new Error(
          `${uri.href} does not name a criterion this server covers. Available: ${knownCriterionIds().join(", ")}.`,
        );
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: renderCriterion(criterion),
          },
        ],
      };
    },
  );

  server.registerResource(
    "wcag-checklist",
    "wcag://checklist",
    {
      title: "Manual accessibility checklist",
      description:
        "The checks that cannot be automated, in the order they are quickest to run. Pairs with audit_html, which covers the machine-decidable subset.",
      mimeType: "text/markdown",
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: MANUAL_CHECKLIST,
        },
      ],
    }),
  );
}

const MANUAL_CHECKLIST = `# Manual accessibility checklist

Automated rules catch a minority of WCAG failures. These are the passes that
find the rest, ordered so the cheapest come first.

## 1. Unplug the mouse (5 minutes)

- Tab from the top of the page to the bottom. Can you reach every control?
- Is the focus indicator visible at every stop, on every background? (2.4.7)
- Does focus order match the visual order? (2.4.3)
- Is anything focused ever hidden behind a sticky header or banner? (2.4.11)
- Open every menu, dialog, and popover. Does Escape close it? Does focus return
  to the trigger? (2.1.2)
- Activate everything with Enter and Space. Anything that only responds to a
  click is a 2.1.1 failure.
- Tab past the header: is there a skip link, and does it work? (2.4.1)

## 2. Turn off CSS (2 minutes)

- Does the content still read in a sensible order? (1.3.2)
- Do headings form a coherent outline, with nothing skipped? (1.3.1)
- Are lists, tables, and form labels still recognisable as such? (1.3.1)

## 3. Greyscale the page (2 minutes)

- Is any information now lost? Error states, required fields, chart series,
  status indicators, and links in body copy are the usual casualties. (1.4.1)

## 4. Zoom to 200% and 400% (5 minutes)

- Does content reflow without horizontal scrolling? (1.4.10)
- Does anything overlap, clip, or become unreachable?

## 5. Listen to it (15 minutes)

Use VoiceOver (macOS, Cmd+F5), NVDA (Windows, free), or JAWS.

- Read the page top to bottom. Is anything announced that should be silent —
  decorative images, duplicated icon labels? (1.1.1)
- Pull up the headings list. Does it work as a table of contents? (2.4.6)
- Pull up the links list. Is every entry meaningful out of context? (2.4.4)
- Tab through the form. Is every field's purpose and requirement announced
  before you type? (3.3.2, 4.1.2)
- Submit the form with errors. Is the error announced without moving focus?
  (3.3.1, 4.1.3)
- Trigger a status change — add to cart, filter results. Is it announced?
  (4.1.3)

## 6. Judgement calls no tool can make

- Does each alt text convey what the image *does* in context, rather than what
  it looks like? The same photo needs different alt text in different places.
  (1.1.1)
- Does each heading and label actually describe its content? (2.4.6)
- Is the contrast on text over images acceptable at the worst-case pixel, not
  just on average? (1.4.3)
- Do custom widgets behave the way their ARIA role promises? A role="tab" that
  does not respond to arrow keys is worse than no role at all. (4.1.2)
`;
