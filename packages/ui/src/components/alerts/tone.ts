/*
 * The parts every alert shares.
 *
 * Three components in this directory draw the same box — an inline notice, a toast
 * and a modal alert dialog — and the tone colours are the one thing among them that
 * carries a contrast guarantee. Copied into three `styles.ts` files, that guarantee
 * would be documented three times and true in however many of them someone
 * remembered to update. So the tone map lives here, once, with its measured ratios.
 *
 * This module holds class-name fragments rather than a `tv()` definition. Each
 * component still owns its own variants, its own slots and its own padding scale —
 * a toast is positioned and a dialog is centred and neither wants the other's
 * layout. What they share is the surface, the tone and the dismiss affordance.
 *
 * No `"use client"`, so all of it stays callable from a server component.
 */

/**
 * The tone → class mapping, as `{ bar, label }` per tone.
 *
 * Ratios are the measured output of `@retrojb/wcag-a11y-scanner`, light / dark,
 * against `--surface` — which is the fill every alert here sets on itself, so these
 * are the numbers that actually apply rather than page-background approximations.
 *
 * `bar` is the inline-start edge; `label` is the word naming the tone. Both are
 * quoted because both are perceivable content: the bar has to clear 1.4.11 at 3:1
 * as a meaningful graphic, and the label has to clear 1.4.3 at 4.5:1 as text.
 *
 * There is no `warning`, and that is a decision rather than an oversight. The
 * palette ships no `--warning` token, and an amber solved for 4.5:1 against
 * `--surface` lands at exactly 4.5:1 in both themes — no headroom left for
 * `--background` or `--surface-raised`, and nothing left for a filled variant. A
 * fourth tone wants its own ten-step ramp alongside `--primary` and `--secondary`,
 * not a single value squeezed onto one surface.
 */
const ALERT_TONE = {
  /** bar 8.82 / 9.72:1 · label 15.33 / 14.50:1 */
  info: { bar: "border-s-accent", label: "text-accent-text" },
  /** bar 8.99 / 9.77:1 · label 8.99 / 9.77:1 */
  success: { bar: "border-s-success", label: "text-success" },
  /** bar 8.91 / 9.00:1 · label 8.91 / 9.00:1 */
  danger: { bar: "border-s-danger", label: "text-danger" },
} as const;

/** The tones an alert can take. */
type AlertTone = keyof typeof ALERT_TONE;

/**
 * The alert box: fill, edge and radius, with the tone bar's width but not its
 * colour.
 *
 * `border-y-border-strong` and `border-e-border-strong` rather than one
 * `border-border-strong`, because the inline-start edge is the tone bar and must
 * keep its own colour. Side-scoped colour utilities are separate tailwind-merge
 * groups, so the two cannot overwrite each other — a blanket `border-border-strong`
 * next to `border-s-danger` would come down to whichever Tailwind happened to emit
 * last.
 *
 * `--border-strong` and not `--border`. On the page surfaces `--border` measures
 * 1.75-2.67:1 in light and 2.02-2.21:1 in dark and misses 1.4.11 on all of them,
 * while `--border-strong` clears it at 4.16-6.36:1. The edge has to carry the box,
 * because the fill cannot: `--surface` against `--background` is 1.42:1 in light and
 * 1.09:1 in dark, which is no visible boundary at all.
 *
 * Logical sides throughout, so the bar stays on the reading-order edge in RTL.
 */
const ALERT_SURFACE = [
  "bg-surface text-foreground",
  "rounded-control",
  "border border-y-border-strong border-e-border-strong",
  "border-s-4",
];

/**
 * The dismiss button.
 *
 * `size-6` is 24px, which is exactly the floor in 2.5.8 (AA). It does not reach the
 * 44px in 2.5.5 (AAA) — the same trade `Button` makes at `sm` and `md`, and a close
 * affordance in the corner of a notice is a hard place to spend 44px.
 *
 * The focus indicator is the one every other component in this package uses: a 2px
 * outline at a 2px offset (2.4.7, 2.4.13), an `outline` rather than a ring
 * box-shadow because outlines survive forced-colors mode where shadows are dropped.
 */
const ALERT_DISMISS = [
  "inline-flex size-6 shrink-0 items-center justify-center",
  "rounded-control cursor-pointer select-none",
  "text-foreground-muted hover:text-foreground",
  "transition-colors motion-reduce:transition-none",
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
];

/** The visible word for each tone when the caller supplies none. */
const ALERT_TONE_LABELS = {
  info: "Note",
  success: "Success",
  danger: "Error",
} as const satisfies Record<AlertTone, string>;

/**
 * Builds the `tone` variant block for a `tv()` definition.
 *
 * Each component names its own slots, so the tone classes have to be mapped onto
 * whatever that component calls its box and its label. Passing the two slot names
 * in keeps the mapping here and the slot vocabulary there.
 */
const toneVariants = <TBox extends string, TLabel extends string>(
  boxSlot: TBox,
  labelSlot: TLabel,
): {
  [K in AlertTone]: { [S in TBox | TLabel]: string };
} =>
  Object.fromEntries(
    Object.entries(ALERT_TONE).map(([tone, { bar, label }]) => [
      tone,
      { [boxSlot]: bar, [labelSlot]: label },
    ]),
  ) as { [K in AlertTone]: { [S in TBox | TLabel]: string } };

export {
  ALERT_DISMISS,
  ALERT_SURFACE,
  ALERT_TONE,
  ALERT_TONE_LABELS,
  toneVariants,
};
export type { AlertTone };
