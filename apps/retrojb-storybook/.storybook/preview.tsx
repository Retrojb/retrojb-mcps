import type { Decorator, Preview } from "@storybook/react-vite";
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
import "./preview.css";

type Theme = "system" | "light" | "dark";

/*
 * THEME TOOLBAR
 *
 * The tokens follow `prefers-color-scheme` by default and honour a
 * `data-theme` attribute on `<html>` as an override (see "THEME SELECTION" in
 * `packages/ui/src/styles/tokens.css`). The toolbar drives that attribute:
 * "System" removes it, so the OS setting applies; "Light" and "Dark" force one.
 *
 * It is set on `document.documentElement` rather than on a wrapper `<div>`,
 * because the token blocks select `:root`. That also means components that
 * render outside the story's subtree — a `<dialog>` in the top layer, a toast
 * region — follow the theme too.
 */
const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme ?? "system") as Theme;
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Colour theme for the components",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "system", title: "System", icon: "browser" },
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "system",
  },
  decorators: [withTheme],
  parameters: {
    // The background comes from the theme's `--background` token (see
    // `preview.css`); the backgrounds addon would paint over it.
    backgrounds: { disable: true },
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
