import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * For React libraries that run in a browser.
 *
 * `eslint-plugin-react-hooks` only. `eslint-plugin-react` and
 * `eslint-plugin-jsx-a11y` are deliberately absent: both cap their `eslint` peer
 * range at 9, and this repo is on 10. Installing them anyway would mean peer
 * warnings now and an obscure breakage later, so they stay out until they
 * declare support.
 *
 * The practical gap is JSX accessibility rules. Given this repo ships a WCAG
 * scanner, that is worth revisiting the moment jsx-a11y supports ESLint 10.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
  },

  pluginReactHooks.configs.flat.recommended,

  {
    rules: {
      // A dependency array that lies is the single most common source of stale
      // React state, and it is invisible in review.
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
