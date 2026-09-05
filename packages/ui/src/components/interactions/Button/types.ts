import type { ComponentPropsWithRef } from "react";
import type { ButtonVariants } from "./styles";

interface IButtonProps extends ComponentPropsWithRef<"button">, ButtonVariants {
  text: string;
}

export type { IButtonProps };
