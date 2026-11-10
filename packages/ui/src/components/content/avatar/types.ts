import type { ComponentPropsWithRef } from "react";
import type { AvatarVariants } from "./styles";

/**
 * The props of `Avatar`: a native `<span>`'s props, the three variants, the
 * required `name`, and the optional picture.
 *
 * @remarks
 * Extends {@link AvatarVariants} so a variant added to `styles.ts` still
 * reaches callers. Each variant is redeclared below only to give it a
 * description and default.
 *
 * @public
 */
interface IAvatarProps
  extends Omit<ComponentPropsWithRef<"span">, "children">, AvatarVariants {
  /**
   * Who or what the avatar stands for. Required: it is the accessible name,
   * and the initials when there is no picture. A blank name makes the avatar
   * decorative, because an image with no name is announced as just "image".
   */
  readonly name: string;

  /**
   * The picture. If it is missing or fails to load, the avatar shows the
   * initials instead, so a broken image never appears.
   */
  readonly src?: string;

  /**
   * Overrides the initials worked out from `name`. Use it when the first
   * letters of the first and last word are wrong for the name, as with many
   * non-Latin scripts. At most two characters are shown. An empty string
   * shows a person glyph instead.
   */
  readonly initials?: string;

  /**
   * Hides the avatar from assistive technology. Set it when the name is
   * already in the text beside the avatar, so a screen reader does not read
   * the name twice.
   *
   * @default false
   */
  readonly decorative?: boolean;

  /**
   * `round` for a circle, `square` for a square with slightly rounded corners,
   * often used for a team, organisation or project rather than a person.
   *
   * @default round
   */
  readonly shape?: AvatarVariants["shape"];

  /**
   * 24px (`sm`), 40px (`md`) or 64px (`lg`).
   *
   * @default md
   */
  readonly size?: AvatarVariants["size"];

  /**
   * Lifts the avatar with the `raised-1` shadow. Dropped inside an element
   * with `data-surface="overlay"`.
   *
   * @remarks
   * Decoration only. Forced-colors mode removes the shadow; the border stays.
   *
   * @default false
   */
  readonly elevated?: AvatarVariants["elevated"];
}

export type { IAvatarProps };
