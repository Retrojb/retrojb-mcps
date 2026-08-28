import { expandCriteria } from "../wcag/criteria.js";
import {
  IMPACT_ORDER,
  TOPICS,
  type ConformanceLevel,
  type Finding,
  type Impact,
  type Topic,
} from "../wcag/types.js";
import { parseDocument } from "./dom.js";
import {
  auditInlineContrast,
  colorContrastCaveats,
} from "./inline-contrast.js";
import { auditKeyboard } from "./keyboard.js";
import { auditScreenReader } from "./screen-reader.js";

export interface AuditOptions {
  /** Which topics to run. Defaults to all three. */
  readonly topics?: readonly Topic[] | undefined;
  /**
   * Drop findings below this severity. Defaults to `"info"` (keep everything).
   */
  readonly minImpact?: Impact | undefined;
  /**
   * Include findings that need human confirmation. Defaults to `true`, because
   * hiding them makes an audit look more conclusive than it is.
   */
  readonly includeNeedsReview?: boolean | undefined;
  /** Cap on returned findings, applied after sorting. Defaults to 100. */
  readonly limit?: number | undefined;
}

export interface AuditSummary {
  readonly totalFindings: number;
  readonly byImpact: Record<Impact, number>;
  readonly byTopic: Record<Topic, number>;
  /** Count of findings a human still has to confirm. */
  readonly needsReview: number;
  /** Criteria touched by at least one finding, with names and levels. */
  readonly criteriaAffected: readonly {
    readonly id: string;
    readonly name: string;
    readonly level: ConformanceLevel;
  }[];
  /** `true` when nothing at all was flagged, including review items. */
  readonly clean: boolean;
}

export interface AuditResult {
  readonly summary: AuditSummary;
  readonly findings: readonly Finding[];
  /** How many findings were dropped by `limit`. */
  readonly truncated: number;
  /** What this audit could not determine. Always populated. */
  readonly limitations: readonly string[];
}

const IMPACT_RANK: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
  info: 4,
};

/**
 * Limitations that hold for any static audit, stated up front.
 *
 * WCAG conformance is not fully machine-decidable — a substantial share of the
 * criteria turn on whether a text alternative is *accurate*, whether a heading
 * *describes* its section, or how focus behaves at runtime. Reporting zero
 * findings without saying this would misrepresent the result.
 */
const UNIVERSAL_LIMITATIONS: readonly string[] = [
  "This is a static analysis of markup. It cannot execute JavaScript, apply stylesheets, or observe focus behaviour, so it sees the initial HTML rather than what a user encounters.",
  "A clean result is not conformance. Whether alt text is accurate, whether a heading describes its section, and whether the reading order makes sense are all judgement calls a machine cannot make.",
  "Confirm findings with a real screen reader (VoiceOver, NVDA, or JAWS), a full keyboard-only pass, and 200% zoom.",
];

const TOPIC_LIMITATIONS: Record<Topic, readonly string[]> = {
  "color-contrast": [
    "Only colours written into inline style attributes were measured. Anything from a stylesheet, a class, or a custom property needs its computed value checked with check_color_contrast.",
    "Hover, focus, visited, and disabled states are not represented in static markup and must be checked separately.",
  ],
  "screen-reader": [
    "Accessible names are computed from a pragmatic subset of HTML-AAM. Names that depend on CSS generated content or on live DOM updates are out of reach.",
    "Live regions (4.1.3) can only be verified by triggering the update and listening.",
  ],
  keyboard: [
    "Focus order, focus visibility, and keyboard traps are runtime properties. The rules here catch common static causes, not the behaviours themselves.",
    "Target size (2.5.8) and focus obscuring (2.4.11) depend on layout, so they need a rendered page at a real viewport.",
  ],
};

/**
 * Runs the requested audits over an HTML string.
 *
 * @param html - a full document or a fragment. Document-level rules (`lang`,
 *   `<title>`, landmarks, skip links) only fire when the input looks like a full
 *   document, so auditing a component does not produce noise about missing page
 *   structure.
 */
export function auditHtml(
  html: string,
  options: AuditOptions = {},
): AuditResult {
  const topics =
    options.topics && options.topics.length > 0 ? options.topics : TOPICS;
  const minImpact = options.minImpact ?? "info";
  const includeNeedsReview = options.includeNeedsReview ?? true;
  const limit = options.limit ?? 100;

  const root = parseDocument(html);

  const collected: Finding[] = [];
  if (topics.includes("screen-reader"))
    collected.push(...auditScreenReader(root));
  if (topics.includes("keyboard")) collected.push(...auditKeyboard(root));
  if (topics.includes("color-contrast")) {
    collected.push(...auditInlineContrast(root));
    collected.push(...colorContrastCaveats(root));
  }

  const filtered = collected
    .filter((item) => IMPACT_RANK[item.impact] <= IMPACT_RANK[minImpact])
    .filter((item) => includeNeedsReview || !item.needsReview);

  const sorted = filtered.sort((a, b) => {
    const byImpact = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
    if (byImpact !== 0) return byImpact;
    // Certainties before judgement calls at the same severity.
    if (a.needsReview !== b.needsReview) return a.needsReview ? 1 : -1;
    return a.rule.localeCompare(b.rule);
  });

  const findings = sorted.slice(0, limit);

  const limitations = [
    ...UNIVERSAL_LIMITATIONS,
    ...topics.flatMap((topic) => TOPIC_LIMITATIONS[topic]),
  ];

  return {
    summary: summarise(sorted, topics),
    findings,
    truncated: Math.max(0, sorted.length - findings.length),
    limitations,
  };
}

function summarise(
  findings: readonly Finding[],
  topics: readonly Topic[],
): AuditSummary {
  const byImpact = Object.fromEntries(
    IMPACT_ORDER.map((impact) => [impact, 0]),
  ) as Record<Impact, number>;

  const byTopic = Object.fromEntries(
    TOPICS.map((topic) => [topic, 0]),
  ) as Record<Topic, number>;

  const criteria: string[] = [];

  for (const item of findings) {
    byImpact[item.impact] += 1;
    byTopic[item.topic] += 1;
    criteria.push(...item.criteria);
  }

  // Report only the topics that were actually run.
  for (const topic of TOPICS) {
    if (!topics.includes(topic)) delete byTopic[topic];
  }

  return {
    totalFindings: findings.length,
    byImpact,
    byTopic,
    needsReview: findings.filter((item) => item.needsReview).length,
    criteriaAffected: expandCriteria(criteria).sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    ),
    clean: findings.length === 0,
  };
}

/** Renders an audit result as Markdown for a human (or a model) to read. */
export function formatAuditReport(result: AuditResult): string {
  const { summary, findings, truncated, limitations } = result;
  const lines: string[] = [];

  lines.push("# WCAG audit");
  lines.push("");

  if (summary.clean) {
    lines.push(
      "No issues were flagged by the static rules that ran. That is not the same as conformance — see Limitations below.",
    );
  } else {
    const counts = IMPACT_ORDER.filter((impact) => summary.byImpact[impact] > 0)
      .map((impact) => `${summary.byImpact[impact]} ${impact}`)
      .join(", ");

    lines.push(
      `${summary.totalFindings} finding(s): ${counts}. ${summary.needsReview} need${summary.needsReview === 1 ? "s" : ""} human confirmation.`,
    );

    if (summary.criteriaAffected.length > 0) {
      lines.push("");
      lines.push(
        `Criteria affected: ${summary.criteriaAffected.map((criterion) => `${criterion.id} ${criterion.name} (${criterion.level})`).join("; ")}.`,
      );
    }
  }

  const grouped = new Map<Topic, Finding[]>();
  for (const item of findings) {
    const bucket = grouped.get(item.topic) ?? [];
    bucket.push(item);
    grouped.set(item.topic, bucket);
  }

  for (const [topic, items] of grouped) {
    lines.push("");
    lines.push(`## ${topic}`);

    for (const item of items) {
      lines.push("");
      lines.push(
        `### ${item.impact.toUpperCase()}${item.needsReview ? " (needs review)" : ""} — ${item.rule}`,
      );
      lines.push(`- WCAG: ${item.criteria.join(", ")}`);
      if (item.selector) lines.push(`- Where: \`${item.selector}\``);
      lines.push(`- Problem: ${item.message}`);
      lines.push(`- Fix: ${item.remediation}`);
      if (item.snippet) {
        lines.push("");
        lines.push("```html");
        lines.push(item.snippet);
        lines.push("```");
      }
    }
  }

  if (truncated > 0) {
    lines.push("");
    lines.push(
      `_${truncated} further finding(s) omitted by the result limit._`,
    );
  }

  lines.push("");
  lines.push("## Limitations");
  for (const limitation of limitations) lines.push(`- ${limitation}`);

  return lines.join("\n");
}

export { parseDocument } from "./dom.js";
