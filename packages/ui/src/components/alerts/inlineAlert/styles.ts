import { tv, type VariantProps } from "../../../lib/tv";

const inlineAlertStyles = tv({
  slots: {
    root: "flex p-(spacing-20)",
  },
});

export { inlineAlertStyles };
export type InlineAlertVariants = VariantProps<typeof inlineAlertStyles>;
