/**
 * Shared React primitives, styled with Tailwind.
 *
 * The stylesheet is not imported by this module — a JS import cannot reliably
 * pull CSS into every bundler, and doing it here would make the package
 * unusable in any app that processes CSS separately. Import it once, at the
 * app's entry point:
 *
 * ```ts
 * import "@retrojb/ui/styles.css";
 * ```
 *
 * The components are client modules; the variant functions beside them are not,
 * so `button()`, `link()` and `input()` can be called from a server component to
 * style an element this package does not own — a router's `<Link>`, a
 * `<textarea>` that has to match the inputs around it.
 */

export { Button, type ButtonProps } from "./components/button.js";
export { Link, type LinkProps } from "./components/link.js";
export { Input, type InputProps } from "./components/input.js";

export {
  button,
  link,
  input,
  type ButtonVariants,
  type LinkVariants,
  type InputVariants,
} from "./variants.js";

// Re-exported so consumers compose class names with the same conflict-resolution
// rules the components use, rather than a second, differently-configured copy.
export { cn, cx, tv, type VariantProps } from "./lib/tv.js";
