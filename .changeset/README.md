# Changesets

This folder holds pending changesets — small Markdown files describing changes
that have not been released yet. Each one records which packages changed and how
significant the change is, and they accumulate until someone runs a version
bump.

Add one with:

```sh
npm run changeset
```

The full workflow, including how versions and changelogs are generated, is in
[`project-docs/RELEASE.md`](../project-docs/RELEASE.md).

Do not edit `config.json` casually — `privatePackages.version` is what makes
versioning work at all here, since every package in this repo is private.
