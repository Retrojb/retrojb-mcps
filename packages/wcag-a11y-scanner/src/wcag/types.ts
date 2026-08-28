/**
 * Shared vocabulary for the WCAG 2 model used across this server.
 *
 * Terminology follows WCAG 2.2 (W3C Recommendation):
 * https://www.w3.org/TR/WCAG22/
 */

/** WCAG conformance levels, lowest to highest. */
export type ConformanceLevel = "A" | "AA" | "AAA";

/** The WCAG 2.x dot-release that introduced a success criterion. */
export type WcagVersion = "2.0" | "2.1" | "2.2";

/** The four WCAG principles (POUR). */
export type Principle =
  "Perceivable" | "Operable" | "Understandable" | "Robust";

/**
 * The three focus areas this server covers. These are not WCAG constructs —
 * they are practical groupings that map onto how teams actually divide
 * accessibility work.
 */
export type Topic = "color-contrast" | "screen-reader" | "keyboard";

export const TOPICS: readonly Topic[] = [
  "color-contrast",
  "screen-reader",
  "keyboard",
];

export const CONFORMANCE_LEVELS: readonly ConformanceLevel[] = [
  "A",
  "AA",
  "AAA",
];

/** Human-readable labels for each topic. */
export const TOPIC_LABELS: Record<Topic, string> = {
  "color-contrast": "Color and contrast",
  "screen-reader": "Screen reader support",
  keyboard: "Keyboard and tab navigation",
};

/**
 * One WCAG success criterion, restated in plain language alongside the
 * normative requirement it stands in for.
 */
export interface SuccessCriterion {
  /** Dotted criterion number, e.g. `"1.4.3"`. */
  readonly id: string;
  /** Official criterion name, e.g. `"Contrast (Minimum)"`. */
  readonly name: string;
  readonly level: ConformanceLevel;
  readonly addedIn: WcagVersion;
  readonly principle: Principle;
  /** Parent guideline, e.g. `"1.4 Distinguishable"`. */
  readonly guideline: string;
  readonly topics: readonly Topic[];
  /** One or two sentences a non-specialist can act on. */
  readonly plainLanguage: string;
  /** The testable bar, paraphrased tightly enough to check against. */
  readonly requirement: string;
  /** Concrete implementation moves that satisfy the criterion. */
  readonly howToMeet: readonly string[];
  /** Patterns that commonly fail this criterion. */
  readonly commonFailures: readonly string[];
  /** Link to the W3C "Understanding" document. */
  readonly understandingUrl: string;
  /**
   * Whether a static tool can decide conformance on its own.
   *
   * - `automatable` — a machine can return a reliable pass/fail.
   * - `partial` — a machine can flag candidates, a human confirms.
   * - `manual` — requires human judgement or a real browser/AT session.
   */
  readonly testability: "automatable" | "partial" | "manual";
}

/** Severity assigned to an audit finding. */
export type Impact = "critical" | "serious" | "moderate" | "minor" | "info";

export const IMPACT_ORDER: readonly Impact[] = [
  "critical",
  "serious",
  "moderate",
  "minor",
  "info",
];

/** A single issue (or candidate issue) found while auditing markup. */
export interface Finding {
  /** Stable rule identifier, e.g. `"image-missing-alt"`. */
  readonly rule: string;
  readonly impact: Impact;
  readonly topic: Topic;
  /** Success criteria this finding maps to, e.g. `["1.1.1"]`. */
  readonly criteria: readonly string[];
  /** What is wrong, phrased so it can be read without seeing the markup. */
  readonly message: string;
  /** How to fix it. */
  readonly remediation: string;
  /** Truncated source excerpt for the offending element. */
  readonly snippet?: string;
  /** Best-effort CSS selector for locating the element. */
  readonly selector?: string;
  /**
   * `true` when the rule cannot prove a violation on its own and a human
   * needs to confirm. Kept separate from `impact` so callers can filter.
   */
  readonly needsReview: boolean;
}
