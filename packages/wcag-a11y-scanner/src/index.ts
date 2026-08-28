/**
 * Library entry point.
 *
 * Side-effect free: importing this does not start a server. The executable
 * lives in `bin.ts`.
 */
export { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

export {
  auditHtml,
  formatAuditReport,
  type AuditOptions,
  type AuditResult,
  type AuditSummary,
} from "./audit/index.js";

export {
  checkContrast,
  classifyTextSize,
  contrastRatio,
  relativeLuminance,
  suggestForeground,
  thresholdsFor,
  LARGE_TEXT_BOLD_PX,
  LARGE_TEXT_PX,
  type ContentType,
  type ContrastCheckInput,
  type ContrastCheckResult,
  type TextSizeClass,
} from "./color/contrast.js";

export {
  ColorParseError,
  flattenOver,
  parseColor,
  toCssString,
  toHex,
  type Rgba,
} from "./color/parse.js";

export {
  expandCriteria,
  getCriterion,
  knownCriterionIds,
  queryCriteria,
  SUCCESS_CRITERIA,
} from "./wcag/criteria.js";

export {
  CONFORMANCE_LEVELS,
  TOPIC_LABELS,
  TOPICS,
  type ConformanceLevel,
  type Finding,
  type Impact,
  type Principle,
  type SuccessCriterion,
  type Topic,
  type WcagVersion,
} from "./wcag/types.js";
