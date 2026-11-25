"use client";

import { type ReactElement } from "react";

import { buttonStyle } from "./styles";
import type { IButtonProps } from "./types";

/**
 * Triggers an action on the current page. Defaults to `type="button"`, so it
 * never submits a surrounding form by accident; pass `type="submit"` when that
 * is the intent.
 *
 * @remarks
 * ### Why `type` defaults to `"button"`
 *
 * The HTML default is `"submit"`, so a button dropped inside a form to open a
 * dialog would submit the form instead. That bug only shows up once the button
 * is reused somewhere with a form around it. Pass `type="submit"` explicitly
 * when submitting is what you want.
 *
 * ### When to use `Link` instead
 *
 * A button runs an action on the current page. Going to another page is
 * navigation, and `Link` renders the `<a>` that assistive technology announces
 * as a link.
 *
 * @example
 * ```tsx
 * <Button text="Save" type="submit" />
 * ```
 *
 * @a11y Renders a native `<button>`, named by the required `text` prop. Enter
 * and Space activate it, and a disabled button leaves the tab order. Focus is a
 * 2px outline at a 2px offset that survives forced-colors mode. Only size `lg`
 * (48px) meets the 44px target in 2.5.5. WCAG 1.4.1, 1.4.3, 1.4.11, 2.3.3,
 * 2.4.7, 2.4.13, 2.5.5, 2.5.8, 4.1.2.
 *
 * @see packages/ui/src/components/actions/Button/ButtonSpec.yaml
 * @see apps/retrojb-storybook/src/stories/actions/Button.stories.tsx
 * @see apps/retrojb-storybook/src/stories/actions/Button.mdx
 * @see apps/retrojb-storybook/src/stories/actions/accessibilityDocs/ButtonAccessibility.mdx
 * @see packages/ui/src/components/navigation/Link/LinkSpec.yaml
 *
 * @public
 */
const Button = ({
  className,
  text,
  intent,
  size,
  fullWidth,
  elevated,
  type = "button",
  ...props
}: IButtonProps): ReactElement => {
  return (
    <button
      type={type}
      className={buttonStyle({ intent, size, fullWidth, elevated, className })}
      {...props}
    >
      {text}
    </button>
  );
};

export { Button };
