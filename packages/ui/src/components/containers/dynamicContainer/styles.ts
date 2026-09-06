import { tv, type VariantProps } from "../../../lib/tv";

const dynamicContainerStyles = tv({
  slots: {
    root: "flex p-(spacing-20)",
  },
});

export { dynamicContainerStyles };
export type CardVariants = VariantProps<typeof dynamicContainerStyles>;
