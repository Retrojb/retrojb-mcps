import type { ConformanceLevel } from "../wcag/types.js";
import {
  flattenOver,
  hslToRgb,
  parseColor,
  rgbToHsl,
  toHex,
  type Rgba,
} from "./parse.js";

/**
 * What is being measured. WCAG applies different thresholds to text than to the
 * visual affordances of a control.
 */
export type ContentType = "text" | "ui-component" | "graphical-object";

/** WCAG's two text size buckets. */
export type TextSizeClass = "normal" | "large";

/**
 * CSS reference pixels per point: a CSS `pt` is 1/72 inch and a CSS `px` is
 * 1/96 inch, so 1pt = 96/72 px.
 */
const PX_PER_PT = 96 / 72;

/**
 * The px equivalents of WCAG's `large scale (text)` definition (18pt, or 14pt
 * bold). WCAG states the threshold in points; these are the derived CSS pixel
 * values, which is the unit web authors actually work in.
 */
export const LARGE_TEXT_PX = 18 * PX_PER_PT; // 24
export const LARGE_TEXT_BOLD_PX = 14 * PX_PER_PT; // 18.666...

/**
 * Relative luminance of an sRGB colour, per the WCAG 2 definition.
 *
 * L = 0.2126R + 0.7152G + 0.0722B, where each channel is linearised out of
 * the sRGB transfer function first.
 *
 * @param color - an opaque colour. Alpha is ignored; flatten first with
 *   {@link flattenOver} if the source was translucent.
 * @returns 0 for black through 1 for white.
 * @see https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
export function relativeLuminance(color: Rgba): number {
  const linearise = (channel8bit: number): number => {
    const channel = channel8bit / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * linearise(color.r) +
    0.7152 * linearise(color.g) +
    0.0722 * linearise(color.b)
  );
}

/**
 * Contrast ratio between two opaque colours: (L1 + 0.05) / (L2 + 0.05), with
 * L1 the lighter luminance.
 *
 * @returns a value from 1 (identical) to 21 (black against white).
 * @see https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** How the text being measured is sized. */
export interface TextMetrics {
  /** Font size in CSS pixels. Mutually exclusive with {@link fontSizePt}. */
  readonly fontSizePx?: number | undefined;
  /** Font size in points. */
  readonly fontSizePt?: number | undefined;
  /** Whether the text renders at bold weight (700 or heavier). */
  readonly bold?: boolean | undefined;
}

export interface ResolvedTextSize {
  readonly classification: TextSizeClass;
  readonly fontSizePx: number;
  readonly fontSizePt: number;
  readonly bold: boolean;
  /** Why it landed in that bucket. */
  readonly rationale: string;
}

/**
 * Sorts text into WCAG's normal/large buckets.
 *
 * Large is at least 18pt, or at least 14pt when bold. When no size is given we
 * assume normal text, because that is the stricter bar and the safer default.
 */
export function classifyTextSize(metrics: TextMetrics = {}): ResolvedTextSize {
  const bold = metrics.bold ?? false;

  const fontSizePx =
    metrics.fontSizePx ??
    (metrics.fontSizePt === undefined ? 16 : metrics.fontSizePt * PX_PER_PT);

  const fontSizePt = fontSizePx / PX_PER_PT;
  const threshold = bold ? LARGE_TEXT_BOLD_PX : LARGE_TEXT_PX;
  // Guard against binary float error on exactly-18.666px bold text.
  const isLarge = fontSizePx >= threshold - 1e-9;

  const sizeGiven =
    metrics.fontSizePx !== undefined || metrics.fontSizePt !== undefined;

  const rationale = sizeGiven
    ? isLarge
      ? `${fontSizePx.toFixed(2)}px (${fontSizePt.toFixed(1)}pt)${bold ? " bold" : ""} is at or above the ${threshold.toFixed(2)}px large-text threshold.`
      : `${fontSizePx.toFixed(2)}px (${fontSizePt.toFixed(1)}pt)${bold ? " bold" : ""} is below the ${threshold.toFixed(2)}px large-text threshold.`
    : "No font size supplied, so this is treated as normal-size text — the stricter of the two thresholds.";

  return {
    classification: isLarge ? "large" : "normal",
    fontSizePx: Number(fontSizePx.toFixed(3)),
    fontSizePt: Number(fontSizePt.toFixed(3)),
    bold,
    rationale,
  };
}

/** The threshold a given criterion imposes on a given kind of content. */
export interface Threshold {
  readonly criterion: string;
  readonly name: string;
  readonly level: ConformanceLevel;
  readonly requiredRatio: number;
  readonly appliesTo: string;
}

/**
 * The WCAG thresholds that apply to a piece of content.
 *
 * Text is governed by 1.4.3 (AA) and 1.4.6 (AAA). Non-text content is governed
 * by 1.4.11 (AA) only — WCAG defines no enhanced non-text contrast criterion,
 * so a UI component that clears 3:1 has nothing further to meet at AAA.
 */
export function thresholdsFor(
  contentType: ContentType,
  textSize: TextSizeClass,
): Threshold[] {
  if (contentType === "text") {
    const isLarge = textSize === "large";
    const scope = isLarge ? "large-scale text" : "normal-size text";
    return [
      {
        criterion: "1.4.3",
        name: "Contrast (Minimum)",
        level: "AA",
        requiredRatio: isLarge ? 3 : 4.5,
        appliesTo: scope,
      },
      {
        criterion: "1.4.6",
        name: "Contrast (Enhanced)",
        level: "AAA",
        requiredRatio: isLarge ? 4.5 : 7,
        appliesTo: scope,
      },
    ];
  }

  return [
    {
      criterion: "1.4.11",
      name: "Non-text Contrast",
      level: "AA",
      requiredRatio: 3,
      appliesTo:
        contentType === "ui-component"
          ? "visual boundaries and state indicators of user interface components"
          : "parts of graphics required to understand the content",
    },
  ];
}

export interface ContrastCheckInput {
  readonly foreground: string;
  readonly background: string;
  readonly contentType?: ContentType | undefined;
  readonly text?: TextMetrics | undefined;
  /** The level to report an overall verdict against. Defaults to `"AA"`. */
  readonly targetLevel?: ConformanceLevel | undefined;
}

export interface ThresholdResult extends Threshold {
  readonly passes: boolean;
  /** How far short the pairing falls, rounded to 2dp. `0` when it passes. */
  readonly shortfall: number;
}

export interface ColorSuggestion {
  readonly hex: string;
  readonly ratio: number;
  /** `"darker"` or `"lighter"` relative to the original foreground. */
  readonly direction: "darker" | "lighter";
  readonly note: string;
}

export interface ContrastCheckResult {
  readonly foreground: {
    readonly input: string;
    readonly hex: string;
    readonly alpha: number;
    readonly relativeLuminance: number;
  };
  readonly background: {
    readonly input: string;
    readonly hex: string;
    readonly alpha: number;
    readonly relativeLuminance: number;
  };
  /** Contrast ratio rounded down to 2dp, so a reported 4.50 always passes 4.5. */
  readonly ratio: number;
  readonly contentType: ContentType;
  readonly textSize: ResolvedTextSize | null;
  readonly targetLevel: ConformanceLevel;
  readonly results: readonly ThresholdResult[];
  /** Whether every threshold at or below {@link targetLevel} passes. */
  readonly passesTarget: boolean;
  readonly summary: string;
  readonly notes: readonly string[];
  /** Alternative foregrounds that would meet the target, when it currently fails. */
  readonly suggestions: readonly ColorSuggestion[];
}

const LEVEL_RANK: Record<ConformanceLevel, number> = { A: 1, AA: 2, AAA: 3 };

/**
 * Truncates rather than rounds, so a displayed ratio never claims to clear a
 * threshold it actually misses. 4.4999 reports as 4.49, not 4.50.
 */
function floor2(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Evaluates a foreground/background pairing against the WCAG contrast criteria
 * that apply to it.
 *
 * Translucent inputs are flattened before measurement: the foreground is
 * composited over the background, and a translucent background is composited
 * over white (WCAG's stated assumption when no backdrop is specified). Both
 * cases are called out in `notes`, because the real backdrop may differ.
 *
 * @throws {import("./parse.js").ColorParseError} on an unparseable colour.
 */
export function checkContrast(input: ContrastCheckInput): ContrastCheckResult {
  const contentType = input.contentType ?? "text";
  const targetLevel = input.targetLevel ?? "AA";
  const notes: string[] = [];

  const rawForeground = parseColor(input.foreground);
  const rawBackground = parseColor(input.background);

  const white: Rgba = { r: 255, g: 255, b: 255, a: 1 };
  const background = flattenOver(rawBackground, white);
  if (rawBackground.a < 1) {
    notes.push(
      `The background colour has alpha ${rawBackground.a}. WCAG assumes white when no backdrop is specified, so it was composited over white to give ${toHex(background)}. Re-run with the real backdrop if it is not white.`,
    );
  }

  const foreground = flattenOver(rawForeground, background);
  if (rawForeground.a < 1) {
    notes.push(
      `The foreground colour has alpha ${rawForeground.a}, so it was composited over the background to give an effective ${toHex(foreground)}. Contrast is only defined between opaque colours.`,
    );
  }

  const exactRatio = contrastRatio(foreground, background);
  const ratio = floor2(exactRatio);

  const textSize = contentType === "text" ? classifyTextSize(input.text) : null;
  const thresholds = thresholdsFor(
    contentType,
    textSize?.classification ?? "normal",
  );

  const results: ThresholdResult[] = thresholds.map((threshold) => {
    const passes = exactRatio >= threshold.requiredRatio;
    return {
      ...threshold,
      passes,
      shortfall: passes
        ? 0
        : Number((threshold.requiredRatio - exactRatio).toFixed(2)),
    };
  });

  const applicable = results.filter(
    (result) => LEVEL_RANK[result.level] <= LEVEL_RANK[targetLevel],
  );
  // Vacuously true when nothing applies: you cannot fail a threshold WCAG does
  // not set at that level. The note below makes the emptiness explicit.
  const passesTarget = applicable.every((result) => result.passes);

  if (applicable.length === 0) {
    const lowest = results
      .map(
        (result) =>
          `${result.criterion} (${result.level}, ${result.requiredRatio}:1)`,
      )
      .join(", ");
    notes.push(
      `WCAG sets no contrast threshold at level ${targetLevel} for this content, so there is nothing to pass or fail at that level. The first applicable requirement is ${lowest} — raise the target level to evaluate against it.`,
    );
  }

  if (contentType === "text" && textSize !== null) {
    notes.push(textSize.rationale);
  }

  if (contentType !== "text") {
    notes.push(
      "1.4.11 measures the component's visual boundary against the colour adjacent to it — usually the page background, not the component's own fill. Make sure the two colours passed in are the ones that actually sit next to each other.",
    );
  }

  const suggestions = passesTarget
    ? []
    : suggestForeground({
        foreground,
        background,
        targetRatio: requiredRatioFor(applicable),
      });

  const summary = buildSummary({
    ratio,
    contentType,
    textSize,
    targetLevel,
    passesTarget,
    results,
    applicableCount: applicable.length,
  });

  return {
    foreground: {
      input: input.foreground,
      hex: toHex(foreground),
      alpha: rawForeground.a,
      relativeLuminance: Number(relativeLuminance(foreground).toFixed(4)),
    },
    background: {
      input: input.background,
      hex: toHex(background),
      alpha: rawBackground.a,
      relativeLuminance: Number(relativeLuminance(background).toFixed(4)),
    },
    ratio,
    contentType,
    textSize,
    targetLevel,
    results,
    passesTarget,
    summary,
    notes,
    suggestions,
  };
}

/** The strictest ratio among a set of thresholds. */
function requiredRatioFor(thresholds: readonly Threshold[]): number {
  return thresholds.reduce(
    (max, threshold) => Math.max(max, threshold.requiredRatio),
    0,
  );
}

function buildSummary(args: {
  ratio: number;
  contentType: ContentType;
  textSize: ResolvedTextSize | null;
  targetLevel: ConformanceLevel;
  passesTarget: boolean;
  results: readonly ThresholdResult[];
  applicableCount: number;
}): string {
  const {
    ratio,
    contentType,
    textSize,
    targetLevel,
    passesTarget,
    results,
    applicableCount,
  } = args;

  const subject =
    contentType === "text"
      ? `${textSize?.classification ?? "normal"}-size text`
      : contentType.replace("-", " ");

  const passed = results.filter((result) => result.passes);
  const detail =
    passed.length === 0
      ? "It meets none of the contrast criteria that apply to this content."
      : `It meets ${passed
          .map(
            (result) =>
              `${result.criterion} (${result.level}, ${result.requiredRatio}:1)`,
          )
          .join(" and ")}.`;

  const verdict =
    applicableCount === 0
      ? `Level ${targetLevel} sets no contrast threshold here`
      : `${passesTarget ? "Passes" : "Fails"} level ${targetLevel}`;

  return `${ratio}:1 for ${subject}. ${verdict}. ${detail}`;
}

/**
 * Finds foregrounds that would meet `targetRatio` against `background` while
 * holding hue and saturation constant.
 *
 * Walks lightness in both directions and binary-searches for the closest
 * passing value, so the proposal stays recognisably the original colour rather
 * than collapsing to black or white. Returns whichever directions are
 * achievable, nearest first.
 */
export function suggestForeground(args: {
  foreground: Rgba;
  background: Rgba;
  targetRatio: number;
}): ColorSuggestion[] {
  const { foreground, background, targetRatio } = args;
  if (targetRatio <= 1) return [];

  const { h, s, l } = rgbToHsl(foreground);

  const atLightness = (lightness: number): Rgba => ({
    ...hslToRgb(h, s, lightness),
    a: 1,
  });

  const ratioAt = (lightness: number): number =>
    contrastRatio(atLightness(lightness), background);

  /**
   * Binary-searches lightness between `l` and `bound` for the value closest to
   * `l` that still meets the target. `bound` must already pass.
   */
  const search = (bound: number): number | undefined => {
    if (ratioAt(bound) < targetRatio) return undefined;

    let fail = l;
    let pass = bound;
    for (let i = 0; i < 40; i += 1) {
      const mid = (fail + pass) / 2;
      if (ratioAt(mid) >= targetRatio) pass = mid;
      else fail = mid;
    }
    return pass;
  };

  const candidates: (ColorSuggestion & { shift: number })[] = [];

  for (const [bound, direction] of [
    [0, "darker"],
    [1, "lighter"],
  ] as const) {
    const found = search(bound);
    if (found === undefined) continue;

    const color = atLightness(found);
    const ratio = floor2(contrastRatio(color, background));
    const shift = Math.abs(found - l);

    candidates.push({
      hex: toHex(color),
      ratio,
      direction,
      shift,
      note: `Same hue and saturation, lightness moved ${Math.round(shift * 100)} points ${direction}, reaching ${ratio}:1.`,
    });
  }

  // Smallest lightness shift first — that is the proposal closest to the
  // original colour, and the one a designer is most likely to accept.
  return candidates
    .sort((a, b) => a.shift - b.shift)
    .map(({ shift: _shift, ...suggestion }) => suggestion);
}
