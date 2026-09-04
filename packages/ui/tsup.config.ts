import { defineConfig } from "tsup";

/**
 * Three artifacts come out of this package, and only one of them is JavaScript.
 *
 * tsup compiles the JS. Declarations and the stylesheet are produced in
 * `onSuccess`, which also runs on every rebuild in watch mode, so `npm run dev`
 * keeps all three in step. Ordering matters: `clean` wipes `dist` before the JS
 * is written and the other two land after, so they survive.
 */
export default defineConfig({
  /*
   * Every source file, not a single bundled entry. See `bundle` below.
   *
   * The component globs are recursive and cover `.ts` as well as `.tsx`, because
   * a component is a directory — `Button/Button.tsx` beside its `styles.ts`,
   * `types.ts` and `index.ts` — rather than a single file. A single-level
   * `src/components/*.tsx` matches none of those, and the failure is quiet: tsup
   * reports success, `tsc` still emits the declarations, so `dist` type-checks
   * while `dist/index.js` imports JavaScript that was never written. Add a
   * nesting level to the tree and this list is what has to keep up.
   */
  entry: [
    "src/index.ts",
    "src/lib/*.ts",
    "src/components/**/*.ts",
    "src/components/**/*.tsx",
  ],

  // ESM only. Every consumer in this repo is `"type": "module"`, and shipping a
  // CJS half would mean two copies of the `tv()` variant definitions.
  format: ["esm"],

  /*
   * Not bundled, so the React Server Components boundary survives the build.
   *
   * A bundle is one module, so it gets one `"use client"` — and that marks
   * everything it exports as client-only, including the variant functions, which
   * are pure string builders. `link()` would then throw "Attempted to call
   * link() from the server" in a server component, which is where the documented
   * `<NextLink className={link()}>` usage lives and is the default rendering
   * environment in App Router. Emitting a file per module keeps the directive on
   * `<Component>.tsx` where it belongs and leaves the `styles.ts` beside it
   * callable anywhere. esbuild preserves top-level directives when it is not
   * bundling.
   *
   * It also means Next.js sends only the components an app actually imports to
   * the client, rather than all three plus tailwind-variants.
   */
  bundle: false,

  /*
   * Declarations come from `tsc`, not from tsup.
   *
   * tsup's dts step injects `baseUrl` into the compiler options it hands to
   * TypeScript, and TypeScript 6 fails on that outright — "Option 'baseUrl' is
   * deprecated and will stop functioning in TypeScript 7.0" — which fails the
   * whole build. `tsc --emitDeclarationOnly` against this package's own tsconfig
   * has no such problem and is the more direct route anyway.
   */
  dts: false,

  sourcemap: true,
  clean: true,
  target: "es2022",

  /*
   * Tree-shaking stays off, and that is a trade rather than an oversight.
   *
   * Setting it routes the output back through Rollup, which strips module-level
   * directives — the `"use client"` lines would be silently dropped, with only a
   * warning mid-build to say so. Consumers' own bundlers tree-shake this package
   * anyway: the output is ESM, one file per module, and `sideEffects` in
   * package.json marks everything but the CSS as pure.
   */
  treeshake: false,

  // React is a peer, not a bundled dependency. Two copies of React in one tree
  // breaks hooks with an error that does not name the cause.
  external: ["react", "react-dom"],

  // No `banner` with `"use client"`. A banner applies to every output file, which
  // would put the directive on the `styles.ts` modules too and reintroduce
  // exactly the problem `bundle: false` is here to avoid. The three component
  // modules carry the directive in their own source instead.

  onSuccess: "npm run build:types && npm run build:css",
});
