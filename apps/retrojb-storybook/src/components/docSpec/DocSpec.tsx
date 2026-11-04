import { Unstyled } from "@storybook/addon-docs/blocks";
import { DynamicContainer, Tag, type TagVariants } from "@retrojb/ui";
import type { ReactElement } from "react";
import { DocCode } from "../docCode";
import { DocHeading } from "../docHeading";
import { DocList, DocListItem } from "../docList";
import { DocParagraph } from "../docParagraph";
import styles from "./DocSpec.module.css";
import type { IComponentSpec } from "./spec";

type TagTone = NonNullable<TagVariants["tone"]>;

/*
 * Blocks that render a component's `<Name>Spec.yaml` into its docs page.
 *
 * The docs page takes the facts that live in the spec (status, usage guidance,
 * accessibility, exports) from the spec itself, so they are written once and
 * cannot disagree. Prose that belongs to the page (the examples, the
 * explanation around them) stays in the MDX.
 *
 * Each block returns `null` when the spec has nothing for it, so a page for a
 * planned component, or one with a short spec, renders without empty headings.
 * Usage is in `templates/Component.mdx`.
 */

interface IDocSpecProps {
  /** The parsed spec. Build it with `parseSpec` from the `?raw` import. */
  readonly spec: IComponentSpec;
}

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const present = (items: readonly string[] | undefined): items is string[] =>
  items !== undefined && items.length > 0;

/**
 * The tone each component status is drawn in. The word is the signal and the
 * tone reinforces it (1.4.1), so planned and stub share `neutral`: they read
 * differently because they say different words.
 *
 * A status the spec adds later falls back to `neutral` rather than failing.
 */
const STATUS_TONE: Readonly<Record<string, TagTone>> = {
  planned: "neutral",
  stub: "neutral",
  experimental: "info",
  shipped: "success",
  deprecated: "danger",
};

/**
 * A row of tags under the title: status (toned), complexity, category and the
 * version the component first shipped in.
 *
 * ```mdx
 * <DocSpecFacts spec={spec} />
 * ```
 */
const DocSpecFacts = ({ spec }: IDocSpecProps): ReactElement => {
  const since = spec.versioning?.introducedIn;
  const category =
    spec.subcategory === undefined
      ? capitalize(spec.category)
      : `${capitalize(spec.category)} / ${capitalize(spec.subcategory)}`;
  return (
    <Unstyled>
      <DynamicContainer
        as="ul"
        direction="horizontal"
        gap="sm"
        align="center"
        aria-label="Component facts"
        className={styles.facts}
      >
        <li>
          <Tag
            text={spec.status}
            tone={STATUS_TONE[spec.status] ?? "neutral"}
          />
        </li>
        <li>
          <Tag text={spec.complexity} />
        </li>
        <li>
          <Tag text={category} />
        </li>
        {since === undefined ? null : (
          <li>
            <Tag text={`Since ${since}`} />
          </li>
        )}
      </DynamicContainer>
    </Unstyled>
  );
};

/**
 * When to reach for something else, and the do and don't lists, from the spec's
 * `usage`.
 *
 * ```mdx
 * <DocSpecGuidance spec={spec} />
 * ```
 */
const DocSpecGuidance = ({ spec }: IDocSpecProps): ReactElement | null => {
  const usage = spec.usage;
  const alternatives = usage?.alternatives ?? [];
  const doList = usage?.guidance?.do;
  const dontList = usage?.guidance?.dont;
  const standalone = usage?.standalone;
  if (
    alternatives.length === 0 &&
    !present(doList) &&
    !present(dontList) &&
    standalone !== false
  ) {
    return null;
  }
  return (
    <>
      {standalone === false ? (
        <DocParagraph>
          {spec.name} is not used on its own. Use it inside its parent
          component.
        </DocParagraph>
      ) : null}
      {present(doList) ? (
        <>
          <DocHeading level={3}>Do</DocHeading>
          <DocList>
            {doList.map((item) => (
              <DocListItem key={item}>{item}</DocListItem>
            ))}
          </DocList>
        </>
      ) : null}
      {present(dontList) ? (
        <>
          <DocHeading level={3}>Don&rsquo;t</DocHeading>
          <DocList>
            {dontList.map((item) => (
              <DocListItem key={item}>{item}</DocListItem>
            ))}
          </DocList>
        </>
      ) : null}
      {alternatives.length > 0 ? (
        <>
          <DocHeading level={3}>Use something else when</DocHeading>
          <DocList>
            {alternatives.map((alternative) => (
              <DocListItem key={alternative.id}>
                <DocCode>{capitalize(alternative.id)}</DocCode>:{" "}
                {alternative.when}
              </DocListItem>
            ))}
          </DocList>
        </>
      ) : null}
    </>
  );
};

/**
 * The rendered element and role, keyboard keys, WCAG criteria and notes, from
 * the spec's `accessibility`.
 *
 * ```mdx
 * <DocSpecAccessibility spec={spec} />
 * ```
 */
const DocSpecAccessibility = ({ spec }: IDocSpecProps): ReactElement | null => {
  const a11y = spec.accessibility;
  if (a11y === undefined) return null;
  const { element, role, pattern, keyboard, wcag, notes } = a11y;
  return (
    <>
      {element !== undefined || role !== undefined ? (
        <DocParagraph>
          {element !== undefined ? (
            <>
              Renders <DocCode>{element}</DocCode>
            </>
          ) : null}
          {role !== undefined ? (
            <>
              {element !== undefined ? ", with role " : "Role: "}
              <DocCode>{role}</DocCode>
            </>
          ) : null}
          {pattern !== undefined ? `. Follows the ${pattern} pattern` : null}.
        </DocParagraph>
      ) : null}
      {present(keyboard) ? (
        <DocParagraph>
          Keyboard:{" "}
          {keyboard.map((key, index) => (
            <span key={key}>
              {index > 0 ? ", " : ""}
              <DocCode>{key}</DocCode>
            </span>
          ))}
          .
        </DocParagraph>
      ) : null}
      {present(wcag) ? (
        <DocParagraph>
          WCAG 2.2 criteria addressed: {wcag.join(", ")}.
        </DocParagraph>
      ) : null}
      {present(notes) ? (
        <DocList>
          {notes.map((note) => (
            <DocListItem key={note}>{note}</DocListItem>
          ))}
        </DocList>
      ) : null}
    </>
  );
};

/**
 * Everything the component adds to the package: the component, its parts, the
 * style function and the key types, with the spec's notes.
 *
 * ```mdx
 * <DocSpecExports spec={spec} />
 * ```
 */
const DocSpecExports = ({ spec }: IDocSpecProps): ReactElement | null => {
  const exported = spec.exports ?? [];
  if (exported.length === 0) return null;
  return (
    <DocList>
      {exported.map((symbol) => (
        <DocListItem key={symbol.name}>
          <DocCode>{symbol.name}</DocCode> ({symbol.kind}
          {symbol.internal === true ? ", internal" : ""})
          {symbol.note === undefined ? "" : `: ${symbol.note}`}
        </DocListItem>
      ))}
    </DocList>
  );
};

export { DocSpecAccessibility, DocSpecExports, DocSpecFacts, DocSpecGuidance };
export type { IDocSpecProps };
