/**
 * `@retrojb/ui/icons` — the Lucide icon set, re-exported.
 *
 * ```tsx
 * import { Icon } from "@retrojb/ui";
 * import { ChevronRight, Search } from "@retrojb/ui/icons";
 *
 * <Icon icon={Search} />
 * ```
 *
 * WHY A SUBPATH AND NOT THE MAIN BARREL
 *
 * Lucide exports an icon under the plain name of almost anything, and several
 * collide with components here: `Link`, `Table`, `Radio`, `Code`, `List` —
 * and `Icon`, which in Lucide is the low-level renderer that takes a raw
 * `iconNode`. With `export * from "lucide-react"` in `index.ts`, our own named
 * exports would win over the star export without any error, and Lucide's
 * `Link`, `Table`, `Radio`, `Code` and `List` icons would simply be missing
 * from `@retrojb/ui`. Every future component name risks the same silent loss.
 * Re-exporting only Lucide's
 * `*Icon`-suffixed aliases avoids the clash but means listing ~1,900 names by
 * hand and keeping the list in step with every Lucide release.
 *
 * A separate entry point has neither problem. Every Lucide name is available
 * under the name Lucide documents, and nothing here shares a namespace with
 * the components.
 *
 * WHY `Icon` IS RE-EXPORTED HERE TOO
 *
 * A local named export takes precedence over a name from `export *`, so the
 * line below replaces Lucide's low-level `Icon` with this package's. Without
 * it, `import { Icon } from "@retrojb/ui/icons"` would quietly give the Lucide
 * renderer, which draws nothing without an `iconNode` and has none of the
 * accessibility contract. `@retrojb/ui` and `@retrojb/ui/icons` now export the
 * same `Icon`.
 *
 * TREE-SHAKING
 *
 * This module is pure re-exports and `lucide-react` is external (see
 * `tsup.config.ts`), so `dist/icons.js` is the same two statements. Lucide marks itself
 * `"sideEffects": false` and so does this package, apart from the CSS, so a
 * bundler keeps only the icons an app imports. The exception is Lucide's
 * `icons` namespace object (`import { icons } from …`), which holds every icon
 * by name: importing it keeps all of them. Do not use it, for the same reason
 * `Icon` takes a component rather than a string.
 */
export * from "lucide-react";
export { Icon } from "./components/content/icon";
