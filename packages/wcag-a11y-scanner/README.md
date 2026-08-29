# wcag-a11y-scanner

An MCP server that applies WCAG 2 guidelines for **colour contrast**, **screen
reader support**, and **keyboard/tab navigation**.

It gives an AI coding agent two things: the knowledge to reason about these
criteria, and tools to check real values against them — contrast ratios computed
properly, and markup scanned for the failures that are actually decidable from
static HTML.

## Tools

| Tool                       | What it does                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check_color_contrast`     | Computes the contrast ratio for a pairing and evaluates it against every criterion that applies — 1.4.3 and 1.4.6 for text, 1.4.11 for controls and graphics. Returns a per-criterion verdict, plus replacement colours when it fails. |
| `suggest_accessible_color` | Adjusts a colour to reach a target ratio, holding hue and saturation constant so the result still looks like the original.                                                                                                             |
| `audit_html`               | Scans a document or fragment and returns findings ordered by severity, each mapped to the criteria it violates with a concrete fix.                                                                                                    |
| `explain_wcag_criterion`   | One criterion in plain language: what it requires, how to meet it, how it is commonly failed.                                                                                                                                          |
| `list_wcag_criteria`       | Lists covered criteria, filterable by topic, level, and free-text search.                                                                                                                                                              |

## Resources

| URI                           | Contents                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| `wcag://guide/color-contrast` | Every colour and contrast criterion, in plain language.             |
| `wcag://guide/screen-reader`  | Every screen reader criterion, in plain language.                   |
| `wcag://guide/keyboard`       | Every keyboard and focus criterion, in plain language.              |
| `wcag://criterion/{id}`       | One criterion by dotted number, e.g. `wcag://criterion/1.4.3`.      |
| `wcag://checklist`            | The manual passes that cannot be automated, ordered cheapest first. |

## Setup

```sh
npm install
npx turbo build --filter=@retrojb/wcag-a11y-scanner
```

Register it with any stdio MCP host. For Kiro, in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "@retrojb/wcag-a11y-scanner": {
      "command": "node",
      "args": ["packages/wcag-a11y-scanner/dist/bin.js"],
      "disabled": false
    }
  }
}
```

To exercise the tools without a host:

```sh
npm run inspect --workspace @retrojb/wcag-a11y-scanner
```

## Use as a library

The package is also importable, side-effect free:

```ts
import {
  auditHtml,
  checkContrast,
  getCriterion,
} from "@retrojb/wcag-a11y-scanner";

const result = checkContrast({
  foreground: "#767676",
  background: "#ffffff",
  text: { fontSizePx: 16 },
});
// result.ratio === 4.54, result.passesTarget === true

const audit = auditHtml("<img src=hero.png>");
// audit.findings[0].rule === "image-missing-alt"
```

The `docs` app uses it this way: every contrast figure on the documentation site
is computed at build time by this package, so the two cannot drift apart.

## What it covers

25 success criteria across three areas. Colour and contrast: 1.4.1, 1.4.3,
1.4.6, 1.4.11. Screen readers: 1.1.1, 1.3.1, 1.3.2, 1.3.5, 2.4.2, 2.4.4, 2.4.6,
3.1.1, 3.3.2, 4.1.2, 4.1.3. Keyboard: 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11,
2.4.12, 2.4.13, 2.5.8, 3.2.1.

Criterion text is paraphrased for clarity. The normative source is
[WCAG 2.2](https://www.w3.org/TR/WCAG22/) and it wins in any disagreement.

## What it cannot do

Worth being blunt about, because an accessibility tool that overstates itself is
worse than no tool.

The audit is **static analysis of markup**. It does not execute JavaScript,
apply stylesheets, or observe focus behaviour, so it sees the initial HTML
rather than what a user encounters.

- **Contrast coverage is partial.** Only colours written into inline `style`
  attributes are measured. Anything from a stylesheet, a class, or a custom
  property has to be passed to `check_color_contrast` by hand.
- **Keyboard behaviour is inferred, not observed.** Focus order, focus
  visibility, and keyboard traps are runtime properties. The rules catch common
  static causes — positive `tabindex`, handlers on unfocusable elements,
  suppressed outlines, broken skip links — not the behaviours themselves.
- **Judgement calls stay with the human.** Whether alt text describes the right
  thing, whether a heading summarises its section, whether a custom widget
  behaves as its role promises: none of this is machine-decidable.

Two design decisions follow from that. Every finding carries a `needsReview`
flag, set when the rule found a _candidate_ rather than a proven violation. And
every audit result carries a `limitations` list, reported even when nothing was
flagged — because a clean scan is not conformance.

## Contrast implementation notes

- Relative luminance and the contrast ratio follow the WCAG 2 definitions
  exactly, including the post-2021 `0.04045` linearisation threshold.
- Ratios are reported truncated to two decimals rather than rounded, so a
  displayed `4.49` never claims to clear `4.5`.
- Translucent colours are composited before measurement: the foreground over the
  background, and a translucent background over white, which is WCAG's stated
  assumption when no backdrop is specified. Both are called out in `notes`.
- Text size follows WCAG's `large scale` definition — at least 18pt, or 14pt
  bold — which works out to 24px and 18.67px in CSS pixels.
- `lab()`, `oklch()`, `color-mix()`, `currentColor`, and `var()` are rejected
  rather than guessed at. Resolving them needs a CSS engine, and a wrong number
  that looks authoritative is worse than an error.
