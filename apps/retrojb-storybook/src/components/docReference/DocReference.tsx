import { Unstyled } from "@storybook/addon-docs/blocks";
import { Reference, type IReferenceProps } from "@retrojb/ui";
import type { ReactElement } from "react";
import styles from "./DocReference.module.css";

type IDocReferenceProps = IReferenceProps;

/**
 * A design-system `Reference` (an attributed quotation) for Storybook MDX docs.
 *
 * ```mdx
 * <DocReference attribution="W3C" work="WCAG 2.2" cite="https://www.w3.org/TR/WCAG22/">
 *   Content can be presented in different ways without losing information.
 * </DocReference>
 * ```
 *
 * A markdown `>` blockquote maps here too, with no attribution, which renders a
 * bordered `<blockquote>` inside a `<figure>`.
 */
const DocReference = ({
  className,
  ...props
}: IDocReferenceProps): ReactElement => (
  <Unstyled>
    <Reference
      className={[styles.reference, className].filter(Boolean).join(" ")}
      {...props}
    />
  </Unstyled>
);

export { DocReference };
export type { IDocReferenceProps };
