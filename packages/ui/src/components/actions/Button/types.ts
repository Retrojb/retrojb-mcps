import type { ComponentPropsWithRef } from "react";
import type { ButtonVariants } from "./styles";

/**
 * The props of `Button`: a native `<button>`'s props, the three variants, and
 * the required `text` label.
 *
 * @remarks
 * Extends {@link ButtonVariants} so a variant added to `styles.ts` still reaches
 * callers. Each variant is redeclared below only to give it a description and
 * default, since a type produced by `VariantProps` carries neither.
 *
 * @public
 */
interface IButtonProps extends ComponentPropsWithRef<"button">, ButtonVariants {
  /**
   * The visible label. It is also the button's accessible name, which is why it
   * is required.
   */
  readonly text: string;

  /**
   * Visual weight. Use `danger` only for actions that destroy data.
   *
   * @default primary
   */
  readonly intent?: ButtonVariants["intent"];

  /**
   * Height: 32px (`sm`), 40px (`md`) or 48px (`lg`). Only `lg` meets the 44px
   * target in WCAG 2.5.5.
   *
   * @default md
   */
  readonly size?: ButtonVariants["size"];

  /**
   * Stretches the button to the width of its container.
   *
   * @default false
   */
  readonly fullWidth?: ButtonVariants["fullWidth"];

  /**
   * Gives the button a resting shadow (`shadow-control`) that lifts on hover
   * and drops on press. Has no effect on `intent="ghost"` or a disabled
   * button.
   *
   * @remarks
   * Decoration only. The shadow is removed in forced-colors mode, and the
   * button's border and fill are what identify it.
   *
   * @default false
   */
  readonly elevated?: ButtonVariants["elevated"];

  /**
   * The native button type. The HTML default is `"submit"`, so `Button` changes
   * it to `"button"`; pass `"submit"` when the button should submit a form.
   *
   * @default button
   */
  type?: ComponentPropsWithRef<"button">["type"];
}

export type { IButtonProps };
