import { createTV } from "tailwind-variants";

export { cn, cx } from "tailwind-variants";
export type { VariantProps } from "tailwind-variants";

/**
 * The `tv` instance every variant in this package is built with.
 *
 * Configured rather than imported straight from `tailwind-variants` because of
 * `radius`. tailwind-merge decides which classes conflict from a fixed table of
 * theme scales, and it has no way to read our `@theme` block — so
 * `--radius-control` is invisible to it. Left at the default it treats
 * `rounded-control` and `rounded-full` as unrelated utilities and emits both,
 * and which one paints then comes down to declaration order in the stylesheet.
 * The practical symptom is `<Button className="rounded-full">` quietly not
 * rounding. Naming the scale here restores the conflict, so the caller's class
 * replaces ours the way every other override in this package already does.
 *
 * Colours need no such entry: tailwind-merge already treats an unrecognised
 * `bg-*` or `border-*` value as a colour, and `text-*` splits cleanly into
 * font-size and colour groups, so `text-sm text-foreground-muted` survives
 * intact while `text-foreground text-danger` resolves to the last one.
 */
export const tv = createTV({
  twMergeConfig: {
    extend: {
      theme: {
        radius: ["control"],
      },
    },
  },
});
