import type { ReactNode } from "react";
import { tableStyle } from "@retrojb/ui";
import { getCriterion } from "@retrojb/wcag-a11y-scanner";
import styles from "./prose.module.css";

/** Lead paragraph under a page title. */
export function Intro({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <p className={styles.intro}>{children}</p>;
}

/**
 * A titled section with a stable id, so it can be linked and so headings form a
 * navigable outline (WCAG 1.3.1, 2.4.6).
 */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/**
 * Lists the success criteria a section covers, pulling names and levels from
 * the scanner package so the documentation cannot drift from the tool.
 */
export function Criteria({
  ids,
}: {
  ids: readonly string[];
}): React.ReactElement {
  return (
    <ul className={styles.criteria}>
      {ids.map((id) => {
        const criterion = getCriterion(id);
        if (!criterion) {
          return (
            <li key={id}>
              <span className={styles.criterion}>
                <span className={styles.criterionId}>{id}</span>
              </span>
            </li>
          );
        }

        return (
          <li key={id}>
            <span className={styles.criterion}>
              <span className={styles.criterionId}>{criterion.id}</span>
              <a href={criterion.understandingUrl}>{criterion.name}</a>
              <span className={styles.level}>Level {criterion.level}</span>
              <span className={styles.criterionName}>
                {criterion.plainLanguage}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const CALLOUT_STYLES = {
  note: "",
  warn: styles.calloutWarn,
  tip: styles.calloutTip,
} as const;

/**
 * An aside with a visible label.
 *
 * The label is real text rather than an icon or a colour, so the callout's kind
 * survives greyscale (WCAG 1.4.1).
 */
export function Callout({
  variant = "note",
  label,
  children,
}: {
  variant?: keyof typeof CALLOUT_STYLES;
  label: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <aside
      className={`${styles.callout} ${CALLOUT_STYLES[variant]}`}
      aria-label={label}
    >
      <strong className={styles.calloutLabel}>{label}</strong>
      {children}
    </aside>
  );
}

/** One side of a {@link Compare} pair. */
function Pane({
  kind,
  code,
  note,
}: {
  kind: "avoid" | "do";
  code: string;
  note?: string;
}): React.ReactElement {
  return (
    <div
      className={`${styles.pane} ${kind === "avoid" ? styles.paneAvoid : styles.paneDo}`}
    >
      <p className={styles.paneHeading}>{kind === "avoid" ? "Avoid" : "Do"}</p>
      <pre>
        <code>{code}</code>
      </pre>
      {note === undefined ? null : <p className={styles.paneNote}>{note}</p>}
    </div>
  );
}

/**
 * Side-by-side "avoid this / do this" code comparison.
 *
 * Both panes are labelled in text. On narrow viewports they stack, and because
 * the avoid pane comes first in the DOM the reading order stays the same in
 * both layouts (WCAG 1.3.2).
 */
export function Compare({
  avoid,
  avoidNote,
  good,
  goodNote,
}: {
  avoid: string;
  avoidNote?: string;
  good: string;
  goodNote?: string;
}): React.ReactElement {
  return (
    <div className={styles.compare}>
      <Pane
        kind="avoid"
        code={avoid}
        {...(avoidNote ? { note: avoidNote } : {})}
      />
      <Pane kind="do" code={good} {...(goodNote ? { note: goodNote } : {})} />
    </div>
  );
}

/**
 * Turns a caption into a stable id, so the scroll region below can be labelled
 * without a hook. `useId` would work but only in a client component, and none of
 * this needs to be one.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A scrollable table figure, framed by the component library.
 *
 * `tableStyle()` rather than the `Table` component, and that is the right end of
 * the library's API for this. `Table` renders a TanStack instance — columns, a row
 * model, registered features — which is a great deal of ceremony for a figure
 * whose four rows are written out by hand in the page. The slot function is the
 * documented escape hatch for exactly this case: it carries no `"use client"`, so
 * it is callable from a server component, and it returns the same classes the real
 * `Table` uses, which are already present in `@retrojb/ui/styles.css`.
 *
 * The cells stay unclassed. Their padding and rules come from the `@layer base`
 * `th, td` selectors in `globals.css`, which exist for precisely this — a table
 * written as markup in a page. What the library contributes is the frame: the
 * scroll container, `border-collapse`, the caption, and the focusable region.
 *
 * That last part is a fix rather than a refactor. The hand-rolled wrapper this
 * replaces was `overflow-x: auto` with no way to reach it from the keyboard, so a
 * table wider than its column could not be scrolled without a pointer (WCAG
 * 2.1.1). `role="region"` with `tabindex="0"` and a name taken from the caption is
 * what the library's `Table` does, and the reasoning transfers unchanged.
 */
export function TableFigure({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}): React.ReactElement {
  const slots = tableStyle({ size: "sm" });
  const captionId = `figure-${slugify(caption)}`;

  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className={slots.root({ class: styles.figure })}
    >
      <table className={slots.table()}>
        <caption id={captionId} className={slots.caption()}>
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

/** An unordered list styled as a checklist, without misusing checkbox roles. */
export function Checklist({
  items,
}: {
  items: readonly ReactNode[];
}): React.ReactElement {
  return (
    <ul className={styles.checklist}>
      {/*
       * Index keys are safe here: the list is static content defined at the call
       * site, never reordered, filtered, or appended to.
       */}
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export { styles as proseStyles };
