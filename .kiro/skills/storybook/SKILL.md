---
name: storybook
description: Storybook story to ensure consistency across component stories
---

For general storybook knowledge, follow the provided llm docs
`references/storybook-llm.md`.

## Story Structure

```tsx
import { $COMPONENT } from "@retrojb/ui";

const meta = {
  title: "$CATEGORY/$COMPONENT",
  component: $COMPONENT,
  parameters: {
    layout: "centered",
  },
  // No `autodocs` tag when the component has a docs page (`$COMPONENT.mdx`);
  // Storybook cannot index both.
  argTypes: {},
} satisfies Meta<typeof $COMPONENT>;

export default meta;
type Story = StoryObj<typeof meta>;
```

### Component docs page

Copy `apps/retrojb-storybook/templates/Component.mdx` to
`apps/retrojb-storybook/src/stories/$CATEGORY/$COMPONENT.mdx` and follow the
header comment in the template. How the page gets its content is in
`project-docs/STORYBOOK_DOCS.md`.

### Accessibility Documentation.

Extract and synthesis the accessibility comments in the components `style.ts`
files. Create in
`apps/retrojb-storybook/src/stories/$CATEGORY/accessibilityDocs`

```
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="$CATEGORY/$COMPONENT/Accessibility" />

# $COMPONENT Accessibility

## WCAG Standard and Expectations

### Colors

### Aria

```
