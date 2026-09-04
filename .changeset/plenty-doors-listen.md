---
"@retrojb/ui": minor
"@retrojb/docs": patch
---

Give every component the same shape on disk, and fix the build that did not follow it.

A component is now a directory rather than a file: `<Name>.tsx` for the React
layer, `styles.ts` for the `tv()` definition, `types.ts` for the props
interface, and an `index.ts` barrel, grouped under
`components/<group>/<Name>`. `Button` moves to `interactions/`, `Link` to
`navigation/`, `Input` to `forms/`, and the central `variants.ts` is gone — its
contents now sit beside the components that use them.

The variant functions are renamed to match: `link` and `input` become
`linkStyle` and `inputStyle`, alongside the existing `buttonStyle`. Prop
interfaces are `IButtonProps`, `ILinkProps` and `IInputProps`. The
server/client split is unchanged — `styles.ts` carries no `"use client"`, so
`linkStyle()` is still callable from a server component for the
`<NextLink className={linkStyle()}>` case.

Two build fixes came out of this. `tsup`'s entry globs were single-level, so
nothing under `components/<group>/<Name>/` was compiled — and the failure was
silent, because `tsc` still emitted the declarations, leaving a `dist` that
type-checked while `dist/index.js` imported JavaScript that was never written.
It surfaced only as `Failed to resolve import` in Storybook. The package's
`moduleResolution` override is also reverted to the `NodeNext` of the shared
base config, which turns the extensionless and directory imports that hid the
problem into compile errors.

`Button` regained the `"use client"` directive it lost, and its `styles.ts` now
builds on the configured `tv` instance from `lib/tv.ts` rather than importing
`tailwind-variants` directly, restoring the `radius` conflict rule that keeps
`<Button className="rounded-full">` working.
