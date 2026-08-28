import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";

/**
 * Parses a fragment or full document into a queryable tree.
 *
 * Tag names are lowercased so selectors and comparisons can assume lower case.
 */
export function parseDocument(html: string): HTMLElement {
  return parse(html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: { script: true, style: true, pre: true },
  });
}

/** Lowercased tag name, e.g. `"div"`. */
export function tagOf(element: HTMLElement): string {
  return (element.rawTagName || element.tagName || "").toLowerCase();
}

/**
 * Case-insensitive attribute lookup.
 *
 * HTML attribute names are case-insensitive, but the parser preserves whatever
 * the author wrote, so `getAttribute` alone would miss `ARIA-Label`.
 */
export function attrOf(element: HTMLElement, name: string): string | undefined {
  const direct = element.getAttribute(name);
  if (direct !== undefined) return direct;

  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(element.attributes)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
}

/** Whether the attribute is present at all, regardless of its value. */
export function hasAttr(element: HTMLElement, name: string): boolean {
  return attrOf(element, name) !== undefined;
}

/** Reads an attribute as a trimmed, lowercased token. */
export function tokenAttr(
  element: HTMLElement,
  name: string,
): string | undefined {
  return attrOf(element, name)?.trim().toLowerCase();
}

/** Whether an element is explicitly hidden from assistive technology. */
export function isAriaHidden(element: HTMLElement): boolean {
  return tokenAttr(element, "aria-hidden") === "true";
}

/**
 * Whether an element is hidden from everyone, including assistive technology.
 *
 * Only catches the cases visible in static markup: the `hidden` attribute and
 * inline `display: none` / `visibility: hidden`. Stylesheet-driven hiding needs
 * a rendered page, so it is out of reach here.
 */
export function isHiddenFromAll(element: HTMLElement): boolean {
  if (hasAttr(element, "hidden")) return true;

  const style = tokenAttr(element, "style") ?? "";
  return (
    /display\s*:\s*none/.test(style) || /visibility\s*:\s*hidden/.test(style)
  );
}

/** Whether the element or any ancestor is hidden from assistive technology. */
export function isInAccessibilityTree(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current instanceof HTMLElement) {
    if (isAriaHidden(current) || isHiddenFromAll(current)) return false;
    current = current.parentNode;
  }
  return true;
}

/**
 * Text an assistive technology would read from an element's subtree.
 *
 * Follows the shape of the accessible-name-from-content algorithm: text nodes
 * contribute directly, `img` descendants contribute their `alt`, and anything
 * hidden contributes nothing.
 */
export function subtreeText(element: HTMLElement): string {
  const parts: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      parts.push(node.text);
      return;
    }

    if (!(node instanceof HTMLElement)) return;
    if (isAriaHidden(node) || isHiddenFromAll(node)) return;

    const tag = tagOf(node);
    if (tag === "script" || tag === "style" || tag === "template") return;

    if (tag === "img" || tag === "area") {
      const alt = attrOf(node, "alt");
      if (alt !== undefined && alt.trim() !== "") parts.push(alt);
      return;
    }

    if (tag === "input") {
      const type = tokenAttr(node, "type") ?? "text";
      if (type === "image") {
        const alt = attrOf(node, "alt");
        if (alt) parts.push(alt);
      } else if (type === "submit" || type === "reset" || type === "button") {
        const value = attrOf(node, "value");
        if (value) parts.push(value);
      }
      return;
    }

    for (const child of node.childNodes) walk(child);
  };

  for (const child of element.childNodes) walk(child);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Where an accessible name came from, for explaining findings. */
export type NameSource =
  | "aria-labelledby"
  | "aria-label"
  | "alt"
  | "value"
  | "label-element"
  | "legend"
  | "caption"
  | "svg-title"
  | "content"
  | "title"
  | "placeholder"
  | "none";

export interface AccessibleName {
  /** Empty string when the element has no accessible name. */
  readonly name: string;
  readonly source: NameSource;
  /**
   * `true` when the only thing naming this element is `placeholder`, which
   * WCAG 3.3.2 does not accept as a label.
   */
  readonly placeholderOnly: boolean;
}

const EMPTY_NAME: AccessibleName = {
  name: "",
  source: "none",
  placeholderOnly: false,
};

/** Elements whose accessible name comes from their own text content. */
const NAME_FROM_CONTENT = new Set([
  "a",
  "button",
  "summary",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "legend",
  "caption",
  "td",
  "th",
  "option",
]);

/** Form controls that take their name from an associated `<label>`. */
const LABELABLE = new Set(["input", "select", "textarea", "meter", "progress"]);

/**
 * Computes an element's accessible name.
 *
 * This is a pragmatic subset of HTML-AAM, not a full implementation: it covers
 * the sources that actually decide names in ordinary markup, in specification
 * precedence order. It cannot resolve names that depend on CSS generated
 * content or on a live accessibility tree.
 *
 * @param root - the document root, needed to resolve `aria-labelledby` and
 *   `<label for>` references by id.
 */
export function accessibleName(
  element: HTMLElement,
  root: HTMLElement,
): AccessibleName {
  const tag = tagOf(element);

  // 1. aria-labelledby wins over everything else.
  const labelledBy = attrOf(element, "aria-labelledby")?.trim();
  if (labelledBy) {
    const referenced = labelledBy
      .split(/\s+/)
      .map((id) => root.querySelector(`#${cssEscapeId(id)}`))
      .filter((node): node is HTMLElement => node !== null)
      .map((node) => subtreeText(node) || attrOf(node, "value") || "")
      .filter((text) => text !== "");

    if (referenced.length > 0) {
      return {
        name: referenced.join(" ").trim(),
        source: "aria-labelledby",
        placeholderOnly: false,
      };
    }
  }

  // 2. aria-label.
  const ariaLabel = attrOf(element, "aria-label")?.trim();
  if (ariaLabel) {
    return { name: ariaLabel, source: "aria-label", placeholderOnly: false };
  }

  // 3. Host-language sources.
  if (tag === "img" || tag === "area") {
    const alt = attrOf(element, "alt");
    if (alt !== undefined) {
      return { name: alt.trim(), source: "alt", placeholderOnly: false };
    }
  }

  if (tag === "input") {
    const type = tokenAttr(element, "type") ?? "text";

    if (type === "image") {
      const alt = attrOf(element, "alt")?.trim();
      if (alt) return { name: alt, source: "alt", placeholderOnly: false };
    }

    if (type === "submit" || type === "reset" || type === "button") {
      const value = attrOf(element, "value")?.trim();
      if (value)
        return { name: value, source: "value", placeholderOnly: false };
      // submit and reset have implicit default labels from the user agent.
      if (type === "submit" || type === "reset") {
        return { name: type, source: "value", placeholderOnly: false };
      }
    }
  }

  if (LABELABLE.has(tag)) {
    const fromLabel = labelTextFor(element, root);
    if (fromLabel) {
      return {
        name: fromLabel,
        source: "label-element",
        placeholderOnly: false,
      };
    }
  }

  if (tag === "fieldset") {
    const legend = element.querySelector("legend");
    const text = legend ? subtreeText(legend) : "";
    if (text) return { name: text, source: "legend", placeholderOnly: false };
  }

  if (tag === "table") {
    const caption = element.querySelector("caption");
    const text = caption ? subtreeText(caption) : "";
    if (text) return { name: text, source: "caption", placeholderOnly: false };
  }

  if (tag === "svg") {
    const title = element.querySelector("title");
    const text = title ? subtreeText(title) : "";
    if (text)
      return { name: text, source: "svg-title", placeholderOnly: false };
  }

  if (tag === "iframe") {
    const title = attrOf(element, "title")?.trim();
    if (title) return { name: title, source: "title", placeholderOnly: false };
  }

  // 4. Name from content, for roles that allow it.
  if (NAME_FROM_CONTENT.has(tag) || tokenAttr(element, "role") === "button") {
    const text = subtreeText(element);
    if (text) return { name: text, source: "content", placeholderOnly: false };
  }

  // 5. title attribute is the last resort the spec allows.
  const title = attrOf(element, "title")?.trim();
  if (title) return { name: title, source: "title", placeholderOnly: false };

  // 6. Not a valid naming source, but worth reporting distinctly: authors
  //    reach for placeholder constantly and it does not satisfy 3.3.2.
  const placeholder = attrOf(element, "placeholder")?.trim();
  if (placeholder) {
    return { name: placeholder, source: "placeholder", placeholderOnly: true };
  }

  return EMPTY_NAME;
}

/** Finds label text via `<label for>` or an ancestor `<label>`. */
function labelTextFor(
  element: HTMLElement,
  root: HTMLElement,
): string | undefined {
  const id = attrOf(element, "id")?.trim();
  if (id) {
    for (const label of root.querySelectorAll("label")) {
      if (attrOf(label, "for")?.trim() === id) {
        const text = subtreeText(label);
        if (text) return text;
      }
    }
  }

  const wrapping = element.closest("label");
  if (wrapping) {
    const text = subtreeText(wrapping);
    if (text) return text;
  }

  return undefined;
}

/**
 * Escapes an id for use in a CSS id selector.
 *
 * Ids in real markup contain colons, dots, and brackets (React and Rails both
 * generate them), which would otherwise be read as selector syntax.
 */
function cssEscapeId(id: string): string {
  return id.replace(/([^\w-])/g, "\\$1");
}

/** ARIA roles that are inherently interactive and need keyboard operability. */
export const INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
  "treeitem",
]);

/** Elements that are focusable without an author-supplied `tabindex`. */
const NATIVELY_FOCUSABLE = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "summary",
]);

/**
 * Whether an element sits in the tab order.
 *
 * `a` and `area` are focusable only with an `href`; form controls lose focus
 * when disabled; an explicit `tabindex` overrides in either direction.
 */
export function isFocusable(element: HTMLElement): boolean {
  const tabindex = attrOf(element, "tabindex")?.trim();
  if (tabindex !== undefined) {
    const parsed = Number.parseInt(tabindex, 10);
    if (Number.isFinite(parsed)) return parsed >= 0;
  }

  const tag = tagOf(element);
  if (tag === "a" || tag === "area") return hasAttr(element, "href");
  if (NATIVELY_FOCUSABLE.has(tag)) {
    return (
      !hasAttr(element, "disabled") && tokenAttr(element, "type") !== "hidden"
    );
  }
  if (hasAttr(element, "contenteditable")) {
    return tokenAttr(element, "contenteditable") !== "false";
  }

  return false;
}

/** Whether an element is meant to be operated by the user. */
export function isInteractive(element: HTMLElement): boolean {
  const role = tokenAttr(element, "role");
  if (role !== undefined && INTERACTIVE_ROLES.has(role)) return true;

  const tag = tagOf(element);
  if (tag === "a" || tag === "area") return hasAttr(element, "href");
  return NATIVELY_FOCUSABLE.has(tag) || tag === "details";
}

/**
 * A short, stable-ish CSS selector for reporting where a finding lives.
 *
 * Prefers an id, then falls back to tag plus classes, then to a nth-of-type
 * path from the closest identified ancestor. Good enough for a human to find
 * the element; not guaranteed unique in pathological markup.
 */
export function selectorFor(element: HTMLElement): string {
  const id = attrOf(element, "id")?.trim();
  if (id) return `#${id}`;

  const tag = tagOf(element);
  const classes = element.classNames
    .split(/\s+/)
    .filter((name) => name.length > 0)
    .slice(0, 2);

  const base = classes.length > 0 ? `${tag}.${classes.join(".")}` : tag;

  const parent = element.parentNode;
  if (!(parent instanceof HTMLElement)) return base;

  const parentId = attrOf(parent, "id")?.trim();
  const siblings = parent.childNodes.filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && tagOf(node) === tag,
  );

  const suffix =
    siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(element) + 1})` : "";

  return parentId ? `#${parentId} > ${base}${suffix}` : `${base}${suffix}`;
}

/** The element's opening tag, truncated, for inclusion in a finding. */
export function snippetFor(element: HTMLElement, maxLength = 160): string {
  const outer = element.outerHTML;
  const openTagEnd = outer.indexOf(">");
  const opening = openTagEnd === -1 ? outer : outer.slice(0, openTagEnd + 1);

  const text = opening.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/** Inline `style` declarations as a lowercased property map. */
export function inlineStyle(element: HTMLElement): Map<string, string> {
  const style = attrOf(element, "style");
  const map = new Map<string, string>();
  if (!style) return map;

  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (property && value) map.set(property, value);
  }

  return map;
}

/** Concatenated contents of every `<style>` element in the document. */
export function collectStyleText(root: HTMLElement): string {
  return root
    .querySelectorAll("style")
    .map((element) => element.innerHTML)
    .join("\n");
}
