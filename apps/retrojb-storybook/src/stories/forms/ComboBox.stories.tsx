import { ComboBox } from "@retrojb/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

interface ICountry {
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
}

const countries: readonly ICountry[] = [
  { label: "Argentina", value: "ar" },
  { label: "Brazil", value: "br" },
  { label: "Canada", value: "ca" },
  { label: "Denmark", value: "dk" },
  { label: "France", value: "fr" },
  { label: "Germany", value: "de" },
  { label: "Japan", value: "jp" },
  { label: "México", value: "mx" },
  { label: "New Zealand", value: "nz" },
  { label: "Norway", value: "no" },
  { label: "South Africa", value: "za" },
  { label: "Sweden", value: "se" },
  { label: "Switzerland", value: "ch" },
  { label: "United Kingdom", value: "gb" },
  { label: "United States", value: "us" },
  { label: "Österreich", value: "at" },
];

/*
 * `typeof ComboBox<ICountry>` is an instantiation expression. `ComboBox` is
 * generic, and without pinning the option type here every `args` block below
 * would widen to `unknown` and the controls panel would have nothing to show.
 */
const meta = {
  title: "Forms/ComboBox",
  component: ComboBox<ICountry>,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {},
  // Every story needs room for the popup, which opens below the field.
  decorators: [
    (Story) => (
      <div style={{ minHeight: "22rem", width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComboBox<ICountry>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    label: "Country",
    options: countries,
    placeholder: "Start typing…",
  },
};

/**
 * The matcher is accent- and case-insensitive, and folds letters NFD cannot
 * split. Try `mexico`, `osterreich` or `united` — and `new z`, which matches on
 * two separate tokens.
 */
export const Typeahead: Story = {
  args: {
    label: "Country",
    options: countries,
    description: "Try “mexico”, “osterreich”, or “new z”.",
    defaultOpen: true,
    defaultInputValue: "united",
  },
};

/**
 * `autocomplete="both"` completes the field inline and leaves the added text
 * selected, so the next keystroke replaces it. It only fires on insertion —
 * backspace never re-completes, or the field could not be emptied.
 */
export const InlineCompletion: Story = {
  args: {
    label: "Country",
    options: countries,
    autocomplete: "both",
    description: "Type “de” and the rest of “Denmark” is filled in, selected.",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Country",
    options: countries,
    description: "Where the invoice will be issued.",
  },
};

/**
 * There is no `invalid` prop. Passing `error` is the only way to get the invalid
 * styling, so the border, the message and `aria-invalid` cannot disagree.
 */
export const Invalid: Story = {
  args: {
    label: "Country",
    options: countries,
    error: "Choose a country from the list.",
    defaultInputValue: "Atlantis",
  },
};

export const Required: Story = {
  args: {
    label: "Country",
    options: countries,
    required: true,
    description: "The marker is decorative; the attribute is what is announced.",
  },
};

export const Disabled: Story = {
  args: {
    label: "Country",
    options: countries,
    disabled: true,
    defaultInputValue: "Canada",
  },
};

/**
 * The label is still the input's accessible name — `sr-only`, not `hidden`.
 */
export const LabelHidden: Story = {
  args: {
    label: "Country",
    labelHidden: true,
    placeholder: "Country",
    options: countries,
  },
};

/**
 * Heights are 32/40/48px, matching `Button` and `Input` so the three line up in
 * a row. Only `lg` reaches the 44px enhanced target in WCAG 2.5.5.
 */
export const Sizes: Story = {
  args: { label: "Country", options: countries },
  render: (args) => (
    <div style={{ display: "grid", gap: "1rem" }}>
      <ComboBox {...args} label="Small" size="sm" />
      <ComboBox {...args} label="Medium" size="md" />
      <ComboBox {...args} label="Large" size="lg" />
    </div>
  ),
};

/**
 * Disabled options are skipped by the arrow keys rather than merely dimmed, and
 * cannot be committed by Enter or by click.
 */
export const DisabledOptions: Story = {
  args: {
    label: "Country",
    options: countries,
    getOptionDisabled: (option) => option.value === "br" || option.value === "ca",
    defaultOpen: true,
    description: "Brazil and Canada cannot be selected or arrowed onto.",
  },
};

/**
 * Results are capped at `maxResults` (100 by default) rather than virtualised,
 * because `aria-activedescendant` needs the active option in the DOM. The cap is
 * announced, not silent.
 */
export const LargeList: Story = {
  args: {
    label: "Item",
    options: Array.from({ length: 5000 }, (_, index) => ({
      label: `Item ${String(index + 1)}`,
      value: String(index + 1),
    })),
    maxResults: 25,
    defaultOpen: true,
    description: "5,000 options, 25 rendered.",
  },
};

/**
 * `renderOption` replaces the contents of a row. The `<li>` and its ARIA stay
 * with the component — but a custom row owns its own accessible name, which the
 * default row handles by hiding its highlighted fragments and supplying the
 * whole label separately.
 */
export const CustomOptions: Story = {
  args: {
    label: "Country",
    options: countries,
    defaultOpen: true,
    renderOption: (match, state) => (
      <>
        <span>{match.label}</span>
        <span
          style={{ fontVariantNumeric: "tabular-nums", opacity: 0.6 }}
          aria-hidden="true"
        >
          {match.option.value.toUpperCase()}
        </span>
        <span className="sr-only">
          {`${match.label}${state.isSelected ? ", current selection" : ""}`}
        </span>
      </>
    ),
  },
};

/**
 * `placement="top"` pins the popup above the field and opts out of the anchor
 * positioning upgrade. The default, `auto`, flips on its own where CSS anchor
 * positioning is supported.
 */
export const PlacementTop: Story = {
  args: {
    label: "Country",
    options: countries,
    placement: "top",
    defaultOpen: true,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: "22rem",
          width: "20rem",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

/*
 * Remote search.
 *
 * The latency is deliberately uneven — a short query is slow and a long one is
 * fast — so responses come back out of order. The hook's sequence guard is what
 * stops the stale one from overwriting the fresh one; without it, typing
 * "switz" quickly would end up showing the results for "s".
 */
const searchCountries = async (
  query: string,
  signal: AbortSignal,
): Promise<readonly ICountry[]> => {
  const latency = query.length <= 2 ? 900 : 150;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, latency);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  const needle = query.trim().toLowerCase();
  return countries.filter((country) =>
    country.label.toLowerCase().includes(needle),
  );
};

/**
 * With `onSearch`, the hook owns the debounce, the `AbortController` and the
 * out-of-order guard. Short queries in this story resolve slowly on purpose, so
 * typing quickly would show stale results if the guard were not there.
 */
export const AsyncSearch: Story = {
  args: {
    label: "Country",
    description: "Debounced, aborted and sequence-guarded by the hook.",
  },
  render: (args) => {
    const [chosen, setChosen] = useState<string | null>(null);

    return (
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <ComboBox
          {...args}
          onSearch={searchCountries}
          onValueChange={(value) => {
            setChosen(value);
          }}
        />
        <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          {chosen === null ? "Nothing selected" : `Selected: ${chosen}`}
        </p>
      </div>
    );
  },
};

/**
 * `name` renders a hidden input carrying the committed value, so the form
 * submits the option's value rather than the text in the field. Submit with
 * nothing selected to see that the query is not the value.
 */
export const InAForm: Story = {
  args: {
    label: "Country",
    options: countries,
    name: "country",
    required: true,
  },
  render: (args) => {
    const [submitted, setSubmitted] = useState<string | null>(null);

    return (
      <form
        style={{ display: "grid", gap: "0.75rem" }}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setSubmitted(JSON.stringify(Object.fromEntries(data)));
        }}
      >
        <ComboBox {...args} />
        <button type="submit">Submit</button>
        <output style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          {submitted ?? "Not submitted"}
        </output>
      </form>
    );
  },
};

/**
 * `value` and `inputValue` are separate pieces of state and separately
 * controllable. The text is a query mid-edit and a label once committed, and one
 * piece of state cannot be both.
 */
export const Controlled: Story = {
  args: {
    label: "Country",
    options: countries,
  },
  render: (args) => {
    const [value, setValue] = useState<string | null>("se");
    const [text, setText] = useState("Sweden");

    return (
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <ComboBox
          {...args}
          value={value}
          onValueChange={setValue}
          inputValue={text}
          onInputValueChange={setText}
        />
        <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          value: {value ?? "null"} · inputValue: {JSON.stringify(text)}
        </p>
        <button
          type="button"
          onClick={() => {
            setValue("jp");
            setText("Japan");
          }}
        >
          Set to Japan from outside
        </button>
      </div>
    );
  },
};
