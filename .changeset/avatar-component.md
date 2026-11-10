---
"@retrojb/ui": minor
"@retrojb/retrojb-storybook": patch
---

Add `Avatar`: a picture or initials that stands for a person, team or account,
in a round or square frame.

`shape` is `round` (the default, for a person) or `square` (slightly rounded
corners, for a team, organisation or project). `size` is `sm`, `md` or `lg`
(24, 40 and 64px), and `elevated` adds the `raised-1` shadow. `name` is
required: it is the accessible name and the source of the initials. A missing or failed `src` falls back to the initials, `initials` overrides them, and `initials=""` shows a person glyph. The avatar renders as one
`role="img"` named by `name`; `decorative` hides it from assistive technology when the name is written beside it, and a blank `name` does the same. `Avatar`, `avatarStyles`, `IAvatarProps`
and `AvatarVariants` are exported. Storybook gains the `Avatar` stories, docs
page and accessibility page.
