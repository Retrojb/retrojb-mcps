import { tv, type VariantProps } from "../../../lib/tv";

const toastAlertStyles = tv({
  slots: {
    root: "flex p-(spacing-20)",
  },
});

export { toastAlertStyles };
export type ToastAlertVariants = VariantProps<typeof toastAlertStyles>;
