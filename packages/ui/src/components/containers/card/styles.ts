import { tv, type VariantProps } from "../../../lib/tv";

const cardStyles = tv({
  slots: {
    root: "flex p-(spacing-20)",
  },
});

export { cardStyles };
export type CardVariants = VariantProps<typeof cardStyles>;
