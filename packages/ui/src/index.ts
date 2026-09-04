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
 * Each component is a directory under `components/<group>/<Name>` holding the
 * component, its `styles.ts`, its `types.ts` and a barrel. The components are
 * client modules; the `styles.ts` beside them are not, so `buttonStyle()`,
 * `linkStyle()` and `inputStyle()` can be called from a server component to
 * style an element this package does not own — a router's `<Link>`, a
 * `<textarea>` that has to match the inputs around it.
 *
 * Specifiers below are explicit files rather than directories. `./…/Button`
 * resolves under a bundler and nowhere else; `./…/Button/index.js` resolves
 * everywhere, and is what the emitted ESM in `dist` needs.
 */

export {
  Button,
  buttonStyle,
  type IButtonProps,
  type ButtonVariants,
} from "./components/interactions/Button/index.js";

export {
  Link,
  linkStyle,
  type ILinkProps,
  type LinkVariants,
} from "./components/navigation/Link/index.js";

export {
  Input,
  inputStyle,
  type IInputProps,
  type InputVariants,
} from "./components/forms/Input/index.js";

// Re-exported so consumers compose class names with the same conflict-resolution
// rules the components use, rather than a second, differently-configured copy.
export { cn, cx, tv, type VariantProps } from "./lib/tv.js";
