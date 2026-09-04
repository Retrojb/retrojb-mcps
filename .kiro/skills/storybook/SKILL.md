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
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof $COMPONENT>;

export default meta;
type Story = StoryObj<typeof meta>;
```

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
