---
name: write-a-paragraph
description:
  Write a paragraph of at least 5 sentences about a given prompt and save it as
  a Markdown file in the project root temp/ directory.
---

Use this skill when the user asks you to write a paragraph about a topic or
prompt.

## Steps

1. Read the user's prompt and identify the topic and any specific points, tone,
   or audience they asked for.
2. Write one cohesive paragraph about the prompt.
   - It must contain at least 5 complete sentences. More is fine.
   - Stay on topic, keep a logical flow from sentence to sentence, and end with
     a concluding sentence.
3. Create a kebab-case filename from the topic, for example
   `the-history-of-coffee.md`. If a file with that name already exists in
   `temp/`, add a numeric suffix such as `the-history-of-coffee-2.md` so
   existing content isn't overwritten.
4. Save the file in the `temp/` directory at the workspace root, for example
   `<workspace-root>/temp/the-history-of-coffee.md`. Create `temp/` if it does
   not exist.
5. Before you finish, count the sentences in the file to confirm there are at
   least 5. Then give the user the file path.

## File format

```markdown
# <Title based on the prompt>

<Paragraph of at least 5 sentences.>
```
