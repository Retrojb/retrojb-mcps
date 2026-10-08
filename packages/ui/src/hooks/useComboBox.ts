"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type Ref,
} from "react";

import {
  comboBoxFilter,
  type ComboBoxFilter,
  type IComboBoxMatch,
} from "../lib/filter";
import { useControllableState } from "./useControllableState";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/*
 * The behavioural core, with no markup and no class names in it.
 *
 * A hook returning prop getters rather than a component with render props, for
 * the same reason `inputStyle` is exported separately from `Input`: the
 * batteries-included component cannot anticipate every layout. Grouped options
 * under headings, a two-column result row, a combobox whose options are router
 * links — all of those need different markup and identical behaviour, and the
 * behaviour is the part that is hard to get right.
 *
 * Nearly everything below is one of three things: the ARIA contract, the keyboard
 * contract, or a race. There is not much else in a combobox.
 */

/** What the input promises about its suggestions (ARIA `aria-autocomplete`). */
type ComboBoxAutocomplete = "none" | "list" | "both";

/** What happens to an uncommitted query when the field loses focus. */
type ComboBoxBlurBehaviour = "revert" | "clear" | "keep";

/** Announcement strings, separated out so they can be translated. */
interface IComboBoxLabels {
  readonly results: (count: number) => string;
  readonly noResults: string;
  readonly loading: string;
  readonly error: string;
  readonly truncated: (shown: number) => string;
  readonly clear: string;
  readonly toggle: string;
  readonly selected: string;
}

const DEFAULT_LABELS: IComboBoxLabels = {
  results: (count) =>
    `${String(count)} result${count === 1 ? "" : "s"} available`,
  noResults: "No results",
  loading: "Searching",
  error: "Search failed",
  truncated: (shown) =>
    `Showing the first ${String(shown)} results. Keep typing to narrow them down.`,
  clear: "Clear",
  toggle: "Show options",
  selected: "Current selection",
};

/*
 * The default cap on rendered results.
 *
 * `aria-activedescendant` names an element by id, so the active option has to be
 * in the DOM — which is what makes windowing a combobox listbox awkward, and why
 * the default here is a cap rather than virtualisation. A thousand `<li>` nodes
 * makes every keystroke slow; a hundred does not, and a hundred results is
 * already past what anyone scans by eye instead of typing one more character.
 */
const DEFAULT_MAX_RESULTS = 100;

/*
 * How long to wait before announcing a result count.
 *
 * A debounce rather than a throttle, which is the right shape here: each
 * keystroke resets it, so a screen reader hears one count for the query the user
 * stopped on rather than a count for every query they typed through.
 */
const STATUS_DEBOUNCE_MS = 500;

/** The default network debounce. Only applies when `onSearch` is given. */
const DEFAULT_SEARCH_DEBOUNCE_MS = 200;

interface IUseComboBoxOptions<TOption> {
  /**
   * The options to filter. Unused when `onSearch` is supplied — a remote search
   * returns results it has already filtered, and running the local matcher over
   * them again would drop anything the server matched on a field the label does
   * not contain.
   */
  readonly options?: readonly TOption[] | undefined;

  /** Defaults to a `label` property, then `String()`. */
  readonly getOptionLabel?: ((option: TOption) => string) | undefined;

  /** Defaults to a `value` property, then the label. */
  readonly getOptionValue?: ((option: TOption) => string) | undefined;

  /** Disabled options are skipped by the keyboard and cannot be committed. */
  readonly getOptionDisabled?: ((option: TOption) => boolean) | undefined;

  /** The committed selection, as an option value. `null` is "nothing chosen". */
  readonly value?: string | null | undefined;
  readonly defaultValue?: string | null | undefined;
  readonly onValueChange?:
    ((value: string | null, option: TOption | null) => void) | undefined;

  /** The text in the field. Deliberately separate state from `value`. */
  readonly inputValue?: string | undefined;
  readonly defaultInputValue?: string | undefined;
  readonly onInputValueChange?: ((value: string) => void) | undefined;

  readonly open?: boolean | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;

  /** Replaceable matcher. Defaults to `comboBoxFilter`. */
  readonly filter?: ComboBoxFilter<TOption> | undefined;

  /**
   * Remote search. When present the hook owns the debounce, the `AbortController`
   * and the out-of-order guard.
   */
  readonly onSearch?:
    | ((query: string, signal: AbortSignal) => Promise<readonly TOption[]>)
    | undefined;

  readonly debounceMs?: number | undefined;
  readonly maxResults?: number | undefined;
  readonly autocomplete?: ComboBoxAutocomplete | undefined;
  readonly blurBehaviour?: ComboBoxBlurBehaviour | undefined;

  /**
   * Pre-activate the top result so Enter commits it without an arrow press.
   *
   * Off by default: it means Enter commits an option the user never looked at,
   * which is the wrong trade for a form control.
   */
  readonly autoActivateFirst?: boolean | undefined;

  readonly openOnFocus?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly required?: boolean | undefined;

  /** Enter with no active option. `SearchBox` uses this to submit the query. */
  readonly onSubmitQuery?: ((query: string) => void) | undefined;

  /** External loading flag, merged with the internal one from `onSearch`. */
  readonly loading?: boolean | undefined;

  readonly labels?: Partial<IComboBoxLabels> | undefined;

  /** Base for every generated id. Defaults to a `useId` value. */
  readonly id?: string | undefined;

  /** Forwarded to the input alongside the hook's own ref. */
  readonly inputRef?: Ref<HTMLInputElement> | undefined;

  /** Name for the hidden input, so the value reaches `FormData`. */
  readonly name?: string | undefined;
}

type ComboBoxOptionProps = ComponentPropsWithRef<"li"> & {
  readonly "data-combobox-index": number;
  readonly "data-active": "true" | "false";
  readonly "data-selected": "true" | "false";
};

interface IUseComboBoxResult<TOption> {
  readonly isOpen: boolean;

  /** `-1` when no option is active. Always within range of `matches`. */
  readonly activeIndex: number;

  readonly matches: readonly IComboBoxMatch<TOption>[];
  readonly selectedOption: TOption | null;
  readonly selectedValue: string | null;
  readonly inputValue: string;

  /** True when `maxResults` cut the list short. */
  readonly truncated: boolean;

  readonly isLoading: boolean;
  readonly error: Error | null;

  /** Debounced text for the live region. Empty when there is nothing to say. */
  readonly statusMessage: string;

  readonly labels: IComboBoxLabels;
  readonly listboxId: string;
  readonly statusId: string;
  readonly getOptionId: (index: number) => string;

  /*
   * Resolved predicates, exposed so a consumer does not have to reimplement the
   * accessor defaults to answer the same questions.
   *
   * Getting this wrong is easy and silent: the default value accessor reads a
   * `value` property and only falls back to the label, so a consumer comparing
   * labels against `selectedValue` would find a match for bare-string options and
   * never find one for `{ label, value }` options.
   */
  readonly isOptionSelected: (index: number) => boolean;
  readonly isOptionDisabled: (index: number) => boolean;

  readonly open: () => void;
  readonly close: () => void;
  readonly clear: () => void;
  readonly selectIndex: (index: number) => void;

  readonly getRootProps: () => ComponentPropsWithRef<"div">;
  readonly getInputProps: () => ComponentPropsWithRef<"input">;
  readonly getListboxProps: () => ComponentPropsWithRef<"ul">;
  readonly getOptionProps: (index: number) => ComboBoxOptionProps;
  readonly getClearButtonProps: () => ComponentPropsWithRef<"button">;
  readonly getToggleButtonProps: () => ComponentPropsWithRef<"button">;
  readonly getHiddenInputProps: () => ComponentPropsWithRef<"input">;
}

const readLabel = <TOption>(option: TOption): string => {
  if (typeof option === "string") {
    return option;
  }
  if (
    typeof option === "object" &&
    option !== null &&
    "label" in option &&
    typeof option.label === "string"
  ) {
    return option.label;
  }
  return String(option);
};

const readValue = <TOption>(option: TOption): string => {
  if (
    typeof option === "object" &&
    option !== null &&
    "value" in option &&
    typeof option.value === "string"
  ) {
    return option.value;
  }
  return readLabel(option);
};

const useComboBox = <TOption>(
  options: IUseComboBoxOptions<TOption>,
): IUseComboBoxResult<TOption> => {
  const {
    options: items,
    getOptionLabel = readLabel,
    getOptionValue = readValue,
    getOptionDisabled,
    value,
    defaultValue = null,
    onValueChange,
    inputValue,
    defaultInputValue = "",
    onInputValueChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    filter = comboBoxFilter,
    onSearch,
    debounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
    maxResults = DEFAULT_MAX_RESULTS,
    autocomplete = "list",
    blurBehaviour = "revert",
    autoActivateFirst = false,
    openOnFocus = false,
    disabled = false,
    required = false,
    onSubmitQuery,
    loading = false,
    labels: labelOverrides,
    id,
    inputRef: callerInputRef,
    name,
  } = options;

  const generatedId = useId();
  const baseId = id ?? generatedId;
  const listboxId = `${baseId}-listbox`;
  const statusId = `${baseId}-status`;
  const getOptionId = useCallback(
    (index: number): string => `${baseId}-option-${String(index)}`,
    [baseId],
  );

  const labels = useMemo<IComboBoxLabels>(
    () => ({ ...DEFAULT_LABELS, ...labelOverrides }),
    [labelOverrides],
  );

  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);

  /*
   * The hook keeps the only ref on the input and republishes the node to the
   * caller's `ref` through `useImperativeHandle`.
   *
   * The obvious alternative — a `mergeRefs` helper that writes `ref.current`
   * itself — is not available: `react-hooks/immutability` treats props and hook
   * arguments as frozen and rejects the assignment, and a merged callback also
   * needs a spread dependency list, which `react-hooks/use-memo` rejects
   * separately. `useImperativeHandle` is the sanctioned way to put a value in
   * someone else's ref, and React performs the write.
   *
   * No dependency list on purpose, so the handle is refreshed on every render. A
   * `[]` list would publish the node once and then hold a stale element if the
   * input were ever remounted.
   */
  useImperativeHandle(callerInputRef, () => internalInputRef.current!);

  /*
   * The hook needs the element for two things, both of which are the reason it
   * cannot simply hand the ref to the caller and forget about it: moving the
   * caret after inline completion, and returning focus to the field after a
   * click on an option or the clear button.
   */

  /* ── Remote search ──────────────────────────────────────────────────────── */

  const [remoteItems, setRemoteItems] = useState<readonly TOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * `onSearch` is read through a ref so the callbacks below do not have to list
   * it as a dependency. A caller passing an inline async function would otherwise
   * change the identity of every prop getter on every render.
   */
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const runSearch = useCallback((text: string): void => {
    const search = onSearchRef.current;
    if (search === undefined) {
      return;
    }

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    /*
     * Two guards, because they catch different failures.
     *
     * `abort()` stops a request that is still in flight. The sequence id stops a
     * response that has already come back — a slow first request can resolve
     * after a fast second one, and without the id those stale results overwrite
     * the fresh ones. It is the most common defect in autocomplete code and it
     * only shows up on a bad connection, which is why it rarely gets caught.
     */
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setIsSearching(true);

    void search(text, controller.signal)
      .then((result) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setRemoteItems(result);
        setError(null);
        setIsSearching(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setIsSearching(false);
      });
  }, []);

  const scheduleSearch = useCallback(
    (text: string): void => {
      if (onSearchRef.current === undefined) {
        return;
      }

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runSearch(text);
      }, debounceMs);
    },
    [debounceMs, runSearch],
  );

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      abortRef.current?.abort();
    },
    [],
  );

  const resolvedItems = useMemo<readonly TOption[]>(
    () => (onSearch === undefined ? (items ?? []) : remoteItems),
    [onSearch, items, remoteItems],
  );

  /*
   * Declared before the controllable state below, so `onValueChange` can resolve
   * the option that goes with a value without reaching forward to a binding that
   * is not initialised yet.
   */
  const resolveOption = useCallback(
    (optionValue: string | null): TOption | null =>
      optionValue === null
        ? null
        : (resolvedItems.find((item) => getOptionValue(item) === optionValue) ??
          null),
    [resolvedItems, getOptionValue],
  );

  /* ── Controllable state ─────────────────────────────────────────────────── */

  const [selectedValue, setSelectedValue] = useControllableState<string | null>(
    {
      value,
      defaultValue,
      // Resolved in one place so every path reports the same pair, a clear
      // included — `(null, null)`.
      onChange: (next) => {
        onValueChange?.(next, resolveOption(next));
      },
    },
  );

  const [query, setQuery] = useControllableState<string>({
    value: inputValue,
    defaultValue: defaultInputValue,
    onChange: onInputValueChange,
  });

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  /* ── Filtering ──────────────────────────────────────────────────────────── */

  const allMatches = useMemo(
    () =>
      onSearch === undefined
        ? filter(resolvedItems, query, getOptionLabel)
        : resolvedItems.map((option) => ({
            option,
            label: getOptionLabel(option),
            score: 0,
            ranges: [],
          })),
    [onSearch, filter, resolvedItems, query, getOptionLabel],
  );

  const matches = useMemo(
    () =>
      allMatches.length > maxResults
        ? allMatches.slice(0, maxResults)
        : allMatches,
    [allMatches, maxResults],
  );

  const truncated = allMatches.length > matches.length;
  const isLoading = loading || isSearching;

  const selectedOption = useMemo(
    () => resolveOption(selectedValue),
    [resolveOption, selectedValue],
  );

  const isIndexDisabled = useCallback(
    (index: number): boolean => {
      const match = matches[index];
      if (match === undefined) {
        return true;
      }
      return getOptionDisabled?.(match.option) ?? false;
    },
    [matches, getOptionDisabled],
  );

  const isIndexSelected = useCallback(
    (index: number): boolean => {
      const match = matches[index];
      return (
        match !== undefined &&
        selectedValue !== null &&
        getOptionValue(match.option) === selectedValue
      );
    },
    [matches, selectedValue, getOptionValue],
  );

  /* ── Active option ──────────────────────────────────────────────────────── */

  /*
   * Which input device last moved the active option.
   *
   * Hover and the arrow keys write to the same `activeIndex`, so after an arrow
   * press the option sitting under a stationary cursor would steal it back and
   * the highlight would appear to jump. `pointermove` is the event to listen to
   * rather than `pointerenter`: `pointerenter` fires when the list scrolls
   * beneath a cursor that never moved, which is the same bug by another route.
   */
  const lastInteractionRef = useRef<"keyboard" | "pointer">("pointer");

  const [activeIndex, setActiveIndex] = useState(-1);

  /*
   * Reset the active option when the result set changes, during render rather
   * than in an effect.
   *
   * Index 2 of the old results is a different option than index 2 of the new
   * ones, so carrying the number over would leave the highlight on something the
   * user never moved to — and Enter would commit it.
   *
   * The trigger is a content signature, not the array's identity. Identity is
   * tempting and wrong: a caller writing `options={[…]}` inline, or passing an
   * inline `filter`, produces a new array every render, and an identity-keyed
   * reset would then clear `activeIndex` on every render and the arrow keys would
   * do nothing at all. The signature is O(1) — length plus the ends — which can
   * in principle miss a same-length reordering, and that is the deliberate trade
   * against hashing every label on every render.
   */
  const signature = `${String(matches.length)}\u0000${query}\u0000${
    matches[0]?.label ?? ""
  }\u0000${matches[matches.length - 1]?.label ?? ""}`;

  const [lastSignature, setLastSignature] = useState(signature);

  if (signature !== lastSignature) {
    setLastSignature(signature);
    setActiveIndex(autoActivateFirst && matches.length > 0 ? 0 : -1);
  }

  const clampedActiveIndex =
    activeIndex >= 0 && activeIndex < matches.length ? activeIndex : -1;

  /*
   * Keep the active option on screen.
   *
   * `block: "nearest"` scrolls the shortest distance that reveals it. `"center"`
   * re-centres the list on every arrow press, which reads as the list lurching.
   * Querying by data attribute avoids holding a ref per option, whose identity
   * would change every render and detach and reattach the whole list.
   */
  useEffect(() => {
    if (!isOpen || clampedActiveIndex < 0) {
      return;
    }

    listboxRef.current
      ?.querySelector<HTMLElement>(
        `[data-combobox-index="${String(clampedActiveIndex)}"]`,
      )
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, clampedActiveIndex]);

  /**
   * Move the active option by `delta`, skipping disabled ones.
   *
   * `wrap` is the difference between the arrow keys and the page keys. Arrows
   * wrap, because a list the user is stepping through one at a time has no
   * meaningful end. Page keys clamp, because wrapping a ten-row jump in a
   * four-row list lands somewhere arbitrary — PageDown should reach the bottom,
   * not modular-arithmetic its way back into the middle.
   */
  const moveActive = useCallback(
    (delta: number, wrap: boolean): void => {
      lastInteractionRef.current = "keyboard";

      const count = matches.length;
      if (count === 0) {
        return;
      }

      const step = delta > 0 ? 1 : -1;
      const clampIndex = (index: number): number =>
        Math.min(count - 1, Math.max(0, index));

      let next: number;
      if (clampedActiveIndex === -1) {
        // Entering the list. A delta of 1 lands on the first option and a delta
        // of 10 lands on the tenth, counting from whichever end we came in at.
        next = delta > 0 ? clampIndex(delta - 1) : clampIndex(count + delta);
      } else if (wrap) {
        next = (clampedActiveIndex + delta + count) % count;
      } else {
        next = clampIndex(clampedActiveIndex + delta);
      }

      /*
       * Then walk one at a time past anything disabled, so skipping a disabled
       * option does not also skip the nine behind it. Bounded by `count` so a
       * list of entirely disabled options cannot spin.
       */
      for (let attempt = 0; attempt < count; attempt += 1) {
        if (!isIndexDisabled(next)) {
          setActiveIndex(next);
          return;
        }
        next = wrap ? (next + step + count) % count : clampIndex(next + step);
      }

      // Every option is disabled. Leave the active option where it was.
    },
    [matches.length, clampedActiveIndex, isIndexDisabled],
  );

  /* ── Commit, clear, open, close ─────────────────────────────────────────── */

  const openList = useCallback((): void => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled, setIsOpen]);

  const closeList = useCallback((): void => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, [setIsOpen]);

  const selectIndex = useCallback(
    (index: number): void => {
      const match = matches[index];
      if (match === undefined || isIndexDisabled(index)) {
        return;
      }

      setSelectedValue(getOptionValue(match.option));
      setQuery(match.label);
      closeList();
    },
    [
      matches,
      isIndexDisabled,
      setSelectedValue,
      getOptionValue,
      setQuery,
      closeList,
    ],
  );

  const clear = useCallback((): void => {
    setSelectedValue(null);
    setQuery("");
    setActiveIndex(-1);
    internalInputRef.current?.focus();
  }, [setSelectedValue, setQuery]);

  /* ── Inline completion ──────────────────────────────────────────────────── */

  const isComposingRef = useRef(false);

  /*
   * A pending caret range, applied after React has written the value.
   *
   * Calling `setSelectionRange` from the change handler is undone by React's own
   * value write that follows it, so the selection is set in a layout effect —
   * after the DOM update and before paint, so the caret is never seen in the
   * wrong place.
   */
  const pendingSelectionRef = useRef<readonly [number, number] | null>(null);

  useIsomorphicLayoutEffect(() => {
    const range = pendingSelectionRef.current;
    if (range === null) {
      return;
    }
    pendingSelectionRef.current = null;
    internalInputRef.current?.setSelectionRange(range[0], range[1]);
  });

  /* ── Status announcement ────────────────────────────────────────────────── */

  /*
   * The announcement is keyed to the state that produced it, and the key is
   * compared on read.
   *
   * Two things fall out of that. The message is empty during the debounce window
   * rather than showing the previous query's count, and reopening the listbox
   * does not re-announce a stale figure from last time. Storing the text alone
   * and clearing it from the effect would do neither — and clearing it from the
   * effect is also what `react-hooks/set-state-in-effect` objects to, since a
   * synchronous `setState` in an effect body is a second render pass that the
   * derived form below avoids entirely.
   */
  const statusKey = [
    String(isLoading),
    String(error !== null),
    String(matches.length),
    String(truncated),
  ].join("|");

  const [announced, setAnnounced] = useState({ key: "", text: "" });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = setTimeout(() => {
      let text: string;

      if (isLoading) {
        text = labels.loading;
      } else if (error !== null) {
        text = labels.error;
      } else if (matches.length === 0) {
        text = labels.noResults;
      } else if (truncated) {
        text = `${labels.results(matches.length)}. ${labels.truncated(matches.length)}`;
      } else {
        text = labels.results(matches.length);
      }

      setAnnounced({ key: statusKey, text });
    }, STATUS_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, statusKey, isLoading, error, matches.length, truncated, labels]);

  const statusMessage =
    isOpen && announced.key === statusKey ? announced.text : "";

  /* ── Prop getters ───────────────────────────────────────────────────────── */

  const getRootProps = useCallback(
    (): ComponentPropsWithRef<"div"> => ({
      /*
       * Dismissal lives on the root's `blur` rather than on a document listener,
       * so it cannot fire for focus moves *inside* the component.
       * `relatedTarget` is the element gaining focus; while it is still within
       * the root — the clear button, the toggle — nothing should close.
       */
      onBlur: (event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }

        closeList();

        if (blurBehaviour === "keep") {
          return;
        }

        if (blurBehaviour === "clear") {
          if (selectedOption === null) {
            setQuery("");
          }
          return;
        }

        /*
         * "revert". An uncommitted query is not a value, so the field goes back
         * to whatever is actually selected rather than keeping text that means
         * nothing — and that would otherwise be submitted alongside a `value`
         * that disagrees with it.
         */
        const committed =
          selectedOption === null ? "" : getOptionLabel(selectedOption);

        if (query !== committed) {
          setQuery(committed);
        }
      },
    }),
    [closeList, blurBehaviour, selectedOption, getOptionLabel, query, setQuery],
  );

  const getInputProps = useCallback(
    (): ComponentPropsWithRef<"input"> => ({
      ref: internalInputRef,
      role: "combobox",
      value: query,
      disabled,
      required,

      // Present whether open or closed. A combobox with no `aria-expanded` is
      // announced as a plain text field (WCAG 4.1.2).
      "aria-expanded": isOpen,

      // The listbox element stays mounted and is hidden when closed, so this id
      // always resolves to something. Pointing `aria-controls` at an element
      // that is not in the DOM is a dangling reference for most of the
      // component's life.
      "aria-controls": listboxId,
      "aria-autocomplete": autocomplete,
      "aria-activedescendant":
        isOpen && clampedActiveIndex >= 0
          ? getOptionId(clampedActiveIndex)
          : undefined,

      // The browser's own suggestion list renders above the listbox and is
      // driven by unrelated history, so it is switched off.
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "none",
      spellCheck: false,

      onChange: (event) => {
        const next = event.target.value;
        const inputType =
          "inputType" in event.nativeEvent &&
          typeof event.nativeEvent.inputType === "string"
            ? event.nativeEvent.inputType
            : "";

        setQuery(next);
        openList();
        scheduleSearch(next);

        /*
         * Inline completion, on insertion only.
         *
         * On deletion it makes the field impossible to empty: the backspace
         * removes a character and the completion immediately puts it back.
         * `inputType` distinguishes the two at the source, rather than guessing
         * from a length comparison.
         *
         * Suppressed mid-composition too. Rewriting the value while an IME is
         * assembling a character cancels the composition, which makes the field
         * unusable for Japanese, Chinese and Korean input.
         */
        if (
          autocomplete !== "both" ||
          isComposingRef.current ||
          !inputType.startsWith("insert") ||
          next.length === 0
        ) {
          return;
        }

        const top = allMatches[0];
        if (top === undefined || top.label.length <= next.length) {
          return;
        }

        /*
         * Only complete against a match that starts at the first character.
         * Completing from a mid-word hit would replace what the user typed with
         * unrelated text — typing "sm" and getting "John Smith" with "John "
         * silently inserted in front of the caret.
         */
        const firstRange = top.ranges[0];
        if (firstRange === undefined || firstRange.start !== 0) {
          return;
        }

        // The typed text is replaced by the option's own casing and accents
        // rather than appended to, since the matcher ignored both.
        setQuery(top.label);
        pendingSelectionRef.current = [next.length, top.label.length];
      },

      onCompositionStart: () => {
        isComposingRef.current = true;
      },

      onCompositionEnd: (event) => {
        isComposingRef.current = false;
        scheduleSearch(event.currentTarget.value);
      },

      onFocus: () => {
        if (openOnFocus) {
          openList();
        }
      },

      onPointerDown: () => {
        // Tapping the field opens the list. A combobox that does nothing when
        // tapped is the usual complaint about these on touch.
        if (!disabled && !isOpen) {
          openList();
        }
      },

      onKeyDown: (event) => {
        if (disabled || isComposingRef.current) {
          return;
        }

        switch (event.key) {
          case "ArrowDown": {
            event.preventDefault();

            if (!isOpen) {
              openList();

              // Alt+Down is "show the list" and nothing more, per the APG.
              if (!event.altKey) {
                moveActive(1, true);
              }
              return;
            }

            moveActive(1, true);
            return;
          }

          case "ArrowUp": {
            event.preventDefault();

            if (event.altKey) {
              closeList();
              return;
            }

            if (!isOpen) {
              openList();
            }

            moveActive(-1, true);
            return;
          }

          case "PageDown": {
            if (isOpen) {
              event.preventDefault();
              moveActive(10, false);
            }
            return;
          }

          case "PageUp": {
            if (isOpen) {
              event.preventDefault();
              moveActive(-10, false);
            }
            return;
          }

          case "Enter": {
            if (isOpen && clampedActiveIndex >= 0) {
              // Consumed, so the surrounding form must not submit as well.
              event.preventDefault();
              selectIndex(clampedActiveIndex);
              return;
            }

            if (onSubmitQuery !== undefined) {
              event.preventDefault();
              closeList();
              onSubmitQuery(query);
            }

            // Otherwise deliberately left alone: Enter in a text field submits
            // the form it is in, and swallowing it here would break that.
            return;
          }

          case "Escape": {
            /*
             * Two stages, and only the stage that acts stops the event.
             *
             * A combobox inside `BrowserAlert` shares Escape with the dialog. If
             * the listbox is open, Escape closes it and the dialog must not also
             * see the key. If it is closed, Escape clears the field. If there is
             * nothing to clear, the event has to keep bubbling so the dialog can
             * close — which is exactly the ordering a document-level listener
             * cannot express.
             */
            if (isOpen) {
              event.preventDefault();
              event.stopPropagation();
              closeList();
              return;
            }

            if (query !== "" || selectedValue !== null) {
              event.preventDefault();
              event.stopPropagation();
              clear();
            }

            return;
          }

          case "Tab": {
            // Commit on the way out, with no preventDefault — focus still has to
            // move to the next control.
            if (isOpen && clampedActiveIndex >= 0) {
              selectIndex(clampedActiveIndex);
            }
            return;
          }

          default:
            /*
             * Home and End are deliberately not intercepted. The APG lists them
             * as optional ways to jump to the first and last option, and in an
             * editable combobox that costs more than it gives: `role="combobox"`
             * on a text input promises textbox behaviour, and taking Home and End
             * away from the caret breaks editing a long query. PageUp and
             * PageDown above cover jumping instead.
             */
            return;
        }
      },
    }),
    [
      query,
      disabled,
      required,
      isOpen,
      listboxId,
      autocomplete,
      clampedActiveIndex,
      getOptionId,
      setQuery,
      openList,
      closeList,
      scheduleSearch,
      allMatches,
      openOnFocus,
      moveActive,
      selectIndex,
      onSubmitQuery,
      selectedValue,
      clear,
    ],
  );

  const getListboxProps = useCallback(
    (): ComponentPropsWithRef<"ul"> => ({
      ref: listboxRef,
      id: listboxId,
      role: "listbox",

      // `hidden` rather than unmounting, so `aria-controls` on the input always
      // resolves.
      hidden: !isOpen,

      "aria-busy": isLoading || undefined,

      onPointerMove: () => {
        lastInteractionRef.current = "pointer";
      },
    }),
    [listboxId, isOpen, isLoading],
  );

  const getOptionProps = useCallback(
    (index: number): ComboBoxOptionProps => {
      const isActive = index === clampedActiveIndex;
      const isSelected = isIndexSelected(index);
      const isDisabled = isIndexDisabled(index);

      return {
        id: getOptionId(index),
        role: "option",

        /*
         * `aria-selected` tracks the *active* option, not the committed one.
         *
         * This follows the APG combobox examples: in a single-select listbox
         * where selection follows focus, the active option is the selected one as
         * far as the accessibility tree is concerned. Putting it on the committed
         * value instead makes a screen reader announce "selected" for an option
         * the user is not on, every time they arrow past it. The committed option
         * is marked by `data-selected` for styling, and the component adds
         * visible text to its accessible name.
         */
        "aria-selected": isActive,
        "aria-disabled": isDisabled || undefined,

        "data-combobox-index": index,
        "data-active": isActive ? "true" : "false",
        "data-selected": isSelected ? "true" : "false",

        /*
         * Keeping DOM focus in the input is the entire focus model, so the
         * default action of the press — moving focus to what was clicked — is
         * cancelled. This also stops the root's `blur` handler from reverting the
         * query a moment before the click commits it.
         */
        onPointerDown: (event) => {
          event.preventDefault();
        },

        onClick: () => {
          if (!isDisabled) {
            selectIndex(index);
            internalInputRef.current?.focus();
          }
        },

        onPointerMove: () => {
          if (lastInteractionRef.current === "pointer" && !isDisabled) {
            setActiveIndex(index);
          }
        },
      };
    },
    [
      clampedActiveIndex,
      isIndexSelected,
      isIndexDisabled,
      getOptionId,
      selectIndex,
    ],
  );

  const getClearButtonProps = useCallback(
    (): ComponentPropsWithRef<"button"> => ({
      type: "button",
      // A real button with a real accessible name, not a clickable icon (4.1.2).
      "aria-label": labels.clear,
      disabled,

      /*
       * Out of the tab order. Escape already clears from the keyboard, so a
       * focusable button here would be an extra tab stop between the field and
       * the next control for no new capability — and 2.4.3 is about a focus order
       * that makes sense, not about exposing every affordance separately.
       */
      tabIndex: -1,

      onPointerDown: (event) => {
        event.preventDefault();
      },

      onClick: () => {
        clear();
      },
    }),
    [labels.clear, disabled, clear],
  );

  const getToggleButtonProps = useCallback(
    (): ComponentPropsWithRef<"button"> => ({
      type: "button",
      "aria-label": labels.toggle,
      "aria-expanded": isOpen,
      "aria-controls": listboxId,
      disabled,
      tabIndex: -1,

      onPointerDown: (event) => {
        event.preventDefault();
      },

      onClick: () => {
        if (isOpen) {
          closeList();
        } else {
          openList();
        }
        internalInputRef.current?.focus();
      },
    }),
    [labels.toggle, isOpen, listboxId, disabled, closeList, openList],
  );

  const getHiddenInputProps = useCallback(
    (): ComponentPropsWithRef<"input"> => ({
      type: "hidden",
      ...(name === undefined ? {} : { name }),
      value: selectedValue ?? "",
    }),
    [name, selectedValue],
  );

  return {
    isOpen,
    activeIndex: clampedActiveIndex,
    matches,
    selectedOption,
    selectedValue,
    inputValue: query,
    truncated,
    isLoading,
    error,
    statusMessage,
    labels,
    listboxId,
    statusId,
    getOptionId,
    isOptionSelected: isIndexSelected,
    isOptionDisabled: isIndexDisabled,
    open: openList,
    close: closeList,
    clear,
    selectIndex,
    getRootProps,
    getInputProps,
    getListboxProps,
    getOptionProps,
    getClearButtonProps,
    getToggleButtonProps,
    getHiddenInputProps,
  };
};

export { useComboBox, DEFAULT_LABELS, DEFAULT_MAX_RESULTS };
export type {
  ComboBoxAutocomplete,
  ComboBoxBlurBehaviour,
  ComboBoxOptionProps,
  IComboBoxLabels,
  IUseComboBoxOptions,
  IUseComboBoxResult,
};
