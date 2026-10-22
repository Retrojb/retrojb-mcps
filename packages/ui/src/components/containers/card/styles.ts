/*
 * The variant definition, in its own module beside the components rather than
 * inside them — see the note in `interactions/Button/styles.ts`.
 *
 * One slot recipe for the whole family. `Card`, `InteractiveCard` and
 * `GraphicCard` draw the same box with the same padding scale; what differs is
 * which slots they render and two state variants (`interactive`, `disabled`) that
 * only `InteractiveCard` turns on. Three `tv()` definitions would mean three copies
 * of the surface and its contrast notes, true in however many someone remembered to
 * update — the same reason the alerts share `../alerts/tone.ts`.
 *
 * `cardStyles()` is exported for markup this package does not own: a server-rendered
 * card around a router's `<Link>`, say. Every slot is callable from a server
 * component.
 *
 *
 * HUGGING THE CONTAINER
 *
 * The root is `w-full min-w-0 h-full`. `w-full` because the root is also an
 * `@container`, and `container-type: inline-size` stops an element sizing itself
 * from its content — inside a shrink-to-fit parent (a centring flex box, an
 * `inline-block`) a container with no width of its own collapses to zero. `min-w-0`
 * because a flex or grid item defaults to `min-width: auto`, which lets a long word
 * or a wide image push the card past its track. `h-full` so cards in a grid row
 * stretch to one height and the footer can pin to the bottom with `mt-auto`.
 *
 * The container query is on the root and the layout switch is on `layout`, one
 * level down, because a container query styles a container's *descendants* — never
 * the container itself.
 */
import { tv, type VariantProps } from "../../../lib/tv";

const cardStyles = tv({
  slots: {
    /*
     * The box.
     *
     * `--border-strong`, not `--border`. The fill cannot carry the boundary on its
     * own: `--surface` against `--background` measures 1.42:1 in light and 1.10:1 in
     * dark, which is no visible edge at all. `--border-strong` on `--background`
     * is 4.17 / 4.42:1 and clears 1.4.11; `--border` at 1.75–2.67:1 does not.
     *
     * `relative` is the containing block for `InteractiveCard`'s stretched
     * `::after`. The `@container` brings layout containment with it, which would
     * make it one anyway — `relative` says so on purpose.
     *
     * No `overflow-hidden` here; it lives on `layout`. The interactive card's focus
     * ring is an outline on a pseudo-element that sits *outside* this box, and an
     * overflow clip on the root would cut it off.
     */
    root: [
      "group/card relative @container max-w-[500px]",
      "flex w-full min-w-0 h-full flex-col list-none",
      "rounded-control border border-border-strong",
      "bg-surface text-foreground",
    ],
    /*
     * The orientation switch, and the clip for the media corners.
     *
     * `overflow-hidden` clips only descendants whose containing block is this
     * element or inside it. The stretched `::after` resolves against the root, an
     * ancestor, so it escapes the clip while the image does not. The radius is the
     * root's minus its 1px border, so the media corner meets the edge exactly.
     */
    layout: [
      "flex min-w-0 flex-1 flex-col overflow-hidden",
      "rounded-[calc(var(--radius-control)-1px)]",
    ],
    /*
     * The media region. Its children are taken out of flow and fill it.
     *
     * Absolutely positioned on purpose. An in-flow `<img>` contributes its natural
     * height, so a 2000px photo in a horizontal card would make the whole row
     * 2000px tall. Out of flow, the region's size comes from the aspect ratio
     * (vertical) or from the row it stretches to (horizontal), and the image is
     * cropped to it with `object-cover`.
     */
    media: [
      "relative shrink-0 overflow-hidden bg-surface-raised",
      "*:absolute *:inset-0 *:block *:size-full",
      "[&_img]:size-full [&_img]:object-cover",
      "[&_video]:size-full [&_video]:object-cover",
    ],
    content: "flex min-w-0 flex-1 flex-col",
    header: "flex min-w-0 flex-col gap-(--spacing-10)",
    title: "m-0 min-w-0 text-foreground",
    body: "min-w-0 text-foreground-muted",
    footer: "mt-auto flex flex-wrap items-center gap-(--spacing-20)",
    /*
     * The one real control in an `InteractiveCard`, and its stretched overlay.
     *
     * The element itself is reset (no preflight here, so a `<button>` would keep
     * its UA fill and border) and sized to the title text. Its `::after` covers the
     * card — `-inset-px` to the root's border edge — so a click anywhere on the card
     * lands on this element.
     *
     * The focus indicator moves to the overlay. It is the shared outline — 2px at a
     * 2px offset from the card's edge (2.4.7, 2.4.13), an `outline` so it survives
     * forced-colors mode — drawn around the card rather than around the title, since
     * the card is what the control looks like. The element's own outline is
     * suppressed only on `:focus-visible`, at the same moment the overlay's appears,
     * so there is never a frame with no indicator at all. --focus on --background is
     * 6.19 / 8.88:1.
     */
    action: [
      "m-0 border-0 bg-transparent p-0 text-start",
      "[font:inherit] text-inherit no-underline",
      "cursor-pointer",
      "focus-visible:outline-none",
      "after:absolute after:-inset-px after:rounded-control",
      "after:outline-offset-2 focus-visible:after:outline-2 focus-visible:after:outline-focus",
      "disabled:cursor-not-allowed",
    ],
    /*
     * Lifts a nested control above the overlay so it stays independently
     * clickable. `InteractiveCard` applies it to its `actions` region; reach for
     * `cardStyles().raised()` for a nested link anywhere else in the card.
     */
    raised: "relative z-10",
  },
  variants: {
    size: {
      sm: {
        content: "gap-(--spacing-20) p-(--spacing-30)",
        title: "text-title-md",
        body: "text-body-md",
      },
      md: {
        content: "gap-(--spacing-30) p-(--spacing-40)",
        title: "text-title-lg",
        body: "text-body-md",
      },
    },
    orientation: {
      vertical: { layout: "flex-col" },
      horizontal: {
        layout: "flex-col @md:flex-row",
        media: "@md:aspect-auto @md:w-2/5 @md:min-h-(--spacing-1000)",
      },
    },
    mediaRatio: {
      "16/9": { media: "aspect-video" },
      "4/3": { media: "aspect-4/3" },
      "3/2": { media: "aspect-3/2" },
      "1/1": { media: "aspect-square" },
    },
    interactive: {
      true: {
        root: "transition-colors motion-reduce:transition-none",
      },
    },
    disabled: {
      true: { root: "opacity-60" },
    },
  },
  compoundVariants: [
    {
      interactive: true,
      disabled: false,
      class: {
        root: "hover:border-accent hover:bg-surface-raised",
        title: [
          "group-hover/card:underline",
          "underline-offset-[0.15em] decoration-[0.08em]",
        ],
      },
    },
  ],
  defaultVariants: {
    size: "md",
    orientation: "vertical",
    mediaRatio: "16/9",
    interactive: false,
    disabled: false,
  },
});

export { cardStyles };
export type CardVariants = VariantProps<typeof cardStyles>;
