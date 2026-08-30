import { HTMLElement, NodeType } from "node-html-parser";
import { checkContrast } from "../color/contrast.js";
import { ColorParseError } from "../color/parse.js";
import type { Finding } from "../wcag/types.js";
import { truncate } from "@retrojb/workspace-tools";
import {
  inlineStyle,
  isInAccessibilityTree,
  selectorFor,
  snippetFor,
  tagOf,
} from "./dom.js";

function finding(
  init: Omit<Finding, "topic" | "needsReview"> & { needsReview?: boolean },
): Finding {
  const { needsReview = false, ...rest } = init;
  return { ...rest, topic: "color-contrast", needsReview };
}

/** A resolved colour context inherited down the tree. */
interface ColorContext {
  readonly color: string | undefined;
  readonly background: string;
  /** Whether `background` was inherited rather than declared on this element. */
  readonly backgroundInherited: boolean;
  readonly fontSizePx: number | undefined;
  readonly bold: boolean;
}

const ROOT_CONTEXT: ColorContext = {
  color: undefined,
  // WCAG's stated assumption when no background is specified.
  background: "#ffffff",
  backgroundInherited: true,
  fontSizePx: undefined,
  bold: false,
};

/** Parses a CSS length into pixels, when it is expressed in an absolute unit. */
function parseFontSizePx(
  value: string,
  inherited: number | undefined,
): number | undefined {
  const text = value.trim().toLowerCase();

  const px = /^(-?[\d.]+)px$/.exec(text);
  if (px) return Number.parseFloat(px[1] ?? "");

  const pt = /^(-?[\d.]+)pt$/.exec(text);
  if (pt) return Number.parseFloat(pt[1] ?? "") * (96 / 72);

  const rem = /^(-?[\d.]+)rem$/.exec(text);
  if (rem) return Number.parseFloat(rem[1] ?? "") * 16;

  const em = /^(-?[\d.]+)em$/.exec(text);
  if (em) return Number.parseFloat(em[1] ?? "") * (inherited ?? 16);

  const pct = /^([\d.]+)%$/.exec(text);
  if (pct) return (Number.parseFloat(pct[1] ?? "") / 100) * (inherited ?? 16);

  const keywords: Record<string, number> = {
    "xx-small": 9,
    "x-small": 10,
    small: 13,
    medium: 16,
    large: 18,
    "x-large": 24,
    "xx-large": 32,
  };

  return keywords[text];
}

/** Whether a `font-weight` value renders bold for WCAG's purposes. */
function isBoldWeight(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (text === "bold" || text === "bolder") return true;
  const numeric = Number.parseInt(text, 10);
  return Number.isFinite(numeric) && numeric >= 700;
}

/** Text nodes directly inside an element, ignoring descendants. */
function ownText(element: HTMLElement): string {
  return element.childNodes
    .filter((node) => node.nodeType === NodeType.TEXT_NODE)
    .map((node) => node.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks text/background pairings that are declared in inline `style`
 * attributes.
 *
 * This is deliberately narrow. Contrast is a property of rendered pixels, and
 * resolving it properly needs a browser: cascade, specificity, custom
 * properties, images, gradients, and inherited backgrounds from unrelated
 * ancestors all feed into the answer. What this can do reliably is catch
 * pairings an author wrote out explicitly, and say so about the rest.
 *
 * Colours are inherited down the tree the way CSS inherits them, so
 * `<div style="background:#333"><p style="color:#555">` is evaluated as
 * `#555` on `#333`.
 */
export function auditInlineContrast(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  const visit = (element: HTMLElement, inherited: ColorContext): void => {
    const style = inlineStyle(element);
    const tag = tagOf(element);

    if (tag === "script" || tag === "style" || tag === "template") return;

    const declaredColor = style.get("color");
    const declaredBackground =
      style.get("background-color") ??
      extractBackgroundColor(style.get("background"));
    const declaredSize = style.get("font-size");
    const declaredWeight = style.get("font-weight");

    const context: ColorContext = {
      color: declaredColor ?? inherited.color,
      background: declaredBackground ?? inherited.background,
      backgroundInherited:
        declaredBackground === undefined
          ? inherited.backgroundInherited
          : false,
      fontSizePx:
        declaredSize === undefined
          ? inherited.fontSizePx
          : parseFontSizePx(declaredSize, inherited.fontSizePx),
      bold:
        declaredWeight === undefined
          ? inherited.bold
          : isBoldWeight(declaredWeight),
    };

    // Only evaluate where this element actually renders its own text.
    const text = ownText(element);
    if (
      text !== "" &&
      context.color !== undefined &&
      isInAccessibilityTree(element)
    ) {
      const key = `${context.color}|${context.background}|${context.fontSizePx ?? ""}|${context.bold}`;

      if (!seen.has(key)) {
        seen.add(key);
        findings.push(
          ...evaluatePairing({
            element,
            context,
            sample: text,
          }),
        );
      }
    }

    for (const child of element.childNodes) {
      if (child instanceof HTMLElement) visit(child, context);
    }
  };

  visit(root, ROOT_CONTEXT);

  return findings;
}

/**
 * Pulls a colour out of a `background` shorthand.
 *
 * Returns `undefined` for gradients and images, where there is no single colour
 * to measure against.
 */
function extractBackgroundColor(
  shorthand: string | undefined,
): string | undefined {
  if (shorthand === undefined) return undefined;
  const value = shorthand.trim();
  if (/gradient\(|url\(/i.test(value)) return undefined;

  const functional = /((?:rgba?|hsla?)\([^)]*\))/i.exec(value);
  if (functional) return functional[1];

  const hex = /#[0-9a-f]{3,8}\b/i.exec(value);
  if (hex) return hex[0];

  // A bare keyword such as `background: white`.
  const keyword = /^[a-z]+$/i.exec(value);
  return keyword ? value : undefined;
}

function evaluatePairing(args: {
  element: HTMLElement;
  context: ColorContext;
  sample: string;
}): Finding[] {
  const { element, context, sample } = args;
  if (context.color === undefined) return [];

  let result;
  try {
    result = checkContrast({
      foreground: context.color,
      background: context.background,
      contentType: "text",
      text: {
        fontSizePx: context.fontSizePx,
        bold: context.bold,
      },
      targetLevel: "AA",
    });
  } catch (error) {
    if (error instanceof ColorParseError) {
      return [
        finding({
          rule: "contrast-unresolvable-color",
          impact: "info",
          criteria: ["1.4.3"],
          message: `Could not evaluate contrast here: ${error.message}`,
          remediation:
            "Resolve the computed colour in a browser and check it with the check_color_contrast tool.",
          snippet: snippetFor(element),
          selector: selectorFor(element),
          needsReview: true,
        }),
      ];
    }
    throw error;
  }

  if (result.passesTarget) return [];

  const suggestion = result.suggestions[0];
  const sizeNote =
    context.fontSizePx === undefined
      ? " No font size is declared inline, so this was measured against the stricter normal-text threshold (4.5:1)."
      : "";

  const backgroundNote = context.backgroundInherited
    ? ` The background was not declared inline; ${context.background} is an assumption. Verify against the rendered background.`
    : "";

  return [
    finding({
      rule: "text-contrast-insufficient",
      impact: result.ratio < 3 ? "serious" : "moderate",
      criteria: ["1.4.3"],
      message: `Text "${truncate(sample, 40)}" is ${context.color} on ${context.background} — ${result.ratio}:1, below the ${result.results[0]?.requiredRatio ?? 4.5}:1 needed for ${result.textSize?.classification ?? "normal"}-size text.${sizeNote}${backgroundNote}`,
      remediation: suggestion
        ? `Darken or lighten the text — ${suggestion.hex} keeps the same hue and reaches ${suggestion.ratio}:1.`
        : "Increase the difference in lightness between the text and its background.",
      snippet: snippetFor(element),
      selector: selectorFor(element),
      // Inherited-background assumptions are guesses; declared pairs are not.
      needsReview: context.backgroundInherited,
    }),
  ];
}

/**
 * Notes the parts of colour conformance that markup alone cannot settle.
 *
 * Included in every colour-contrast audit so the absence of findings is never
 * mistaken for a clean bill of health.
 */
export function colorContrastCaveats(root: HTMLElement): Finding[] {
  const caveats: Finding[] = [];

  const hasStylesheetLink =
    root.querySelectorAll("link[rel=stylesheet]").length > 0;
  const hasStyleBlock = root.querySelectorAll("style").length > 0;
  const hasClasses = root.querySelectorAll("[class]").length > 0;

  if (hasStylesheetLink || hasStyleBlock || hasClasses) {
    caveats.push(
      finding({
        rule: "contrast-requires-rendered-page",
        impact: "info",
        criteria: ["1.4.3", "1.4.6", "1.4.11"],
        message:
          "Most colours on this page come from stylesheets or class names, which cannot be resolved from markup. Only pairings written into inline style attributes were measured.",
        remediation:
          "Extract the computed colours from a browser (or your design tokens) and check each pairing with check_color_contrast. Cover hover, focus, visited, and disabled states as well as the default.",
        needsReview: true,
      }),
    );
  }

  const overText = root.querySelectorAll("[style]").filter((element) => {
    const style = inlineStyle(element);
    const background = style.get("background") ?? style.get("background-image");
    return background !== undefined && /gradient\(|url\(/i.test(background);
  });

  if (overText.length > 0 && overText[0]) {
    caveats.push(
      finding({
        rule: "contrast-over-image-or-gradient",
        impact: "moderate",
        criteria: ["1.4.3"],
        message: `${overText.length} element(s) place content over a gradient or image background. Contrast varies pixel by pixel, so a single ratio cannot describe it.`,
        remediation:
          "Measure the worst-case region, or guarantee the floor with a solid scrim, a text shadow, or a semi-opaque overlay behind the text.",
        snippet: snippetFor(overText[0]),
        selector: selectorFor(overText[0]),
        needsReview: true,
      }),
    );
  }

  if (root.querySelectorAll("input, select, textarea, button").length > 0) {
    caveats.push(
      finding({
        rule: "non-text-contrast-review",
        impact: "info",
        criteria: ["1.4.11"],
        message:
          "This markup contains form controls and buttons. 1.4.11 requires their visual boundaries, state indicators, and focus rings to clear 3:1 against adjacent colours — none of which is visible in markup.",
        remediation:
          'Check each border, icon, and focus ring with check_color_contrast using contentType "ui-component".',
        needsReview: true,
      }),
    );
  }

  return caveats;
}
