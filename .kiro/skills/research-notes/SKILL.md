---
name: research-notes
description:
  Store research output in project-docs/research/. Use when the user says
  "research this", "look into", "investigate" or asks for findings to be written
  up, and when they ask to split a research document into parts.
---

Use this skill whenever the user asks for research and the result should be
kept, or asks to split an existing research document.

## Format

Every file follows `project-docs/TEMPLATE.md` and the rules in
`.kiro/steering/project-docs.md`. Research files always include a
`## References / Citations` section after the author block, and every claim from
a source is cited with a reference-style link.

## Single document

1. Do the research. Prefer official documentation and note the date sources were
   read.
2. Choose a meaningful kebab-case name from the topic, for example
   `figma-plugin-networking.md`. Avoid generic names such as `research.md`.
3. Save it as `project-docs/research/<name>.md`. If the name exists, ask whether
   to update it or pick a new one. Never overwrite silently.
4. Fill in `author` from `git config user.name` and `updated` with today's date.

## Splitting a document

When asked to split documentation:

1. Create `project-docs/research/<meaningful-name>/`, named after the research
   topic, not after the action. Example: `figma-plugin-networking/`.
2. Put an `overview.md` in it with the summary, a table of contents linking to
   every part, and the shared citations.
3. Give each part its own kebab-case file named for its content, for example
   `websocket-lifecycle.md`. Do not number or call them `part-1.md`.
4. Each part follows the template, including its own author block, and its own
   citations when it is research.
5. Move the original into the new directory as the parts, do not leave a
   duplicate behind. Update any links that pointed at the old path.

## Finish

Report the path or directory created. Check the output for emojis, em dashes, en
dashes and inline links before finishing.
