/*
 * The default typeahead matcher.
 *
 * A pure module with no React in it, in `lib` rather than beside the component,
 * because it is useful on its own — a server-rendered page that wants the same
 * ranking for a static result list can call `comboBoxFilter` directly, and an app
 * that needs to search fields the label does not contain can wrap it.
 *
 *
 * WHY NOT FUZZY
 *
 * The default is prefix-then-substring, and subsequence ("fuzzy") matching is not
 * offered. Fuzzy scoring demos well and erodes trust in use: `abc` matching
 * "Add Billing Contact" is indistinguishable from a bug to the person who typed
 * it, and on short queries it returns confident nonsense. Ranking that a user can
 * predict is worth more than ranking that finds everything. Pass your own
 * `filter` if your domain genuinely wants it.
 *
 *
 * WHY THE MATCHER RETURNS RANGES
 *
 * Highlighting the matched substring needs indices into the *original* label, and
 * only the matcher knows them — by the time the component has a filtered list the
 * information is gone, and re-deriving it with `indexOf` on the raw strings gets
 * the wrong answer for every case the normalisation below exists to handle
 * ("jose" highlighting nothing in "José"). So ranges come back with the match.
 */

/** A half-open `[start, end)` slice of the original, un-normalised label. */
interface IMatchRange {
  readonly start: number;
  readonly end: number;
}

/** One option that survived filtering, with its score and highlight ranges. */
interface IComboBoxMatch<TOption> {
  readonly option: TOption;

  /** The label the matcher read, so callers need not call the accessor again. */
  readonly label: string;

  /** Higher sorts first. Comparable only within one result set. */
  readonly score: number;

  /** Merged, ascending, and indexed against `label`. Empty for an empty query. */
  readonly ranges: readonly IMatchRange[];
}

/**
 * The shape of a replaceable matcher.
 *
 * `getOptionLabel` is passed in rather than closed over so a custom filter can
 * ignore it and search whatever it likes — keywords, a description, a remote id —
 * while still returning ranges against the visible label.
 */
type ComboBoxFilter<TOption> = (
  options: readonly TOption[],
  query: string,
  getOptionLabel: (option: TOption) => string,
) => readonly IComboBoxMatch<TOption>[];

/*
 * Characters whose accent NFD will not separate, because the mark is not a
 * combining mark in Unicode — it is part of the letter. NFD leaves "ß" as "ß", so
 * without this table "strasse" does not find "Straße" and "oresund" does not find
 * "Øresund", which are exactly the cases a user expects to work.
 *
 * Deliberately short. It covers the Latin-script letters that commonly appear in
 * names and place names; it is not an attempt at general transliteration.
 */
const LETTER_EXPANSIONS = new Map<string, string>([
  ["ß", "ss"],
  ["æ", "ae"],
  ["œ", "oe"],
  ["ø", "o"],
  ["å", "a"],
  ["đ", "d"],
  ["ð", "d"],
  ["þ", "th"],
  ["ł", "l"],
  ["ħ", "h"],
  ["ı", "i"],
  ["ŋ", "n"],
  ["ſ", "s"],
]);

const DIACRITICS = /\p{Diacritic}/gu;

/*
 * What counts as the start of a word, for the ranking tier below. Includes the
 * separators that actually show up in option labels — slashes in paths, dots in
 * identifiers, brackets in annotated names — not just whitespace.
 */
const WORD_BOUNDARY = /[\s\-_/.,:;()[\]{}'"]/;

/*
 * The ranking tiers. Gaps rather than consecutive integers so a two-token query
 * cannot out-score a single exact match by accumulating weak hits.
 */
const SCORE_EXACT = 32;
const SCORE_PREFIX = 8;
const SCORE_WORD_START = 4;
const SCORE_SUBSTRING = 1;

interface INormalised {
  /** Case-folded, accent-stripped text. Searched with plain `indexOf`. */
  readonly text: string;

  /**
   * `map[i]` is the index in the source string that produced `text[i]`.
   *
   * One entry per UTF-16 code unit of `text`, not per code point, because
   * `indexOf` returns code-unit indices and this has to be indexable by them.
   */
  readonly map: readonly number[];
}

/**
 * Case-fold and strip accents, keeping a map back to the source indices.
 *
 * `Intl.Collator` with `sensitivity: "base"` is the textbook answer for
 * accent-insensitive comparison and is the wrong tool here: it compares whole
 * strings and cannot search inside one. It is used below, but only for the
 * tie-break ordering.
 *
 * The length changes in both directions — "ß" becomes two characters, a combining
 * mark becomes none — so the index map is built as we go rather than computed
 * afterwards. Without it, highlight ranges drift on any string that normalises to
 * a different length.
 */
const normalise = (value: string): INormalised => {
  let text = "";
  const map: number[] = [];
  let sourceIndex = 0;

  // `for…of` over a string iterates code points, so an emoji or a surrogate pair
  // is handled as one character and `char.length` is its true code-unit width.
  for (const char of value) {
    const lowered = char.toLocaleLowerCase();
    const expanded =
      LETTER_EXPANSIONS.get(lowered) ??
      lowered.normalize("NFD").replace(DIACRITICS, "");

    for (let unit = 0; unit < expanded.length; unit += 1) {
      map.push(sourceIndex);
    }
    text += expanded;

    sourceIndex += char.length;
  }

  return { text, map };
};

const isWordStart = (text: string, index: number): boolean => {
  if (index === 0) {
    return true;
  }
  const previous = text[index - 1];
  return previous !== undefined && WORD_BOUNDARY.test(previous);
};

interface ITokenHit {
  readonly start: number;
  readonly end: number;
  readonly score: number;
}

/**
 * The best occurrence of one token, by tier rather than by position.
 *
 * A token can appear several times in a label and the first occurrence is not
 * necessarily the one worth highlighting — in "Contract Tracking", `trac` matches
 * inside "Contract" first and at the start of "Tracking" second, and the second is
 * the one a user means.
 */
const findToken = (text: string, token: string): ITokenHit | null => {
  let best: ITokenHit | null = null;
  let from = 0;

  for (;;) {
    const at = text.indexOf(token, from);
    if (at === -1) {
      break;
    }

    let score: number;
    if (at === 0) {
      score = text.length === token.length ? SCORE_EXACT : SCORE_PREFIX;
    } else {
      score = isWordStart(text, at) ? SCORE_WORD_START : SCORE_SUBSTRING;
    }

    if (best === null || score > best.score) {
      best = { start: at, end: at + token.length, score };
    }

    // Nothing can beat a whole-string match, so stop looking.
    if (score === SCORE_EXACT) {
      break;
    }

    from = at + 1;
  }

  return best;
};

const codeUnitsAt = (value: string, index: number): number => {
  const codePoint = value.codePointAt(index);
  return codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
};

/**
 * Convert a hit in normalised space back to a range in the source label.
 *
 * The end is taken from the first normalised unit *after* the match, which pulls
 * in any combining marks that were stripped between the two — so highlighting
 * "e" in a decomposed "é" covers the accent rather than leaving it outside the
 * mark. When the match ends mid-expansion (the first "s" of a "ß") that lookup
 * lands back on the character's own start, so the fallback widens the range to
 * the whole source character instead of emitting an empty one.
 */
const toSourceRange = (
  source: string,
  map: readonly number[],
  hit: ITokenHit,
): IMatchRange | null => {
  const start = map[hit.start];
  const lastUnit = map[hit.end - 1];

  if (start === undefined || lastUnit === undefined) {
    return null;
  }

  const after = hit.end < map.length ? map[hit.end] : source.length;

  /*
   * The comparison is against `lastUnit`, not `start`. When the match ends
   * mid-expansion the following unit still belongs to the same source character,
   * so `after` equals `lastUnit` — and taking it would cut the character in half
   * ("stras" highlighting "Stra" and leaving the "ß" unmarked). Only accept
   * `after` when it has actually moved past the last matched character.
   */
  const end =
    after !== undefined && after > lastUnit
      ? after
      : lastUnit + codeUnitsAt(source, lastUnit);

  return { start, end };
};

const mergeRanges = (
  ranges: readonly IMatchRange[],
): readonly IMatchRange[] => {
  if (ranges.length <= 1) {
    return ranges;
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: IMatchRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];

    // `<=` rather than `<` so adjacent ranges join into one mark. Two touching
    // `<mark>` elements render as a visible seam at most zoom levels.
    if (last !== undefined && range.start <= last.end) {
      if (range.end > last.end) {
        merged[merged.length - 1] = { start: last.start, end: range.end };
      }
    } else {
      merged.push(range);
    }
  }

  return merged;
};

/*
 * Tie-break ordering only. `numeric` so "Item 2" precedes "Item 10", and
 * `sensitivity: "base"` so case and accents do not decide the order of two
 * otherwise equal results.
 */
const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

/**
 * The default matcher: normalised, token-wise, ranked.
 *
 * Every whitespace-separated token must match somewhere in the label — AND, not
 * OR — so "john sm" finds "John Smith" while "john xyz" finds nothing. OR would
 * make every extra character the user types widen the result set, which reads as
 * the filter being broken.
 *
 * An empty query returns every option in its original order, unranked. Sorting an
 * unfiltered list would reorder a deliberately ordered set of options the moment
 * the listbox opened.
 */
const comboBoxFilter = <TOption>(
  options: readonly TOption[],
  query: string,
  getOptionLabel: (option: TOption) => string,
): readonly IComboBoxMatch<TOption>[] => {
  const collapsed = query.trim().replace(/\s+/g, " ");
  const normalisedQuery = normalise(collapsed);
  const tokens =
    normalisedQuery.text.length === 0 ? [] : normalisedQuery.text.split(" ");

  if (tokens.length === 0) {
    return options.map((option) => ({
      option,
      label: getOptionLabel(option),
      score: 0,
      ranges: [],
    }));
  }

  const matches: IComboBoxMatch<TOption>[] = [];

  for (const option of options) {
    const label = getOptionLabel(option);
    const { text, map } = normalise(label);

    const ranges: IMatchRange[] = [];
    let score = 0;
    let matchedEveryToken = true;

    for (const token of tokens) {
      const hit = findToken(text, token);

      if (hit === null) {
        matchedEveryToken = false;
        break;
      }

      score += hit.score;

      const range = toSourceRange(label, map, hit);
      if (range !== null) {
        ranges.push(range);
      }
    }

    if (!matchedEveryToken) {
      continue;
    }

    /*
     * A bonus for the query matching as one phrase, so "new york" ranks
     * "New York" above "New Jersey, York Avenue" — both match every token, but
     * only one of them is what was asked for.
     */
    if (text === normalisedQuery.text) {
      score += SCORE_EXACT;
    } else if (text.startsWith(normalisedQuery.text)) {
      score += SCORE_PREFIX;
    }

    matches.push({ option, label, score, ranges: mergeRanges(ranges) });
  }

  /*
   * Shorter labels win ties: with equal scores, the label with less text around
   * the match is the closer result. The collator is the final tie-break so the
   * order is total — a comparator that returns 0 for distinct items leaves their
   * order to the engine, and results that reshuffle between keystrokes look like
   * the list is flickering.
   */
  matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.label.length - b.label.length ||
      collator.compare(a.label, b.label),
  );

  return matches;
};

/** One run of label text, flagged according to whether the query matched it. */
interface IHighlightSegment {
  readonly text: string;
  readonly match: boolean;
}

/**
 * Split a label into alternating matched and unmatched runs for rendering.
 *
 * Kept here next to the matcher that produces the ranges. How the segments are
 * marked up is the component's business, and it matters: wrapping fragments in
 * elements makes some screen readers announce the label in pieces, so the
 * rendered fragments are hidden from assistive technology and the whole label is
 * supplied separately. See the option markup in `ComboBox.tsx`.
 */
const highlightSegments = (
  label: string,
  ranges: readonly IMatchRange[],
): readonly IHighlightSegment[] => {
  if (ranges.length === 0) {
    return [{ text: label, match: false }];
  }

  const segments: IHighlightSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    const start = Math.max(cursor, Math.min(range.start, label.length));
    const end = Math.max(start, Math.min(range.end, label.length));

    if (start > cursor) {
      segments.push({ text: label.slice(cursor, start), match: false });
    }
    if (end > start) {
      segments.push({ text: label.slice(start, end), match: true });
    }

    cursor = end;
  }

  if (cursor < label.length) {
    segments.push({ text: label.slice(cursor), match: false });
  }

  return segments;
};

export { comboBoxFilter, highlightSegments };
export type { ComboBoxFilter, IComboBoxMatch, IHighlightSegment, IMatchRange };
