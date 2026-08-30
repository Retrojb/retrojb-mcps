import type { HTMLElement } from "node-html-parser";
import type { Finding } from "../wcag/types.js";
import { truncate } from "@retrojb/workspace-tools";
import {
  accessibleName,
  attrOf,
  hasAttr,
  isAriaHidden,
  isFocusable,
  isInAccessibilityTree,
  selectorFor,
  snippetFor,
  subtreeText,
  tagOf,
  tokenAttr,
} from "./dom.js";

/** Builds a screen-reader finding with the topic pre-filled. */
function finding(
  init: Omit<Finding, "topic" | "needsReview"> & { needsReview?: boolean },
): Finding {
  const { needsReview = false, ...rest } = init;
  return { ...rest, topic: "screen-reader", needsReview };
}

/** Link text that tells a screen reader user nothing about the destination. */
const VAGUE_LINK_TEXT = new Set([
  "click here",
  "click",
  "here",
  "read more",
  "more",
  "learn more",
  "details",
  "more info",
  "more information",
  "this",
  "link",
  "go",
  "continue",
  "download",
  "see more",
  "view",
]);

/** Alt text that is present but carries no information. */
const USELESS_ALT = new Set([
  "image",
  "img",
  "picture",
  "photo",
  "graphic",
  "icon",
  "logo",
  "spacer",
  "blank",
  "untitled",
]);

/** Landmark elements and their ARIA role equivalents. */
const LANDMARK_SELECTOR =
  "main, header, footer, nav, aside, section[aria-label], section[aria-labelledby], " +
  "[role=main], [role=banner], [role=contentinfo], [role=navigation], " +
  "[role=complementary], [role=region], [role=search], [role=form]";

/**
 * Static checks for screen reader support.
 *
 * Every rule here is decidable from markup alone. Rules that can only surface a
 * candidate — vague link text, suspicious alt text — are flagged with
 * `needsReview` so callers can separate certainties from judgement calls.
 */
export function auditScreenReader(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  findings.push(...checkDocumentLevel(root));
  findings.push(...checkImages(root));
  findings.push(...checkFormControls(root));
  findings.push(...checkInteractiveNames(root));
  findings.push(...checkHeadings(root));
  findings.push(...checkStructure(root));
  findings.push(...checkAriaReferences(root));
  findings.push(...checkFrames(root));

  return findings;
}

// -----------------------------------------------------------------------------
// Document level: lang, title, landmarks
// -----------------------------------------------------------------------------

function checkDocumentLevel(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];
  const html = root.querySelector("html");

  // Only assert on `lang` when we were handed something document-shaped;
  // auditing a component fragment should not demand an <html> element.
  if (html) {
    const lang = attrOf(html, "lang")?.trim();
    if (!lang) {
      findings.push(
        finding({
          rule: "html-missing-lang",
          impact: "serious",
          criteria: ["3.1.1"],
          message:
            "The <html> element has no lang attribute, so a screen reader falls back to its default voice and may mispronounce the whole page.",
          remediation:
            'Add a valid BCP 47 language tag, e.g. <html lang="en">.',
          snippet: snippetFor(html),
          selector: "html",
        }),
      );
    } else if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(lang)) {
      findings.push(
        finding({
          rule: "html-invalid-lang",
          impact: "serious",
          criteria: ["3.1.1"],
          message: `lang="${lang}" is not a well-formed BCP 47 language tag, so user agents will ignore it.`,
          remediation:
            'Use a language subtag, optionally with a region: "en", "en-GB", "pt-BR".',
          snippet: snippetFor(html),
          selector: "html",
        }),
      );
    }

    const title = root.querySelector("title");
    const titleText = title ? subtreeText(title) : "";
    if (!title || titleText === "") {
      findings.push(
        finding({
          rule: "document-missing-title",
          impact: "serious",
          criteria: ["2.4.2"],
          message:
            "The document has no non-empty <title>. It is the first thing announced on page load and the label users see in tab and window lists.",
          remediation:
            "Add a <title> that names this specific page, most-specific part first: <title>Checkout — Retro Studio</title>.",
          ...(title ? { snippet: snippetFor(title), selector: "title" } : {}),
        }),
      );
    }

    if (root.querySelectorAll("main, [role=main]").length === 0) {
      findings.push(
        finding({
          rule: "document-missing-main",
          impact: "moderate",
          criteria: ["1.3.1", "2.4.1"],
          message:
            "There is no <main> landmark, so assistive technology users cannot jump straight to the primary content.",
          remediation:
            "Wrap the primary content of the page in a single <main> element.",
        }),
      );
    }

    const mains = root.querySelectorAll("main, [role=main]");
    if (mains.length > 1) {
      findings.push(
        finding({
          rule: "document-multiple-main",
          impact: "moderate",
          criteria: ["1.3.1"],
          message: `Found ${mains.length} main landmarks. A document must have exactly one, or the "skip to main content" affordance becomes ambiguous.`,
          remediation:
            "Keep one <main> and convert the others to <section> or <div>.",
          ...(mains[1] ? { snippet: snippetFor(mains[1]) } : {}),
        }),
      );
    }

    if (root.querySelectorAll(LANDMARK_SELECTOR).length === 0) {
      findings.push(
        finding({
          rule: "document-no-landmarks",
          impact: "moderate",
          criteria: ["1.3.1"],
          message:
            "The document defines no landmark regions, so there is no structural map for assistive technology to navigate by.",
          remediation:
            "Use <header>, <nav>, <main>, <aside>, and <footer> to mark the major regions of the page.",
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Images and other non-text content
// -----------------------------------------------------------------------------

function checkImages(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  for (const image of root.querySelectorAll("img")) {
    if (isAriaHidden(image)) continue;

    const alt = attrOf(image, "alt");
    const src = attrOf(image, "src") ?? "";

    if (alt === undefined) {
      const named = accessibleName(image, root);
      if (named.name !== "" && named.source !== "placeholder") continue;

      findings.push(
        finding({
          rule: "image-missing-alt",
          impact: "critical",
          criteria: ["1.1.1"],
          message: `<img> has no alt attribute${src ? ` (src="${truncate(src, 60)}")` : ""}. Screen readers fall back to announcing the filename.`,
          remediation:
            'Add alt text describing the image\'s purpose, or alt="" if it is purely decorative.',
          snippet: snippetFor(image),
          selector: selectorFor(image),
        }),
      );
      continue;
    }

    const trimmed = alt.trim();
    if (trimmed === "") continue; // Explicitly decorative — correct.

    const lower = trimmed.toLowerCase();

    if (USELESS_ALT.has(lower)) {
      findings.push(
        finding({
          rule: "image-uninformative-alt",
          impact: "serious",
          criteria: ["1.1.1"],
          message: `alt="${trimmed}" names the medium rather than the content, so it adds nothing for a screen reader user.`,
          remediation:
            'Describe what the image conveys, or use alt="" if it is decorative.',
          snippet: snippetFor(image),
          selector: selectorFor(image),
        }),
      );
      continue;
    }

    if (/\.(png|jpe?g|gif|svg|webp|avif|bmp)$/i.test(lower)) {
      findings.push(
        finding({
          rule: "image-filename-alt",
          impact: "serious",
          criteria: ["1.1.1"],
          message: `alt="${truncate(trimmed, 60)}" looks like a filename rather than a description.`,
          remediation: "Replace it with a description of the image's purpose.",
          snippet: snippetFor(image),
          selector: selectorFor(image),
        }),
      );
      continue;
    }

    if (/^(image|picture|photo|graphic|icon) (of|showing)\b/i.test(lower)) {
      findings.push(
        finding({
          rule: "image-alt-redundant-prefix",
          impact: "minor",
          criteria: ["1.1.1"],
          message: `alt="${truncate(trimmed, 60)}" starts with a redundant prefix — screen readers already announce the element as an image.`,
          remediation:
            'Drop the "image of" prefix and describe the content directly.',
          snippet: snippetFor(image),
          selector: selectorFor(image),
          needsReview: true,
        }),
      );
    }

    if (trimmed.length > 250) {
      findings.push(
        finding({
          rule: "image-alt-too-long",
          impact: "minor",
          criteria: ["1.1.1"],
          message: `alt text is ${trimmed.length} characters. Long alt text cannot be paused, rewound, or navigated by a screen reader user.`,
          remediation:
            "Keep alt to a short equivalent and move the detail into adjacent text, a <figcaption>, or a linked long description.",
          snippet: snippetFor(image),
          selector: selectorFor(image),
          needsReview: true,
        }),
      );
    }
  }

  for (const svg of root.querySelectorAll("svg")) {
    if (isAriaHidden(svg)) continue;

    const role = tokenAttr(svg, "role");
    const named = accessibleName(svg, root);

    if (named.name === "" && role !== "presentation" && role !== "none") {
      findings.push(
        finding({
          rule: "svg-missing-name",
          impact: "serious",
          criteria: ["1.1.1"],
          message:
            "Inline <svg> has no accessible name and is not hidden, so assistive technology may announce it as an unlabelled graphic or skip it silently.",
          remediation:
            'Add role="img" plus a <title> child (or aria-label) when the graphic carries meaning, or aria-hidden="true" when it is decorative.',
          snippet: snippetFor(svg),
          selector: selectorFor(svg),
        }),
      );
    }
  }

  for (const area of root.querySelectorAll("area")) {
    if (attrOf(area, "alt") === undefined && hasAttr(area, "href")) {
      findings.push(
        finding({
          rule: "area-missing-alt",
          impact: "critical",
          criteria: ["1.1.1", "2.4.4"],
          message:
            "<area> in an image map has no alt attribute, leaving the hotspot unlabelled.",
          remediation:
            "Give each linked <area> alt text naming its destination.",
          snippet: snippetFor(area),
          selector: selectorFor(area),
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Form controls
// -----------------------------------------------------------------------------

function checkFormControls(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  const controls = root.querySelectorAll("input, select, textarea");
  for (const control of controls) {
    if (!isInAccessibilityTree(control)) continue;

    const tag = tagOf(control);
    const type = tokenAttr(control, "type") ?? "text";
    if (
      tag === "input" &&
      (type === "hidden" ||
        type === "submit" ||
        type === "reset" ||
        type === "button" ||
        type === "image")
    ) {
      continue; // Named by value/alt, handled with the other interactive elements.
    }

    const named = accessibleName(control, root);
    const label = `<${tag}${tag === "input" ? ` type="${type}"` : ""}>`;

    if (named.name === "") {
      findings.push(
        finding({
          rule: "control-missing-label",
          impact: "critical",
          criteria: ["1.3.1", "3.3.2", "4.1.2"],
          message: `${label} has no accessible name, so a screen reader announces the field type with no indication of what to type into it.`,
          remediation:
            "Add a <label for> pointing at the control's id, wrap the control in a <label>, or apply aria-label when no visible label exists.",
          snippet: snippetFor(control),
          selector: selectorFor(control),
        }),
      );
      continue;
    }

    if (named.placeholderOnly) {
      findings.push(
        finding({
          rule: "control-placeholder-as-label",
          impact: "serious",
          criteria: ["3.3.2", "4.1.2"],
          message: `${label} is labelled only by its placeholder ("${truncate(named.name, 40)}"). Placeholder text disappears as soon as the user types and is announced inconsistently across screen readers.`,
          remediation:
            "Add a persistent <label>. Keep the placeholder for format hints only, or drop it.",
          snippet: snippetFor(control),
          selector: selectorFor(control),
        }),
      );
    }
  }

  // Radios and checkboxes sharing a name need a group label.
  const groups = new Map<string, HTMLElement[]>();
  for (const control of root.querySelectorAll(
    "input[type=radio], input[type=checkbox]",
  )) {
    const name = attrOf(control, "name")?.trim();
    if (!name) continue;
    const bucket = groups.get(name) ?? [];
    bucket.push(control);
    groups.set(name, bucket);
  }

  for (const [name, members] of groups) {
    if (members.length < 2) continue;
    const first = members[0];
    if (!first) continue;

    const grouped =
      first.closest("fieldset") !== null ||
      first.closest("[role=group]") !== null ||
      first.closest("[role=radiogroup]") !== null;

    if (!grouped) {
      findings.push(
        finding({
          rule: "control-group-missing-label",
          impact: "moderate",
          criteria: ["1.3.1", "3.3.2"],
          message: `The ${members.length} controls named "${name}" are not wrapped in a labelled group, so the question they answer is never announced — only the individual options.`,
          remediation:
            'Wrap the set in a <fieldset> with a <legend>, or a container with role="group" and an accessible name.',
          snippet: snippetFor(first),
          selector: selectorFor(first),
        }),
      );
    }
  }

  // <label for> pointing nowhere silently labels nothing.
  for (const label of root.querySelectorAll("label[for]")) {
    const target = attrOf(label, "for")?.trim();
    if (!target) continue;

    const matches = root
      .querySelectorAll("[id]")
      .some((element) => attrOf(element, "id")?.trim() === target);

    if (!matches) {
      findings.push(
        finding({
          rule: "label-for-missing-target",
          impact: "serious",
          criteria: ["1.3.1", "3.3.2"],
          message: `<label for="${target}"> references an id that does not exist in the document, so the label is associated with nothing.`,
          remediation:
            "Correct the for attribute to match the control's id, or wrap the control in the label.",
          snippet: snippetFor(label),
          selector: selectorFor(label),
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Buttons, links, and other named interactive elements
// -----------------------------------------------------------------------------

function checkInteractiveNames(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  for (const button of root.querySelectorAll(
    "button, [role=button], input[type=submit], input[type=reset], input[type=image]",
  )) {
    if (!isInAccessibilityTree(button)) continue;

    const named = accessibleName(button, root);
    if (named.name === "") {
      findings.push(
        finding({
          rule: "button-missing-name",
          impact: "critical",
          criteria: ["4.1.2", "1.1.1"],
          message:
            'A button has no accessible name. Screen readers announce it as just "button", giving no indication of what it does.',
          remediation:
            "Add visible text inside the button, or aria-label when the control is icon-only.",
          snippet: snippetFor(button),
          selector: selectorFor(button),
        }),
      );
    }
  }

  for (const link of root.querySelectorAll("a")) {
    if (!isInAccessibilityTree(link)) continue;

    if (!hasAttr(link, "href")) {
      // An <a> without href is not a link; if it behaves like one, that is a
      // keyboard problem, reported by the keyboard audit instead.
      continue;
    }

    const named = accessibleName(link, root);

    if (named.name === "") {
      findings.push(
        finding({
          rule: "link-missing-name",
          impact: "critical",
          criteria: ["2.4.4", "4.1.2"],
          message:
            "A link has no accessible name, so it is announced as an unlabelled link and its destination is unknowable.",
          remediation:
            "Put descriptive text inside the link, or add aria-label for icon-only links.",
          snippet: snippetFor(link),
          selector: selectorFor(link),
        }),
      );
      continue;
    }

    const normalised = named.name
      .toLowerCase()
      .replace(/[.!?»>\s]+$/g, "")
      .trim();

    if (VAGUE_LINK_TEXT.has(normalised)) {
      findings.push(
        finding({
          rule: "link-vague-text",
          impact: "moderate",
          criteria: ["2.4.4"],
          message: `Link text "${named.name}" does not describe its destination. Screen reader users often browse a flat list of links where surrounding context is gone.`,
          remediation:
            'Name the destination in the link: "Read the 2026 accessibility report". If the visible text must stay short, extend it with aria-label or visually hidden text.',
          snippet: snippetFor(link),
          selector: selectorFor(link),
          needsReview: true,
        }),
      );
      continue;
    }

    if (/^(https?:\/\/|www\.)/i.test(named.name)) {
      findings.push(
        finding({
          rule: "link-url-as-text",
          impact: "minor",
          criteria: ["2.4.4"],
          message:
            "The link text is a raw URL, which a screen reader may read out character by character.",
          remediation: "Use human-readable text describing the destination.",
          snippet: snippetFor(link),
          selector: selectorFor(link),
          needsReview: true,
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Heading structure
// -----------------------------------------------------------------------------

function checkHeadings(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];
  const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");

  const levels: { element: HTMLElement; level: number }[] = [];

  for (const heading of headings) {
    const level = Number.parseInt(tagOf(heading).slice(1), 10);
    if (!Number.isFinite(level)) continue;

    if (subtreeText(heading) === "" && !isAriaHidden(heading)) {
      findings.push(
        finding({
          rule: "heading-empty",
          impact: "moderate",
          criteria: ["1.3.1", "2.4.6"],
          message: `<${tagOf(heading)}> is empty. It still appears in the screen reader's heading list, as an entry with nothing in it.`,
          remediation:
            "Give the heading text, or remove the element and use CSS for the spacing it was providing.",
          snippet: snippetFor(heading),
          selector: selectorFor(heading),
        }),
      );
    }

    if (isInAccessibilityTree(heading))
      levels.push({ element: heading, level });
  }

  const h1Count = levels.filter((entry) => entry.level === 1).length;

  if (levels.length > 0 && h1Count === 0) {
    findings.push(
      finding({
        rule: "heading-no-h1",
        impact: "moderate",
        criteria: ["1.3.1", "2.4.6"],
        message:
          "The document has headings but no <h1>, so there is no top-level label for what the page is about.",
        remediation:
          "Add a single <h1> naming the page's subject, then nest lower levels beneath it.",
      }),
    );
  }

  if (h1Count > 1) {
    findings.push(
      finding({
        rule: "heading-multiple-h1",
        impact: "minor",
        criteria: ["1.3.1"],
        message: `Found ${h1Count} <h1> elements. More than one top-level heading makes the document outline ambiguous.`,
        remediation:
          "Keep one <h1> for the page and demote the others to <h2>.",
        needsReview: true,
      }),
    );
  }

  let previous: number | undefined;
  for (const { element, level } of levels) {
    if (previous !== undefined && level > previous + 1) {
      findings.push(
        finding({
          rule: "heading-level-skipped",
          impact: "moderate",
          criteria: ["1.3.1"],
          message: `Heading level jumps from h${previous} to h${level}. Screen reader users navigate by level and read a skip as a missing section.`,
          remediation: `Use h${previous + 1} here, or add the intermediate heading the outline implies.`,
          snippet: snippetFor(element),
          selector: selectorFor(element),
        }),
      );
    }
    previous = level;
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Semantic structure: tables, lists, fake headings
// -----------------------------------------------------------------------------

function checkStructure(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  for (const table of root.querySelectorAll("table")) {
    const role = tokenAttr(table, "role");
    if (role === "presentation" || role === "none") continue;

    if (table.querySelectorAll("th").length === 0) {
      findings.push(
        finding({
          rule: "table-missing-headers",
          impact: "serious",
          criteria: ["1.3.1"],
          message:
            "A <table> has no <th> cells, so a screen reader cannot announce which row or column a cell belongs to.",
          remediation:
            'Mark header cells as <th> with scope="col" or scope="row". If the table is only for layout, add role="presentation".',
          snippet: snippetFor(table),
          selector: selectorFor(table),
        }),
      );
    }

    if (
      table.querySelector("caption") === null &&
      accessibleName(table, root).name === ""
    ) {
      findings.push(
        finding({
          rule: "table-missing-caption",
          impact: "minor",
          criteria: ["1.3.1"],
          message:
            "A data table has neither a <caption> nor an accessible name, so it is announced without any indication of what it contains.",
          remediation:
            "Add a <caption> as the first child of the table, or label it with aria-label.",
          snippet: snippetFor(table),
          selector: selectorFor(table),
        }),
      );
    }
  }

  for (const list of root.querySelectorAll("ul, ol")) {
    const invalid = list.childNodes.filter((node) => {
      if (!("rawTagName" in node) || node.rawTagName === "") return false;
      const tag = String(node.rawTagName).toLowerCase();
      return tag !== "li" && tag !== "script" && tag !== "template";
    });

    if (invalid.length > 0) {
      findings.push(
        finding({
          rule: "list-invalid-children",
          impact: "moderate",
          criteria: ["1.3.1"],
          message: `<${tagOf(list)}> has ${invalid.length} direct child element(s) that are not <li>, which breaks the list semantics screen readers announce ("list, 5 items").`,
          remediation:
            "Only <li> may be a direct child of <ul> or <ol>. Move other content inside an <li>.",
          snippet: snippetFor(list),
          selector: selectorFor(list),
        }),
      );
    }
  }

  // Duplicate ids break every ARIA reference and label association to them.
  const idCounts = new Map<string, HTMLElement[]>();
  for (const element of root.querySelectorAll("[id]")) {
    const id = attrOf(element, "id")?.trim();
    if (!id) continue;
    const bucket = idCounts.get(id) ?? [];
    bucket.push(element);
    idCounts.set(id, bucket);
  }

  for (const [id, elements] of idCounts) {
    if (elements.length < 2) continue;
    const first = elements[0];
    findings.push(
      finding({
        rule: "duplicate-id",
        impact: "serious",
        criteria: ["1.3.1", "4.1.2"],
        message: `id="${id}" appears ${elements.length} times. Every label association and ARIA reference to it resolves to the first match only.`,
        remediation: "Make ids unique within the document.",
        ...(first ? { snippet: snippetFor(first), selector: `#${id}` } : {}),
      }),
    );
  }

  return findings;
}

// -----------------------------------------------------------------------------
// ARIA wiring
// -----------------------------------------------------------------------------

const ID_REFERENCE_ATTRS = [
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-details",
  "aria-errormessage",
] as const;

function checkAriaReferences(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  const ids = new Set<string>();
  for (const element of root.querySelectorAll("[id]")) {
    const id = attrOf(element, "id")?.trim();
    if (id) ids.add(id);
  }

  for (const element of root.querySelectorAll("*")) {
    for (const attribute of ID_REFERENCE_ATTRS) {
      const value = attrOf(element, attribute)?.trim();
      if (!value) continue;

      const missing = value
        .split(/\s+/)
        .filter((id) => id !== "" && !ids.has(id));

      if (missing.length > 0) {
        findings.push(
          finding({
            rule: "aria-reference-broken",
            impact: "serious",
            criteria: ["1.3.1", "4.1.2"],
            message: `${attribute} references ${missing.length === 1 ? "an id" : "ids"} that do not exist: ${missing.join(", ")}. The reference is silently dropped.`,
            remediation: `Point ${attribute} at an element that exists in the document, or remove the attribute.`,
            snippet: snippetFor(element),
            selector: selectorFor(element),
          }),
        );
      }
    }
  }

  // Focusable content inside aria-hidden is reachable by keyboard but invisible
  // to a screen reader: the user lands on something that announces nothing.
  for (const hidden of root.querySelectorAll("[aria-hidden=true]")) {
    const focusable = hidden
      .querySelectorAll("a, button, input, select, textarea, [tabindex]")
      .filter((element) => isFocusable(element));

    if (isFocusable(hidden) || focusable.length > 0) {
      findings.push(
        finding({
          rule: "aria-hidden-focusable",
          impact: "serious",
          criteria: ["1.3.1", "4.1.2"],
          message:
            'aria-hidden="true" contains (or is) focusable content. Keyboard users can still reach it, but screen readers announce nothing when they land there.',
          remediation:
            'Remove aria-hidden, or take the content out of the tab order too — add tabindex="-1" (and disable the controls) alongside it.',
          snippet: snippetFor(hidden),
          selector: selectorFor(hidden),
        }),
      );
    }
  }

  return findings;
}

// -----------------------------------------------------------------------------
// Embedded frames
// -----------------------------------------------------------------------------

function checkFrames(root: HTMLElement): Finding[] {
  const findings: Finding[] = [];

  for (const frame of root.querySelectorAll("iframe, frame")) {
    if (isAriaHidden(frame)) continue;

    if (accessibleName(frame, root).name === "") {
      findings.push(
        finding({
          rule: "frame-missing-title",
          impact: "serious",
          criteria: ["4.1.2", "2.4.1"],
          message: `<${tagOf(frame)}> has no title, so it appears in a screen reader's list of frames as an unnamed region.`,
          remediation:
            'Add a title describing the embedded content: title="Payment form".',
          snippet: snippetFor(frame),
          selector: selectorFor(frame),
        }),
      );
    }
  }

  return findings;
}
