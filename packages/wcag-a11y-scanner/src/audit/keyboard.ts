import type { HTMLElement } from "node-html-parser";
import type { Finding } from "../wcag/types.js";
import { truncate } from "@retrojb/workspace-tools";
import {
  accessibleName,
  attrOf,
  collectStyleText,
  hasAttr,
  inlineStyle,
  INTERACTIVE_ROLES,
  isFocusable,
  isInAccessibilityTree,
  selectorFor,
  snippetFor,
  tagOf,
  tokenAttr,
} from "./dom.js";

function finding(
  init: Omit<Finding, "topic" | "needsReview"> & { needsReview?: boolean },
): Finding {
  const { needsReview = false, ...rest } = init;
  return { ...rest, topic: "keyboard", needsReview };
}

/** Attributes that suggest an element was wired up for pointer interaction. */
const POINTER_HANDLERS = [
  "onclick",
  "onmousedown",
  "onmouseup",
  "ondblclick",
  "onmouseover",
] as const;

/**
 * Static checks for keyboard and tab navigation.
 *
 * A real keyboard audit needs a browser: focus order, focus visibility, and
 * keyboard traps are all runtime properties. What markup can reveal is the
 * subset of causes that are visible statically — positive `tabindex`, click
 * handlers on non-focusable elements, suppressed focus outlines, missing skip
 * links — plus the places a human needs to go and check by hand.
 */
export function auditKeyboard(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  findings.push(...checkTabindex(root));
  findings.push(...checkOperability(root));
  findings.push(...checkFocusVisibility(root));
  findings.push(...checkBypassBlocks(root));
  findings.push(...checkFocusOrderRisks(root));
  findings.push(...checkDialogs(root));

  return findings;
}

// -----------------------------------------------------------------------------
// tabindex
// -----------------------------------------------------------------------------

function checkTabindex(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  for (const element of root.querySelectorAll("[tabindex]")) {
    const raw = attrOf(element, "tabindex")?.trim() ?? "";
    const value = Number.parseInt(raw, 10);

    if (!Number.isFinite(value) || String(value) !== raw) {
      findings.push(
        finding({
          rule: "tabindex-invalid",
          impact: "moderate",
          criteria: ["2.4.3", "2.1.1"],
          message: `tabindex="${raw}" is not a valid integer, so browsers ignore it and the element's focusability is whatever its tag implies.`,
          remediation:
            'Use tabindex="0" to add an element to the natural tab order, or tabindex="-1" to make it focusable only via script.',
          snippet: snippetFor(element),
          selector: selectorFor(element),
        }),
      );
      continue;
    }

    if (value > 0) {
      findings.push(
        finding({
          rule: "tabindex-positive",
          impact: "serious",
          criteria: ["2.4.3"],
          message: `tabindex="${value}" pulls this element ahead of every element in the natural tab order. Positive values create a separate, earlier tab sequence that is almost impossible to keep consistent as the page changes.`,
          remediation:
            'Remove the positive value and use tabindex="0". If the tab order is wrong, fix the DOM order instead — that is what browsers follow by default.',
          snippet: snippetFor(element),
          selector: selectorFor(element),
        }),
      );
      continue;
    }

    if (value < 0) {
      const tag = tagOf(element);
      const role = tokenAttr(element, "role");
      const isControl =
        tag === "button" ||
        tag === "select" ||
        tag === "textarea" ||
        (tag === "input" && tokenAttr(element, "type") !== "hidden") ||
        (tag === "a" && hasAttr(element, "href")) ||
        (role !== undefined && INTERACTIVE_ROLES.has(role));

      if (isControl && !hasAttr(element, "disabled")) {
        findings.push(
          finding({
            rule: "tabindex-negative-on-control",
            impact: "serious",
            criteria: ["2.1.1", "2.4.3"],
            message: `tabindex="${value}" removes an interactive ${role ? `role="${role}"` : `<${tag}>`} from the tab order. Unless script moves focus here deliberately, keyboard users cannot reach it at all.`,
            remediation:
              "Remove the negative tabindex, unless this element is a scripted focus target (a dialog container, or the non-active items in a composite widget using arrow-key navigation).",
            snippet: snippetFor(element),
            selector: selectorFor(element),
            needsReview: true,
          }),
        );
      }
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Keyboard operability of custom controls
// -----------------------------------------------------------------------------

function checkOperability(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  for (const element of root.querySelectorAll("*")) {
    const tag = tagOf(element);
    if (tag === "body" || tag === "html" || tag === "head") continue;

    // href-less anchors get their own, more specific rule below.
    if (tag === "a" && !hasAttr(element, "href")) continue;

    const handlers = POINTER_HANDLERS.filter((name) => hasAttr(element, name));
    const role = tokenAttr(element, "role");
    const hasInteractiveRole =
      role !== undefined && INTERACTIVE_ROLES.has(role);

    // Click handler on something the keyboard cannot reach.
    if (handlers.length > 0 && !isFocusable(element)) {
      findings.push(
        finding({
          rule: "handler-on-unfocusable-element",
          impact: "critical",
          criteria: ["2.1.1", "4.1.2"],
          message: `<${tag}> has ${handlers.join(", ")} but is not focusable, so the action it performs is available to a mouse and unavailable to a keyboard.`,
          remediation:
            'Use a <button>. If the element must stay a <div> or <span>, add role="button", tabindex="0", and a key handler for Enter and Space.',
          snippet: snippetFor(element),
          selector: selectorFor(element),
        }),
      );
      continue;
    }

    // Interactive role on something the keyboard cannot reach.
    if (hasInteractiveRole && !isFocusable(element)) {
      findings.push(
        finding({
          rule: "interactive-role-not-focusable",
          impact: "critical",
          criteria: ["2.1.1", "4.1.2"],
          message: `role="${role}" declares this element interactive, but it is not focusable, so a keyboard user can never operate it.`,
          remediation:
            'Add tabindex="0" and the key handlers the role implies, or replace the element with the equivalent native control.',
          snippet: snippetFor(element),
          selector: selectorFor(element),
        }),
      );
      continue;
    }

    // Focusable, mouse-wired, but with no declared role: announced as nothing.
    if (
      handlers.length > 0 &&
      isFocusable(element) &&
      role === undefined &&
      !["a", "button", "input", "select", "textarea", "summary"].includes(tag)
    ) {
      findings.push(
        finding({
          rule: "focusable-handler-without-role",
          impact: "serious",
          criteria: ["4.1.2", "2.1.1"],
          message: `<${tag}> is focusable and has a click handler but declares no role, so assistive technology announces it as plain content rather than a control.`,
          remediation:
            "Use a native <button>, or add the appropriate role and keyboard handling.",
          snippet: snippetFor(element),
          selector: selectorFor(element),
        }),
      );
    }
  }

  // <a> without href that behaves like a control.
  for (const anchor of root.querySelectorAll("a")) {
    if (hasAttr(anchor, "href")) continue;

    const wired =
      POINTER_HANDLERS.some((name) => hasAttr(anchor, name)) ||
      tokenAttr(anchor, "role") === "button";

    if (wired && !isFocusable(anchor)) {
      findings.push(
        finding({
          rule: "anchor-without-href",
          impact: "critical",
          criteria: ["2.1.1", "4.1.2"],
          message:
            "<a> without an href is not focusable and is not exposed as a link, yet this one is wired up to act like a control.",
          remediation:
            "Use <button> for actions, or give the anchor a real href if it navigates.",
          snippet: snippetFor(anchor),
          selector: selectorFor(anchor),
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Focus visibility
// -----------------------------------------------------------------------------

/** Matches an outline declaration that removes the indicator. */
const OUTLINE_SUPPRESSED =
  /outline\s*:\s*(none|0(px|em|rem)?)\s*(!important)?\s*(;|$)/i;

function checkFocusVisibility(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];
  const css = collectStyleText(root);

  if (css !== "") {
    // Find rules that target :focus and kill the outline.
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = rulePattern.exec(css)) !== null) {
      const selector = (match[1] ?? "").trim();
      const body = match[2] ?? "";

      if (!/:focus(?!-visible)/i.test(selector)) continue;
      if (!OUTLINE_SUPPRESSED.test(body)) continue;

      // A replacement indicator makes this legitimate.
      const replaced =
        /\b(box-shadow|border|background|background-color|outline-color|text-decoration)\s*:/i.test(
          body,
        ) && !/box-shadow\s*:\s*none/i.test(body);

      findings.push(
        finding({
          rule: replaced ? "focus-outline-replaced" : "focus-outline-removed",
          impact: replaced ? "minor" : "critical",
          criteria: replaced ? ["2.4.7", "1.4.11"] : ["2.4.7"],
          message: replaced
            ? `"${truncate(selector, 80, { collapse: true })}" removes the default outline but declares a replacement indicator. Confirm the replacement is clearly visible and clears 3:1 contrast against its background.`
            : `"${truncate(selector, 80, { collapse: true })}" removes the focus outline with no replacement, leaving keyboard users unable to see where they are on the page.`,
          remediation: replaced
            ? 'Verify the replacement in a browser at both light and dark surfaces, and check its contrast with check_color_contrast using contentType "ui-component".'
            : "Keep the browser default, or set an explicit indicator on :focus-visible — for example outline: 2px solid currentColor with outline-offset: 2px.",
          snippet: `${truncate(selector, 80, { collapse: true })} { ${truncate(body.trim(), 80, { collapse: true })} }`,
          needsReview: replaced,
        }),
      );
    }
  }

  for (const element of root.querySelectorAll("[style]")) {
    const style = inlineStyle(element);
    const outline = style.get("outline");
    if (
      outline !== undefined &&
      /^(none|0(px|em|rem)?)$/i.test(outline.trim())
    ) {
      findings.push(
        finding({
          rule: "focus-outline-removed-inline",
          impact: "serious",
          criteria: ["2.4.7"],
          message:
            "An inline style sets outline to none. If this element can receive focus, its focus indicator is gone.",
          remediation:
            "Remove the declaration, or supply a visible focus indicator via :focus-visible in a stylesheet.",
          snippet: snippetFor(element),
          selector: selectorFor(element),
          needsReview: !isFocusable(element),
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Bypass blocks / skip links
// -----------------------------------------------------------------------------

function checkBypassBlocks(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  // Only meaningful for a full document.
  if (
    root.querySelector("body") === null &&
    root.querySelector("html") === null
  ) {
    return findings;
  }

  const inPageLinks = root
    .querySelectorAll("a[href]")
    .filter((link) => attrOf(link, "href")?.trim().startsWith("#") === true);

  const skipLink = inPageLinks.find((link) => {
    const name = accessibleName(link, root).name.toLowerCase();
    return /\b(skip|jump)\b/.test(name);
  });

  const navLinkCount = root.querySelectorAll(
    "nav a[href], header a[href]",
  ).length;

  if (!skipLink && navLinkCount > 3) {
    findings.push(
      finding({
        rule: "missing-skip-link",
        impact: "moderate",
        criteria: ["2.4.1"],
        message: `There are ${navLinkCount} link(s) in the header and navigation and no skip link, so keyboard users must tab through all of them on every page.`,
        remediation:
          'Add <a href="#main-content" class="skip-link">Skip to main content</a> as the first focusable element, and give <main> that id.',
      }),
    );
  }

  if (skipLink) {
    const target = attrOf(skipLink, "href")?.trim().slice(1) ?? "";

    if (target === "") {
      findings.push(
        finding({
          rule: "skip-link-empty-target",
          impact: "moderate",
          criteria: ["2.4.1"],
          message:
            'The skip link points at "#", which does not move focus anywhere.',
          remediation: "Point it at the id of the main content container.",
          snippet: snippetFor(skipLink),
          selector: selectorFor(skipLink),
        }),
      );
    } else {
      const exists = root
        .querySelectorAll("[id]")
        .some((element) => attrOf(element, "id")?.trim() === target);

      if (!exists) {
        findings.push(
          finding({
            rule: "skip-link-broken-target",
            impact: "serious",
            criteria: ["2.4.1"],
            message: `The skip link targets #${target}, but no element with that id exists, so activating it does nothing.`,
            remediation: `Add id="${target}" to the main content container.`,
            snippet: snippetFor(skipLink),
            selector: selectorFor(skipLink),
          }),
        );
      }
    }

    const style = inlineStyle(skipLink);
    const display = style.get("display");
    const visibility = style.get("visibility");

    if (
      display === "none" ||
      visibility === "hidden" ||
      hasAttr(skipLink, "hidden")
    ) {
      findings.push(
        finding({
          rule: "skip-link-not-focusable",
          impact: "serious",
          criteria: ["2.4.1", "2.4.7"],
          message:
            "The skip link is hidden with display: none or visibility: hidden, which removes it from the tab order entirely — so it can never be reached.",
          remediation:
            "Hide it with a clip/offscreen technique instead, and reveal it on :focus.",
          snippet: snippetFor(skipLink),
          selector: selectorFor(skipLink),
        }),
      );
    }

    if (!isInAccessibilityTree(skipLink)) {
      findings.push(
        finding({
          rule: "skip-link-aria-hidden",
          impact: "serious",
          criteria: ["2.4.1"],
          message:
            "The skip link is inside aria-hidden content, so screen reader users are never told it exists.",
          remediation: "Remove aria-hidden from the skip link's ancestry.",
          snippet: snippetFor(skipLink),
          selector: selectorFor(skipLink),
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Focus order risks
// -----------------------------------------------------------------------------

function checkFocusOrderRisks(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];
  const css = collectStyleText(root);

  // CSS that reorders content visually leaves tab order following the DOM.
  const reorderPattern =
    /(flex-direction\s*:\s*(row|column)-reverse|(?<!flex-)\border\s*:\s*-?[1-9]\d*)/gi;
  const reorderMatches = [...css.matchAll(reorderPattern)];

  for (const element of root.querySelectorAll("[style]")) {
    const style = inlineStyle(element);
    const direction = style.get("flex-direction");
    const order = style.get("order");

    if (
      direction?.includes("reverse") === true ||
      (order !== undefined && order !== "0")
    ) {
      findings.push(
        finding({
          rule: "visual-order-may-differ",
          impact: "moderate",
          criteria: ["2.4.3", "1.3.2"],
          message: `An inline style reorders this element visually (${direction ? `flex-direction: ${direction}` : `order: ${order}`}). Tab order follows the DOM, not the layout, so the two may now disagree.`,
          remediation:
            "Reorder the DOM to match the intended reading and tab order, then drop the CSS reordering.",
          snippet: snippetFor(element),
          selector: selectorFor(element),
          needsReview: true,
        }),
      );
    }
  }

  if (reorderMatches.length > 0) {
    findings.push(
      finding({
        rule: "stylesheet-reorders-content",
        impact: "moderate",
        criteria: ["2.4.3", "1.3.2"],
        message: `A <style> block uses ${reorderMatches.length} visual reordering declaration(s) (flex-direction: *-reverse, or order). Tab order follows the DOM, so verify the two still agree.`,
        remediation:
          "Tab through the affected regions and confirm focus moves in the order things appear on screen.",
        needsReview: true,
      }),
    );
  }

  const autofocused = root.querySelectorAll("[autofocus]");
  if (autofocused.length > 1) {
    findings.push(
      finding({
        rule: "multiple-autofocus",
        impact: "moderate",
        criteria: ["2.4.3", "3.2.1"],
        message: `${autofocused.length} elements declare autofocus. Only one can win, and which one is not reliably defined.`,
        remediation: "Keep at most one autofocus per document.",
        ...(autofocused[0] ? { snippet: snippetFor(autofocused[0]) } : {}),
      }),
    );
  } else if (autofocused.length === 1 && autofocused[0]) {
    findings.push(
      finding({
        rule: "autofocus-present",
        impact: "info",
        criteria: ["2.4.3", "3.2.1"],
        message:
          "An element uses autofocus. This moves focus past everything before it on load, which can disorient screen reader users and skip content they needed to hear.",
        remediation:
          "Confirm the jump is expected here — a dedicated search page is fine, a marketing page usually is not.",
        snippet: snippetFor(autofocused[0]),
        selector: selectorFor(autofocused[0]),
        needsReview: true,
      }),
    );
  }

  const accesskeys = new Map<string, number>();
  for (const element of root.querySelectorAll("[accesskey]")) {
    const key = tokenAttr(element, "accesskey");
    if (!key) continue;
    accesskeys.set(key, (accesskeys.get(key) ?? 0) + 1);
  }
  for (const [key, count] of accesskeys) {
    if (count > 1) {
      findings.push(
        finding({
          rule: "duplicate-accesskey",
          impact: "minor",
          criteria: ["2.1.1"],
          message: `accesskey="${key}" is assigned to ${count} elements, so the shortcut is ambiguous.`,
          remediation: "Make each accesskey unique, or remove them.",
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Dialogs and keyboard traps
// -----------------------------------------------------------------------------

function checkDialogs(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  for (const dialog of root.querySelectorAll(
    "[role=dialog], [role=alertdialog], dialog",
  )) {
    const tag = tagOf(dialog);

    if (tag !== "dialog" && tokenAttr(dialog, "aria-modal") !== "true") {
      findings.push(
        finding({
          rule: "dialog-missing-aria-modal",
          impact: "moderate",
          criteria: ["2.1.2", "4.1.2"],
          message: `role="${tokenAttr(dialog, "role")}" without aria-modal="true". Screen readers will let the user browse the page behind the dialog, which usually is not what the visual design implies.`,
          remediation:
            'Add aria-modal="true" for a modal dialog, or prefer the native <dialog> element with showModal().',
          snippet: snippetFor(dialog),
          selector: selectorFor(dialog),
        }),
      );
    }

    if (accessibleName(dialog, root).name === "") {
      findings.push(
        finding({
          rule: "dialog-missing-name",
          impact: "serious",
          criteria: ["4.1.2", "2.4.6"],
          message:
            "A dialog has no accessible name, so a screen reader announces it without saying what it is for.",
          remediation:
            "Label it with aria-labelledby pointing at the dialog's heading, or aria-label.",
          snippet: snippetFor(dialog),
          selector: selectorFor(dialog),
        }),
      );
    }

    findings.push(
      finding({
        rule: "dialog-keyboard-trap-review",
        impact: "info",
        criteria: ["2.1.2", "2.4.3"],
        message:
          "Dialogs are the most common source of keyboard traps. This one needs a manual check: focus moves into the dialog when it opens, Tab cycles within it, Escape closes it, and focus returns to the element that opened it.",
        remediation:
          "Walk through open, Tab to the last control, Tab again, Escape, and confirm focus lands back on the trigger.",
        snippet: snippetFor(dialog),
        selector: selectorFor(dialog),
        needsReview: true,
      }),
    );
  }

  return findings;
}
