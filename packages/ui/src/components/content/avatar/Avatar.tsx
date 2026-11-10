"use client";

import { UserRound } from "lucide-react";
import { type ReactElement, useState } from "react";

import { avatarStyles } from "./styles";
import type { IAvatarProps } from "./types";

/** Splits text into user-perceived characters, so an emoji or accent stays whole. */
const graphemes = (text: string): string[] => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
};

/**
 * Up to two initials: the first character of the first and last word of the
 * name, or the first two characters of an explicit override.
 */
const initialsFor = (name: string, override: string | undefined): string => {
  if (override !== undefined)
    return graphemes(override.trim()).slice(0, 2).join("");
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const first = words[0];
  if (first === undefined) return "";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return [first, last]
    .filter((word): word is string => word !== undefined)
    .map((word) => graphemes(word)[0] ?? "")
    .join("");
};

/**
 * A picture or initials that stands for a person, team or account, in a round
 * or square frame.
 *
 * @remarks
 * ### Why it falls back to initials
 *
 * A broken image icon tells the reader nothing. If `src` is missing, or the
 * picture fails to load, the avatar shows initials worked out from `name`.
 * Pass `initials=""` to show a person glyph instead. A picture that failed
 * before the page hydrated is caught too, by checking it when it mounts.
 *
 * ### Why a blank name hides the avatar
 *
 * An image with no name is announced as just "image". A `name` that is empty
 * or only spaces is treated as `decorative`, so the avatar is hidden from
 * assistive technology rather than read out as nothing.
 *
 * ### Why `name` is required
 *
 * It is the avatar's accessible name, and the source of the initials. For an
 * avatar beside a visible name, set `decorative` so a screen reader does not
 * read the name twice.
 *
 * ### When to use `square`
 *
 * Round is the convention for a person. Square, with slightly rounded corners,
 * is the common way to tell a team, organisation or project apart from a
 * person in the same list.
 *
 * @example
 * ```tsx
 * <Avatar name="Ada Lovelace" src="/ada.jpg" />
 * <Avatar name="Retro Studio" shape="square" />
 * ```
 *
 * @a11y Renders a `<span>` with `role="img"`, named by `name`, so a screen
 * reader announces one image whether it shows a picture, initials or the
 * glyph; the picture has empty `alt` and the initials are hidden, so nothing
 * is read twice. With `decorative` the whole avatar is hidden from assistive
 * technology instead, and so is an avatar whose `name` is blank. No interaction: it is not focusable. Initials are
 * `--foreground` on `--surface-sunken`, 16.57:1 light and 18.24:1 dark. The
 * frame has a real border, so its shape survives forced-colors mode. WCAG
 * 1.1.1, 1.4.3, 4.1.2.
 *
 * @see packages/ui/src/components/content/avatar/AvatarSpec.yaml
 * @see apps/retrojb-storybook/src/stories/content/Avatar.stories.tsx
 * @see apps/retrojb-storybook/src/stories/content/Avatar.mdx
 * @see apps/retrojb-storybook/src/stories/content/accessibilityDocs/AvatarAccessibility.mdx
 *
 * @public
 */
const Avatar = ({
  name,
  src,
  initials,
  decorative = false,
  shape,
  size,
  elevated,
  className,
  ...props
}: IAvatarProps): ReactElement => {
  // The `src` that failed, rather than a boolean, so a new `src` gets a fresh
  // attempt without an effect to reset the flag.
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const hidden = decorative || name.trim() === "";
  const showImage = src !== undefined && src !== "" && failedSrc !== src;
  const letters = initialsFor(name, initials);
  const slots = avatarStyles({ shape, size, elevated });

  return (
    <span
      role={hidden ? undefined : "img"}
      aria-label={hidden ? undefined : name}
      aria-hidden={hidden ? true : undefined}
      className={slots.root({ class: className })}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className={slots.image()}
          onError={() => setFailedSrc(src)}
          ref={(element) => {
            // An image that errored during server rendering, before React
            // attached `onError`, is complete with no size.
            if (element?.complete === true && element.naturalWidth === 0) {
              setFailedSrc(src);
            }
          }}
        />
      ) : letters !== "" ? (
        <span aria-hidden="true" className={slots.initials()}>
          {letters}
        </span>
      ) : (
        <UserRound aria-hidden="true" className={slots.glyph()} />
      )}
    </span>
  );
};

export { Avatar };
