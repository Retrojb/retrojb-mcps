/**
 * Verifies the palette this site renders against WCAG 1.4.3 and 1.4.11.
 *
 * Uses the same engine the wcag-a11y-scanner MCP server uses, so the docs site is
 * held to the standard it documents. Run with `npm run check:contrast`.
 *
 *
 * WHY THIS READS A FILE RATHER THAN DECLARING A PALETTE
 *
 * It used to carry a hand-maintained JS mirror of the tokens in
 * `app/globals.css`, with a comment asking whoever changed a colour to keep the
 * two in step. They went out of step. The library's palette moved to a purple ramp
 * and this script went on checking the old blue, so six failing light-mode
 * pairings were invisible from here — and the script reported "All palette
 * pairings meet WCAG 2 level AA" the whole time.
 *
 * So it parses the token sources in `packages/tokens/src` instead, resolves the `var()`
 * chains the way a browser would, and checks what it finds. There is no list of
 * colours to keep in step because there is no second copy. Add a token to the
 * ramp and it is checked; point a semantic token at a different step and the new
 * pairing is what gets measured.
 *
 * Two things it checks that a hand-written list could not:
 *
 *   1. The ramp contracts. Steps 5-9 of each ramp carry a documented minimum
 *      against the surfaces below them, and those are verified per ramp per theme
 *      rather than asserted in a comment.
 *   2. Cross-ramp pairings. `--accent` comes from `--primary-8` but lands on
 *      *neutral* surfaces, where the numbers are different. That is the mistake
 *      this script exists to catch, and it is the one a per-ramp check misses.
 *
 * Exits non-zero on any failure so it can gate a build.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

import { checkContrast } from "@retrojb/wcag-a11y-scanner";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS_SRC = resolvePath(HERE, "../../../packages/tokens/src");
const LIGHT_FILE = resolvePath(TOKENS_SRC, "light.css");
const DARK_FILE = resolvePath(TOKENS_SRC, "dark.css");

/*
 * The palette is authored as two files: `light.css` holds every colour token,
 * and `dark.css` holds only the values that differ in dark mode. The shipped
 * stylesheet pairs them into `light-dark()` declarations, but the engine parses
 * plain colours only, so the sources are what gets measured. They are also what
 * the build reads, so there is no second copy to drift from.
 */

function declarations(block) {
  const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = {};
  for (const match of withoutComments.matchAll(
    /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi,
  )) {
    found[match[1].trim()] = match[2].trim();
  }
  return found;
}

const LIGHT_DECLS = declarations(readFileSync(LIGHT_FILE, "utf8"));
const DARK_DECLS = declarations(readFileSync(DARK_FILE, "utf8"));

/**
 * Resolves a token to a literal colour, following `var()` chains.
 *
 * Dark shadows light rather than replacing it, which is how the build pairs
 * them: `dark.css` restates only the ramps and the handful of values that
 * differ, and every semantic token declared once in the light `:root` resolves
 * through to whatever is in scope.
 */
function resolveToken(name, theme, seen = new Set()) {
  const key = name.startsWith("--") ? name : `--${name}`;
  if (seen.has(key)) {
    throw new Error(`Cyclic custom property: ${key}`);
  }
  seen.add(key);

  const table =
    theme === "dark" ? { ...LIGHT_DECLS, ...DARK_DECLS } : LIGHT_DECLS;
  const declared = table[key];
  if (declared === undefined) return null;

  const reference = /^var\(\s*(--[a-z0-9-]+)/i.exec(declared);
  return reference ? resolveToken(reference[1], theme, seen) : declared;
}

const RAMPS = ["primary", "secondary", "neutral"];

/**
 * The contract each contracted ramp step carries, from the table in `packages/tokens/src/light.css`.
 *
 * Steps 0-4 are surfaces and decorative borders and carry none: 1.4.11 governs
 * boundaries that identify a control, and a separator between two rows identifies
 * nothing. Steps 5 and 6 are boundaries, 7 upward is text.
 */
const RAMP_CONTRACTS = [
  [5, "ui-component"],
  [6, "ui-component"],
  [7, "text"],
  [8, "text"],
  [9, "text"],
];

/** Surfaces anything can land on. `--neutral-3` is the worst in both themes. */
const SURFACES = [
  "background",
  "surface-sunken",
  "surface-base",
  "surface-raised-1",
  "surface-raised-2",
  "surface-overlay",
  "neutral-1",
  "neutral-2",
  "neutral-3",
];

/**
 * The semantic tokens this site renders, and what each is measured as.
 *
 * `code-background` is not a library token — `app/globals.css` derives it from
 * `--neutral-1`, one step off the page in either theme. Named here so the code and
 * pre blocks are covered too.
 */
const SEMANTIC_TEXT = [
  ["body text", "foreground"],
  ["muted text", "foreground-muted"],
  ["link text", "accent-text"],
  ["danger text", "danger"],
  ["success text", "success"],
];

const SEMANTIC_UI = [
  ["control boundary", "border-strong"],
  ["focus ring", "focus-ring"],
  ["accent fill edge", "accent"],
  ["accent hover edge", "accent-hover"],
];

/** Text sitting on a filled surface rather than on the page. */
const ON_FILL = [
  ["label on accent", "accent-foreground", "accent"],
  ["label on accent hover", "accent-foreground", "accent-hover"],
  ["label on danger", "danger-foreground", "danger"],
  ["code text", "foreground", "neutral-1"],
];

/**
 * Code-highlight sentiments, and the surfaces a code block actually fills with.
 *
 * Unlike the semantic text tokens, these are not measured against every surface
 * in the app. Code lives in a well: `CodeSnippet` and `CodeBlock` fill with
 * `--surface-sunken`, and the docs' own `pre`/`code` fill with
 * `--surface-raised-1`. Those are the only backgrounds a highlighted run ever
 * lands on, so measuring against `--background` or a mid-grey `--neutral-2`
 * would hold the palette to a contract it never has to meet. `--surface-sunken`
 * is the darker of the two in light mode and the lighter in dark, so each
 * sentiment is solved there as the worst case (1.4.3).
 */
const CODE_SENTIMENTS = [
  ["code positive", "code-positive"],
  ["code negative", "code-negative"],
  ["code special", "code-special"],
  ["code emphasis", "code-emphasis"],
  ["code neutral", "code-neutral"],
];
const CODE_SURFACES = ["surface-sunken", "surface-raised-1"];

let failures = 0;
let checks = 0;

function report(label, foreground, background, contentType) {
  if (foreground === null || background === null) {
    failures += 1;
    console.log(`  BROKEN  ${label} — a token resolved to nothing`);
    return;
  }

  const result = checkContrast({
    foreground,
    background,
    contentType,
    targetLevel: "AA",
  });

  checks += 1;
  const required = result.results.find((entry) => entry.level === "AA");
  if (!result.passesTarget) failures += 1;

  console.log(
    `  ${result.passesTarget ? "pass" : "FAIL"}  ${String(result.ratio).padStart(5)}:1  ` +
      `(needs ${String(required?.requiredRatio ?? 4.5).padStart(3)}:1)  ` +
      `${label.padEnd(38)} ${foreground} on ${background}`,
  );
}

for (const theme of ["light", "dark"]) {
  console.log(`\n${theme} theme — ramp contracts`);
  console.log("-".repeat(88));

  for (const ramp of RAMPS) {
    for (const [step, contentType] of RAMP_CONTRACTS) {
      const foreground = resolveToken(`${ramp}-${step}`, theme);
      // Against every surface in its own ramp, not just step 0. A boundary solved
      // for 3:1 on the page drops below it on a hover surface.
      for (const surfaceStep of [0, 1, 2, 3]) {
        report(
          `--${ramp}-${step} on --${ramp}-${surfaceStep}`,
          foreground,
          resolveToken(`${ramp}-${surfaceStep}`, theme),
          contentType,
        );
      }
    }
  }

  console.log(
    `\n${theme} theme — semantic tokens, on every surface they can reach`,
  );
  console.log("-".repeat(88));

  for (const [label, token] of SEMANTIC_TEXT) {
    for (const surface of SURFACES) {
      report(
        `${label} on --${surface}`,
        resolveToken(token, theme),
        resolveToken(surface, theme),
        "text",
      );
    }
  }

  for (const [label, token] of SEMANTIC_UI) {
    for (const surface of SURFACES) {
      report(
        `${label} on --${surface}`,
        resolveToken(token, theme),
        resolveToken(surface, theme),
        "ui-component",
      );
    }
  }

  console.log(`\n${theme} theme — text on filled surfaces`);
  console.log("-".repeat(88));

  for (const [label, foreground, background] of ON_FILL) {
    report(
      label,
      resolveToken(foreground, theme),
      resolveToken(background, theme),
      "text",
    );
  }

  console.log(`\n${theme} theme — code-highlight sentiments, on the code well`);
  console.log("-".repeat(88));

  for (const [label, token] of CODE_SENTIMENTS) {
    for (const surface of CODE_SURFACES) {
      report(
        `${label} on --${surface}`,
        resolveToken(token, theme),
        resolveToken(surface, theme),
        "text",
      );
    }
  }
}

console.log(
  failures === 0
    ? `\n${checks} pairings checked. All meet WCAG 2 level AA.`
    : `\n${checks} pairings checked, ${failures} fail WCAG 2 level AA.`,
);

process.exit(failures === 0 ? 0 : 1);
