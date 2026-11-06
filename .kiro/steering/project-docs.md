---
inclusion: fileMatch
fileMatchPattern: "project-docs/**/*.md"
---

# project-docs format

Every Markdown file in `project-docs/` follows `project-docs/TEMPLATE.md`. Read
it before creating or editing a file there. `TEMPLATE.md` itself is exempt.

## Required shape

1. `# Title`, then a one or two sentence description.
2. A table of contents directly after the description when the file has more
   than 2 h2 headings.
3. The body.
4. At the end of the file, after a `---` rule, an author block:

   ```markdown
   ---

   author: Name

   updated: YYYY-MM-DD

   ---
   ```

   Keep `author` and `updated` on separate lines with a blank line between,
   because Prettier merges them into one line otherwise.

5. Research files only: a `## References / Citations` section after the author
   block.
6. Markdown reference definitions (`[id]: url`) as the very last lines.

## Rules

- Links, both URLs and relative paths, use reference style: `[text][id]` in the
  body, `[id]: target` at the end of the file. Do not use inline `[text](url)`
  links. Bare URLs in code spans or code blocks are fine.
- Anchor links to headings in the same file are the exception and may stay
  inline in the table of contents.
- Set `author` from `git config user.name`. Set `updated` to today's date
  (`YYYY-MM-DD`) on every edit, however small.
- No emojis, em dashes or en dashes. Use commas, colons, periods or hyphens.
- Add screenshots when they help, stored next to the doc or in an `assets/`
  folder beside it.

## Where files go

- `research/` for research output. See the `research-notes` skill.
- `processes/` for how-to and workflow docs.
- `references/` for lookup material.
- `archieved/` (sic) for retired docs.
- Existing top-level docs stay where they are, because code and agents link to
  their paths.
