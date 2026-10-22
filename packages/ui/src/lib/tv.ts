import {
  cnMerge,
  createTV,
  type CnOptions,
  type CnReturn,
  type TWMergeConfig,
} from "tailwind-variants";

export { cx } from "tailwind-variants";
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
 *
 * The type roles do need one, for the same reason as `radius`, and it is worse
 * when it is missing. tailwind-merge only recognises `text-<t-shirt size>` as a
 * font size, so it reads `text-body-sm` as a *colour* — and then
 * `text-body-sm text-foreground` keeps only the last class and the size
 * vanishes. Listing the roles under `text` puts them in the font-size group,
 * where `text-body-sm` and `text-heading-md` replace each other and leave the
 * colour alone. Keep this list in step with the `--text-*` roles in
 * `styles/theme.css`.
 */
export const TYPE_ROLES = [
  "display",
  "heading-xl",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "heading-xs",
  "title-md",
  "title-sm",
  "body-lg",
  "body-md",
  "body-sm",
  "label-lg",
  "label-md",
  "label-sm",
  "caption",
  "overline",
  "code",
] as const;

/** A semantic type role; `text-${TypeRole}` is its utility. */
export type TypeRole = (typeof TYPE_ROLES)[number];

const twMergeConfig: TWMergeConfig = {
  extend: {
    theme: {
      radius: ["control"],
      text: [...TYPE_ROLES],
    },
  },
};

export const tv = createTV({ twMergeConfig });

/**
 * `cn` with this package's merge rules.
 *
 * `tailwind-variants`' own `cn` uses tailwind-merge's default table, so it
 * would drop `text-body-sm` next to `text-foreground` and keep both
 * `rounded-control` and `rounded-full`. This one resolves conflicts the way the
 * components do.
 */
export const cn = <T extends CnOptions>(...classnames: T): CnReturn =>
  cnMerge(...classnames)({ twMergeConfig });
