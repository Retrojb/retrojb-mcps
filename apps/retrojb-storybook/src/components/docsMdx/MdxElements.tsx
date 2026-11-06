/*
 * The components plain markdown renders as. Each one adapts what MDX passes
 * for an element to the matching `Doc*` component. The element-name map that
 * registers them lives in `./index.ts`, kept apart so this file exports only
 * components (fast refresh).
 */
import {
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { DocCode, DocCodeBlock } from "../docCode";
import { DocHeading } from "../docHeading";
import { DocEmphasis, DocStrong } from "../docInline";
import { DocList, DocListItem } from "../docList";
import { DocParagraph } from "../docParagraph";
import { DocReference } from "../docReference";

// Headings: `DocHeading` gives each one Storybook's slug id from its text.
type MdxHeadingProps = ComponentPropsWithoutRef<"h1">;

const MdxH1 = (props: MdxHeadingProps) => <DocHeading level={1} {...props} />;
const MdxH2 = (props: MdxHeadingProps) => <DocHeading level={2} {...props} />;
const MdxH3 = (props: MdxHeadingProps) => <DocHeading level={3} {...props} />;
const MdxH4 = (props: MdxHeadingProps) => <DocHeading level={4} {...props} />;
const MdxH5 = (props: MdxHeadingProps) => <DocHeading level={5} {...props} />;
const MdxH6 = (props: MdxHeadingProps) => <DocHeading level={6} {...props} />;

const MdxP = (props: ComponentPropsWithoutRef<"p">) => (
  <DocParagraph {...props} />
);

const MdxUl = (props: ComponentPropsWithoutRef<"ul">) => <DocList {...props} />;

const MdxOl = (props: ComponentPropsWithoutRef<"ol">) => (
  <DocList ordered {...props} />
);

const MdxLi = (props: ComponentPropsWithoutRef<"li">) => (
  <DocListItem {...props} />
);

/** A `> quote`. Markdown has no attribution, so none is passed. */
const MdxBlockquote = ({
  children,
}: ComponentPropsWithoutRef<"blockquote">) => (
  <DocReference>{children}</DocReference>
);

/** `**bold**`: strong importance. */
const MdxStrong = (props: ComponentPropsWithoutRef<"strong">) => (
  <DocStrong {...props} />
);

/** `*italic*`: stress emphasis. */
const MdxEm = (props: ComponentPropsWithoutRef<"em">) => (
  <DocEmphasis {...props} />
);

/** Inline `code`. Fenced blocks never reach here; `MdxPre` unwraps them. */
const MdxCode = (props: ComponentPropsWithoutRef<"code">) => (
  <DocCode {...props} />
);

/**
 * A fenced code block. MDX renders it as `<pre><code class="language-x">`, with
 * `code` already swapped for `MdxCode`, so the text and language are read off
 * the child and passed to `DocCodeBlock` as one element.
 */
const MdxPre = ({
  children,
}: ComponentPropsWithoutRef<"pre">): ReactElement => {
  if (isValidElement<{ className?: string; children?: ReactNode }>(children)) {
    const language = /language-(\S+)/.exec(children.props.className ?? "")?.[1];
    const code = children.props.children;
    return (
      <DocCodeBlock
        label={language ? `Code example (${language})` : "Code example"}
      >
        {typeof code === "string" ? code.replace(/\n$/, "") : code}
      </DocCodeBlock>
    );
  }
  return <DocCodeBlock label="Code example">{children}</DocCodeBlock>;
};

export {
  MdxBlockquote,
  MdxCode,
  MdxEm,
  MdxH1,
  MdxH2,
  MdxH3,
  MdxH4,
  MdxH5,
  MdxH6,
  MdxLi,
  MdxOl,
  MdxP,
  MdxPre,
  MdxStrong,
  MdxUl,
};
