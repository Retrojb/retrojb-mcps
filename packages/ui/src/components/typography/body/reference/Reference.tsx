import { type ReactElement } from "react";
import { referenceStyles } from "./styles";
import type { IReferenceProps } from "./types";

/**
 * A quotation with its source.
 *
 * ```tsx
 * <Reference
 *   attribution="W3C"
 *   work="Web Content Accessibility Guidelines 2.2"
 *   cite="https://www.w3.org/TR/WCAG22/"
 * >
 *   Content can be presented in different ways without losing information or
 *   structure.
 * </Reference>
 * ```
 *
 *
 * WHY "REFERENCE" IS A QUOTATION
 *
 * The name could have meant three things: an inline `<cite>`, a footnote line,
 * or a quotation with its attribution. The first two are a single element with
 * a class — `<cite>` needs no component, and a source line is
 * `<Paragraph size="sm" tone="muted">` — so a component would add nothing but a
 * name. The third has structure that is easy to get wrong, which is what a
 * component is for.
 *
 * The structure is the HTML specification's own pattern for an attributed
 * quotation: `<figure>` around a `<blockquote>` and a `<figcaption>`. The
 * attribution sits outside the `<blockquote>` because a blockquote's content is
 * the quotation; a name inside it would be announced, and copied, as part of
 * what was said. The work's title goes in a `<cite>`, which marks titles of
 * works, not people.
 *
 * Without `attribution` or `work` there is no `<figcaption>`, and the figure is
 * a bordered blockquote.
 */
const Reference = ({
  attribution,
  work,
  cite,
  size,
  className,
  quoteClassName,
  children,
  ...props
}: IReferenceProps): ReactElement => {
  const slots = referenceStyles({ size });
  const hasAttribution = attribution != null && attribution !== false;
  const hasWork = work != null && work !== false;

  return (
    <figure className={slots.root({ class: className })} {...props}>
      <blockquote
        cite={cite}
        className={slots.quote({ class: quoteClassName })}
      >
        {children}
      </blockquote>
      {hasAttribution || hasWork ? (
        <figcaption className={slots.attribution()}>
          {/* The dash is typographic; a screen reader has the structure. */}
          <span aria-hidden="true">— </span>
          {attribution}
          {hasAttribution && hasWork ? ", " : null}
          {hasWork ? <cite className={slots.work()}>{work}</cite> : null}
        </figcaption>
      ) : null}
    </figure>
  );
};

export { Reference };
