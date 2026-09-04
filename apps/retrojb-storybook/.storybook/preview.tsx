import type { Preview } from "@storybook/react-vite";

/*
 * The package does not import its own CSS from its JS entry, so every consumer
 * has to do it once at its entry point — for Storybook, that is here. Without
 * it the components render with their class names attached and no rules behind
 * them, which looks like a broken component rather than a missing stylesheet.
 *
 * This also brings in the default token layer, so the a11y addon is checking
 * contrast against the palette the package actually ships.
 */
import "@retrojb/ui/styles.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
