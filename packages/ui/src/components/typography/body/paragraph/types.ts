import type { ComponentPropsWithRef } from "react";
import type { ParagraphVariants } from "./styles";

interface IParagraphProps
  extends ComponentPropsWithRef<"p">, ParagraphVariants {}

export type { IParagraphProps };
