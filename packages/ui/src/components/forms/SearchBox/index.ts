/*
 * No `styles.ts` in this directory, deliberately.
 *
 * `SearchBox` draws the same control as `ComboBox` and shares `comboBoxStyle`
 * with it. A second slot definition here would be a copy that drifts: the two
 * are supposed to be visually identical, and the whole point of splitting them
 * was that the difference is behavioural.
 */
export { SearchBox } from "./SearchBox";
export type { ISearchBoxProps } from "./types";
