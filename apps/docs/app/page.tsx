import type { Metadata } from "next";
import Link from "next/link";
import {
  queryCriteria,
  SUCCESS_CRITERIA,
  TOPIC_LABELS,
} from "@retrojb/wcag-a11y-scanner";
import { Callout, Intro, Section, TableFigure } from "./_components/prose";

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "A short, practical guide to the WCAG 2 success criteria that matter most for colour contrast, screen readers, and keyboard navigation.",
};

const TOPIC_PAGES = [
  {
    href: "/wcag/color-contrast",
    topic: "color-contrast" as const,
    blurb:
      "How the contrast ratio is defined, which thresholds apply to which text, and why borders and focus rings have their own rule.",
  },
  {
    href: "/wcag/screen-readers",
    topic: "screen-reader" as const,
    blurb:
      "Why a screen reader reads the accessibility tree rather than the screen, and what markup has to say for it to work.",
  },
  {
    href: "/wcag/keyboard-and-tabbing",
    topic: "keyboard" as const,
    blurb:
      "How the tab order is really determined, what tabindex does and does not do, and why removing focus outlines breaks the page.",
  },
];

export default function HomePage(): React.ReactElement {
  return (
    <article>
      <h1>WCAG 2 basics</h1>
      <Intro>
        Accessibility guidance has a reputation for being long and abstract.
        This is the short version for three areas that account for most of what
        teams actually get wrong: colour contrast, screen reader support, and
        keyboard navigation.
      </Intro>

      <Section id="how-wcag-fits-together" title="How WCAG fits together">
        <p>
          WCAG 2 is organised into four principles, thirteen guidelines, and
          eighty-seven testable <strong>success criteria</strong>. The criteria
          are the part you can actually check against. Each one sits at a
          conformance level:
        </p>
        <ul>
          <li>
            <strong>Level A</strong> — if you miss these, assistive technology
            cannot compensate. The content is simply unavailable to some people.
          </li>
          <li>
            <strong>Level AA</strong> — the level nearly every legal and
            contractual requirement points at. Treat this as the target.
          </li>
          <li>
            <strong>Level AAA</strong> — stricter still. Worth adopting
            selectively; WCAG itself notes it is not achievable for all content.
          </li>
        </ul>
        <p>
          Levels are cumulative. Claiming AA means meeting every A criterion as
          well.
        </p>

        <Callout label="Which version to target" variant="tip">
          <p>
            Use <strong>WCAG 2.2</strong>. It is additive over 2.1, so anything
            conforming to 2.2 also conforms to 2.1. It adds nine criteria and
            removes one — 4.1.1 Parsing, which is now obsolete. If a policy
            names 2.0 or 2.1, building to 2.2 satisfies it and anticipates the
            next update.
          </p>
        </Callout>
      </Section>

      <Section id="the-three-areas" title="The three areas covered here">
        <p>
          These pages cover {SUCCESS_CRITERIA.length} success criteria — the
          subset that governs the three areas below. Each criterion is restated
          in plain language with how to meet it and how it is commonly failed.
        </p>

        <TableFigure caption="Documentation pages, and the criteria each one covers">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Criteria</th>
              <th scope="col">What it covers</th>
            </tr>
          </thead>
          <tbody>
            {TOPIC_PAGES.map((page) => {
              const criteria = queryCriteria({ topics: [page.topic] });
              return (
                <tr key={page.href}>
                  <th scope="row">
                    <Link href={page.href}>{TOPIC_LABELS[page.topic]}</Link>
                  </th>
                  <td>{criteria.length}</td>
                  <td>{page.blurb}</td>
                </tr>
              );
            })}
          </tbody>
        </TableFigure>
      </Section>

      <Section
        id="what-tools-can-tell-you"
        title="What automated tools can tell you"
      >
        <p>
          Less than you would hope. Automated checks are excellent at the
          mechanical questions — is there an <code>alt</code> attribute, is this
          ratio above 4.5, is there a positive <code>tabindex</code> — and
          useless at the ones that decide whether a page is actually usable.
        </p>
        <p>
          No tool can tell you whether alt text describes the right thing,
          whether a heading summarises its section, whether the reading order
          makes sense, or whether your custom dropdown behaves the way its ARIA
          role promises. Those need a person.
        </p>

        <Callout
          label="A clean automated report is not conformance"
          variant="warn"
        >
          <p>
            Treat automated results as a first pass that clears the obvious
            failures, then do the manual work: a keyboard-only pass, a screen
            reader pass, greyscale, and 200% zoom. The{" "}
            <Link href="/wcag/scanner">wcag-a11y-scanner</Link> MCP server ships
            a manual checklist alongside its automated rules for exactly this
            reason.
          </p>
        </Callout>
      </Section>

      <Section id="tooling" title="Tooling in this repo">
        <p>
          <Link href="/wcag/scanner">
            <code>wcag-a11y-scanner</code>
          </Link>{" "}
          is an MCP server that gives an AI coding agent the same knowledge
          these pages contain, plus tools to compute contrast ratios and scan
          markup. Every contrast figure on these pages is computed by that
          package at build time, so the documentation and the tool cannot
          disagree.
        </p>
      </Section>
    </article>
  );
}
