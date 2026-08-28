import type { ReactNode } from "react";
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

/** A horizontally scrollable table wrapper with a caption. */
export function TableFigure({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className={styles.tableWrap}>
      <table>
        <caption>{caption}</caption>
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
      {items.map((item, index) => (
        // eslint-disable-next-line react/no-array-index-key -- static content
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export { styles as proseStyles };
