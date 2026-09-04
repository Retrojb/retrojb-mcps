/**
 * Verifies this site's own palette against WCAG 1.4.3 and 1.4.11.
 *
 * Uses the same engine the wcag-a11y-scanner MCP server uses, so the docs site
 * is held to the standard it documents. Run with `npm run check:contrast`.
 *
 * Exits non-zero on any failure so it can gate a build.
 */
import { checkContrast } from "@retrojb/wcag-a11y-scanner";

/**
 * Palette, kept in step with app/globals.css.
 *
 * `accentForeground` and `dangerForeground` are not declared in globals.css —
 * they come from `@retrojb/ui`, which needs a text colour for a filled button and
 * has no other way to know one. They are checked here because this site renders
 * those buttons, and a pairing nobody checks is a pairing that drifts.
 */
const THEMES = {
  light: {
    background: "#ffffff",
    surface: "#f6f7f9",
    surfaceRaised: "#ffffff",
    foreground: "#16181a",
    foregroundMuted: "#5a5f66",
    borderStrong: "#767b82",
    accent: "#0b5cd5",
    accentText: "#0b5cd5",
    accentHover: "#093f92",
    accentForeground: "#ffffff",
    danger: "#b3261e",
    dangerForeground: "#ffffff",
    success: "#1a6b3c",
    focusRing: "#0b5cd5",
  },
  dark: {
    background: "#0b0d0f",
    surface: "#14171a",
    surfaceRaised: "#1a1e22",
    foreground: "#ecedee",
    foregroundMuted: "#a6adb5",
    borderStrong: "#6e757d",
    accent: "#7cb0ff",
    accentText: "#7cb0ff",
    accentHover: "#a8caff",
    // Dark, not white: the dark-mode accent is a light blue, so a filled button
    // flips its text colour. White here would be 1.9:1 and fail outright.
    accentForeground: "#0b0d0f",
    danger: "#ff9d95",
    dangerForeground: "#0b0d0f",
    success: "#6bd39a",
    focusRing: "#7cb0ff",
  },
};

/**
 * Every pairing the site actually renders, with the role it plays.
 *
 * `text` pairings are held to 4.5:1 (1.4.3 AA at normal size); `ui-component`
 * pairings to 3:1 (1.4.11 AA).
 */
function pairings(theme) {
  return [
    ["body text on page", theme.foreground, theme.background, "text"],
    ["body text on surface", theme.foreground, theme.surface, "text"],
    ["muted text on page", theme.foregroundMuted, theme.background, "text"],
    ["muted text on surface", theme.foregroundMuted, theme.surface, "text"],
    ["link on page", theme.accentText, theme.background, "text"],
    ["link on surface", theme.accentText, theme.surface, "text"],
    ["link hover on page", theme.accentHover, theme.background, "text"],
    ["danger text on page", theme.danger, theme.background, "text"],
    ["danger text on surface", theme.danger, theme.surface, "text"],
    ["success text on page", theme.success, theme.background, "text"],
    ["success text on surface", theme.success, theme.surface, "text"],
    ["skip link text", theme.background, theme.foreground, "text"],
    [
      "control boundary on page",
      theme.borderStrong,
      theme.background,
      "ui-component",
    ],
    [
      "control boundary on surface",
      theme.borderStrong,
      theme.surface,
      "ui-component",
    ],
    ["focus ring on page", theme.focusRing, theme.background, "ui-component"],
    ["focus ring on surface", theme.focusRing, theme.surface, "ui-component"],

    // Pairings introduced by the @retrojb/ui primitives.
    ["primary button label", theme.accentForeground, theme.accent, "text"],
    [
      "primary button hover label",
      theme.accentForeground,
      theme.accentHover,
      "text",
    ],
    ["danger button label", theme.dangerForeground, theme.danger, "text"],
    ["secondary button label", theme.foreground, theme.surface, "text"],
    ["input text", theme.foreground, theme.surfaceRaised, "text"],
    ["input placeholder", theme.foregroundMuted, theme.surfaceRaised, "text"],
    [
      "primary button edge on page",
      theme.accent,
      theme.background,
      "ui-component",
    ],
    [
      "input border on page",
      theme.borderStrong,
      theme.surfaceRaised,
      "ui-component",
    ],
    [
      "invalid input border on page",
      theme.danger,
      theme.surfaceRaised,
      "ui-component",
    ],
  ];
}

let failures = 0;

for (const [themeName, theme] of Object.entries(THEMES)) {
  console.log(`\n${themeName} theme`);
  console.log("-".repeat(72));

  for (const [label, foreground, background, contentType] of pairings(theme)) {
    const result = checkContrast({
      foreground,
      background,
      contentType,
      targetLevel: "AA",
    });

    const required = result.results[0]?.requiredRatio ?? 4.5;
    const status = result.passesTarget ? "pass" : "FAIL";
    if (!result.passesTarget) failures += 1;

    console.log(
      `  ${status}  ${String(result.ratio).padStart(5)}:1  (needs ${required}:1)  ` +
        `${label.padEnd(28)} ${foreground} on ${background}`,
    );
  }
}

console.log(
  failures === 0
    ? "\nAll palette pairings meet WCAG 2 level AA."
    : `\n${failures} pairing(s) fail WCAG 2 level AA.`,
);

process.exit(failures === 0 ? 0 : 1);
