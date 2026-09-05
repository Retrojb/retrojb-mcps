# Typescript

This document defines best practices and standards for the `@retrojb/retro-mcp`
mono repository. These guidelines are opininated to the engineers liking, but
should always follow strict type safety.

## Tooling & Versions

List of dependencies and versions that should be used in this project. This
includes Typescript, Tsup, eslint typescript and others.

- Typescript
- Tsup

## `tsconfig` standards

- Extentionless exports
- `moduleResolution` should be `bundler`.
  - For component libraries type-checking is completed but the strictness of
    `nodenext` breaks emitted files. This makes consumers bundlers validate the
    typechecking.
- `module` should be `esnext`
