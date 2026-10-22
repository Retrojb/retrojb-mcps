/*
 * The typography group: five headings and four body components, all built on
 * the semantic type roles in `styles/tokens.css` (`text-heading-md`,
 * `text-body-sm`, …), never on Tailwind's `text-sm` scale.
 *
 * None of them has `"use client"`. They use no hooks, state or context, so they
 * render in a server component and add nothing to a client bundle; the
 * `*Styles()` functions beside them are callable anywhere too.
 *
 *
 * WHY FIVE HEADINGS AND NOT ONE `<Heading size>`
 *
 * A heading has two independent properties: its level in the outline and its
 * visual size. A single `<Heading size level>` makes every call site choose
 * both, and the failure that produces is well known — the level gets picked to
 * get the size ("this needs to look smaller, make it an `<h4>`"), and the
 * outline a screen reader user navigates by stops matching the page (1.3.1).
 *
 * The named components fix the common pairing instead. `PageHeading` is the
 * page's `<h1>` at `heading-xl`; `SectionHeading` is an `<h2>` at `heading-md`.
 * A caller names the heading's job and gets a correct level and size together,
 * and the name says in review what the heading is for. Both remain overridable
 * — `level` when the outline is deeper than the default, `size` when the design
 * is — so nothing is lost against a single component. The five share one
 * recipe (`headings/styles.ts`) and one renderer (`headings/HeadingBase.tsx`),
 * so the only thing each one owns is its two defaults.
 */
export { PageHeading } from "./headings/pageHeading";
export { ProductHeading } from "./headings/productHeading";
export { SectionHeading } from "./headings/sectionHeading";
export { SubHeading } from "./headings/subHeading";
export { TitleHeading } from "./headings/titleHeading";
export { Code, CodeBlock } from "./body/code";
export { List, ListItem } from "./body/lists";
export { Paragraph } from "./body/paragraph";
export { Reference } from "./body/reference";
export type {
  HeadingLevel,
  HeadingSize,
  IHeadingProps,
} from "./headings/types";
export type { IPageHeadingProps } from "./headings/pageHeading";
export type { IProductHeadingProps } from "./headings/productHeading";
export type { ISectionHeadingProps } from "./headings/sectionHeading";
export type { ISubHeadingProps } from "./headings/subHeading";
export type { ITitleHeadingProps } from "./headings/titleHeading";
export type { ICodeBlockProps, ICodeProps } from "./body/code";
export type { IListItemProps, IListProps } from "./body/lists";
export type { IParagraphProps } from "./body/paragraph";
export type { IReferenceProps } from "./body/reference";
export { type HeadingVariants } from "./headings/styles";
export {
  pageHeadingStyles,
  type PageHeadingVariants,
} from "./headings/pageHeading";
export {
  productHeadingStyles,
  type ProductHeadingVariants,
} from "./headings/productHeading";
export {
  sectionHeadingStyles,
  type SectionHeadingVariants,
} from "./headings/sectionHeading";
export {
  subHeadingStyles,
  type SubHeadingVariants,
} from "./headings/subHeading";
export {
  titleHeadingStyles,
  type TitleHeadingVariants,
} from "./headings/titleHeading";
export { codeBlockStyles, codeStyles } from "./body/code";
export { listItemStyles, listStyles, type ListVariants } from "./body/lists";
export { paragraphStyles, type ParagraphVariants } from "./body/paragraph";
export { referenceStyles, type ReferenceVariants } from "./body/reference";
