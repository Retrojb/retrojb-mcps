/**
 * Tailwind CSS v4 for the Storybook preview, through PostCSS.
 *
 * Vite picks this file up and runs it over `.storybook/preview.css`, which is
 * this app's Tailwind entry. Without it, stories could only use the utilities
 * `@retrojb/ui/styles.css` happens to contain, which are the ones the library's
 * own components use. A story's layout classes would compile to nothing.
 *
 * The setup is the one `packages/ui/README.md` documents for any app with its
 * own Tailwind build, so Storybook also exercises it.
 *
 * @type {import("postcss-load-config").Config}
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
