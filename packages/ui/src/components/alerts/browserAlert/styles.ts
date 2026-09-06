import { tv, type VariantProps } from "../../../lib/tv";

const browserAlertStyles = tv({
  slots: {
    root: "flex p-(spacing-20)",
  },
});

export { browserAlertStyles };
export type BrowserAlertVariants = VariantProps<typeof browserAlertStyles>;
