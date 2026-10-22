import type { ComponentPropsWithRef, ReactNode } from "react";
import type { ReferenceVariants } from "./styles";

interface IReferenceProps
  extends Omit<ComponentPropsWithRef<"figure">, "children">, ReferenceVariants {
  /** The quoted text. Rendered inside the `<blockquote>`. */
  readonly children: ReactNode;
  /**
   * Who said or wrote it — a person or an organisation. Rendered in the
   * `<figcaption>`, outside the quotation, so it is not read as part of it.
   */
  readonly attribution?: ReactNode;
  /**
   * The title of the work quoted from — a book, an article, a specification.
   * Rendered in a `<cite>`, which is reserved for titles of works and is not
   * the place for a person's name.
   */
  readonly work?: ReactNode;
  /**
   * The source URL, set as the `<blockquote>`'s `cite` attribute.
   *
   * Machine-readable only: browsers do not expose it to users. If the reader
   * should be able to follow it, put a `Link` in `work` or `attribution` too.
   */
  readonly cite?: string;
  /** Class for the `<blockquote>`. `className` goes to the `<figure>`. */
  readonly quoteClassName?: string;
}

export type { IReferenceProps };
