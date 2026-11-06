# Storybook component docs

How a component's docs page is built, and how to add one. The template is
`../../apps/retrojb-storybook/templates/Component.mdx`; `Button` is the first page
built from it (`src/stories/actions/Button.mdx`).

- [What the page is made of](#what-the-page-is-made-of)
- [Adding a page](#adding-a-page)
- [How the prop table gets the TSDoc](#how-the-prop-table-gets-the-tsdoc)
- [Troubleshooting](#troubleshooting)

## What the page is made of

The page holds no facts of its own. Each section is read from the one place that
owns it, so a change there reaches the page and nothing can disagree.

| Section                              | Comes from                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Title                                | The stories file `title`                                                                      |
| Summary                              | The component's TSDoc summary                                                                 |
| Status, complexity, category, since  | `<Name>Spec.yaml` (`DocSpecFacts`), drawn as `Tag`s; the status tag's tone follows the status |
| Playground and prop table            | The first story, and the TSDoc on `types.ts`                                                  |
| Usage: do, don't, use something else | The spec's `usage` (`DocSpecGuidance`)                                                        |
| Examples                             | The stories. Each explanation is the JSDoc above it                                           |
| Accessibility facts                  | The spec's `accessibility` (`DocSpecAccessibility`)                                           |
| Accessibility write-up               | The component's accessibility MDX page, by link                                               |
| Exports                              | The spec's `exports` (`DocSpecExports`)                                                       |

What the MDX itself holds is the order of the sections and one `<Canvas>` per
example. The `Doc*` blocks are in `src/components/docSpec`. They read the spec
through Vite's `?raw` import and the `yaml` package, and each returns nothing
when the spec has nothing for it, so a short spec never leaves an empty heading.

The `@remarks`, `@example` and `@a11y` tags in the TSDoc are not shown on the
page. The docgen Storybook uses keeps the summary and the prop descriptions and
drops block tags. The reasoning in `@remarks` is for the editor; the page shows
the spec's guidance and the stories instead.

## Adding a page

1. Copy `templates/Component.mdx` to `src/stories/<category>/<Name>.mdx`, next
   to `<Name>.stories.tsx`.
2. Replace `Component` with the exported name and `category` with the group
   folder in the imports, as the template's header comment says.
3. Remove `tags: ["autodocs"]` from the stories file. Storybook stops indexing
   with "You created a component docs page ... but also tagged the CSF file with
   'autodocs'" if both are present.
4. Add the example stories the page needs, each with a JSDoc that explains what
   it shows, then list them in the Examples section.
5. Set `files.storybookDocComponent` in the spec to the MDX path, and add the
   path as an `@see` in the component's TSDoc.
6. Run `npm run build -w @retrojb/retrojb-storybook` and open the page.

A component with no MDX keeps the `autodocs` tag and gets Storybook's generated
page. Both kinds show the same prop table, because that comes from the docgen
set-up below.

## How the prop table gets the TSDoc

Three settings in `.storybook/main.ts` and one file make this work. Without any
one of them the prop table is empty or lacks descriptions.

- **`react-docgen-typescript`**, not the default `react-docgen`. The default
  reads one file and cannot follow `ButtonVariants["intent"]` to its union, so
  every variant would show as a type name. This one asks the compiler, so the
  table shows `"primary" | "secondary" | ...`.
- **A prop filter** that drops props declared in `node_modules`. That removes
  the native attributes the components inherit and leaves what the library adds
  or redeclares. This is why every variant is redeclared on the props interface
  (`TSDOC.md`).
- **An alias** from `@retrojb/ui` to `../../packages/ui/src/index.ts`. Docgen only
  processes source files, and the package's `main` is `dist`. The subpaths
  (`@retrojb/ui/styles.css`) still resolve to `dist`, so build the package
  before starting Storybook, as before. Stories now run against source rather
  than the built package.
- **`.storybook/tsconfig.docgen.json`**, which names the library source. The
  plugin skips any file outside the TypeScript project it is given, and the
  app's own `tsconfig.app.json` covers `src` only.

Defaults reach the table through `@default`, not TSDoc's `@defaultValue`, which
the docgen ignores. See `TSDOC.md`.

## Troubleshooting

| Symptom                                   | Cause                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Build stops with "Unable to index"        | The stories file still has `tags: ["autodocs"]`                       |
| Summary and prop descriptions are missing | Docgen skipped the file. Check `tsconfig.docgen.json` covers it       |
| Prop table has only `onClick` and `text`  | Docgen is not reading source: check the alias, `include` and tsconfig |
| Default column shows `-`                  | The member uses `@defaultValue`; use `@default`                       |

Docs ids follow the `docs.defaultName` setting, so a page is
`<story-id>--documentation`, not `--docs`. Links to a docs page use that id.

---

author: John Baltes

updated: 2026-11-05

---
