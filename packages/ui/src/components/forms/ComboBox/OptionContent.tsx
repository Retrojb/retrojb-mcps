"use client";

import { type ReactElement } from "react";

import { highlightSegments, type IMatchRange } from "../../../lib/filter";

interface IOptionContentProps {
  readonly label: string;
  readonly ranges: readonly IMatchRange[];
  readonly isSelected: boolean;
  readonly selectedLabel: string;
  readonly markClassName: string;
}

/**
 * The inside of a default option row. Shared by `ComboBox` and `SearchBox`.
 *
 *
 * WHY THE VISIBLE TEXT IS HIDDEN FROM ASSISTIVE TECHNOLOGY
 *
 * Highlighting a match means breaking the label into several elements. Several
 * screen readers then announce it in pieces — "John", "Sm", "ith" — because each
 * element becomes its own text node in the accessibility tree. The result is a
 * label that reads correctly on screen and is unintelligible in the ear, which is
 * the worst of both and is the usual cost of adding highlighting to a combobox.
 *
 * So the fragmented copy is marked `aria-hidden` and the whole label is supplied
 * once, visually hidden, as the option's accessible name (WCAG 4.1.2). The two
 * always carry the same text. "Selected" is appended to the spoken copy because
 * the visual cue for it is a font weight, which has no spoken equivalent — and
 * `aria-selected` is already spoken for, tracking the active option rather than
 * the committed one.
 *
 * With nothing to highlight — an empty query, every option showing — none of this
 * applies and the label is rendered plainly.
 */
const OptionContent = ({
  label,
  ranges,
  isSelected,
  selectedLabel,
  markClassName,
}: IOptionContentProps): ReactElement => {
  const segments = highlightSegments(label, ranges);
  const isFragmented = segments.length > 1;

  if (!isFragmented && !isSelected) {
    return <span>{label}</span>;
  }

  return (
    <>
      <span aria-hidden="true">
        {segments.map((segment, index) =>
          segment.match ? (
            <mark
              // Index keys are safe here: the list is derived fresh from the
              // label on every render and is never reordered in place.
              key={`${String(index)}-mark`}
              className={markClassName}
            >
              {segment.text}
            </mark>
          ) : (
            <span key={`${String(index)}-text`}>{segment.text}</span>
          ),
        )}
      </span>

      <span className="sr-only">
        {isSelected ? `${label}, ${selectedLabel}` : label}
      </span>
    </>
  );
};

export { OptionContent };
export type { IOptionContentProps };
