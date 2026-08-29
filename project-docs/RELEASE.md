# Release process

Versioning in this repo is handled by
[changesets](https://github.com/changesets/changesets). Every package starts at
`0.0.0` and changesets owns every number after that — nobody edits a `version`
field by hand.

## The short version

```sh
# 1. Make your change, then describe it
npm run changeset

# 2. When you are ready to cut versions
npm run changeset:version

# 3. Commit the result
git add . && git commit -m "chore: version packages"
```

## How it works

A **changeset** is a small Markdown file in `.changeset/` recording which
packages changed and how much. It is written when you make the change, not at
release time, which is the whole point: the person who understands the change
writes the note while it is fresh.

`npm run changeset` asks two things:

1. **Which packages changed.** Space to select, enter to confirm.
2. **How significant.** `patch` for a fix, `minor` for a feature, `major` for a
   breaking change.

It then writes something like `.changeset/brave-pandas-dance.md`. Commit it
alongside your code.

`npm run changeset:version` consumes every pending changeset: it bumps versions,
writes or appends to each package's `CHANGELOG.md`, deletes the consumed
changesets, and refreshes `package-lock.json`. Review the diff before
committing.

## Checking state

```sh
npm run changeset:status
```

Lists packages that have changed since `main` without a changeset. Useful in CI
to catch a PR that forgot one.

## Things specific to this repo

**Every package is private.** Nothing here is published to npm. Changesets
normally skips private packages entirely, so `.changeset/config.json` sets:

```json
"privatePackages": { "version": true, "tag": false }
```

That means versions and changelogs are generated, but no git tags are created
and nothing is published. If a package later becomes publishable, remove its
`"private": true` and add a `release` script that runs `changeset publish`.

**Internal dependencies use `"*"`.** Because workspace packages depend on each
other with `"*"` rather than a pinned range, bumping one package does not
cascade a version bump to its dependents, and changelogs will not carry "updated
dependencies" entries. That is the right trade while nothing is published —
`"*"` always resolves to the local copy. If you start publishing, switch these
to real ranges so consumers get correct constraints.

**Apps are versioned too.** `@retrojb/docs` is an application, so its version
number does not mean much. Harmless, but if the noise bothers you, add it to
`ignore` in `.changeset/config.json`:

```json
"ignore": ["@retrojb/docs"]
```

**Config packages rarely need changesets.** `@retrojb/eslint-config` and
`@retrojb/typescript-config` change tooling rather than shipped behaviour. Use
`npm run changeset -- --empty` when a change genuinely needs no release note.

## Richer changelogs

The current setup uses the built-in changelog generator, which needs no
configuration and works offline. To get changelogs that link to pull requests
and credit authors:

```sh
npm install -D -E @changesets/changelog-github
```

```json
"changelog": [
  "@changesets/changelog-github",
  { "repo": "Retrojb/retrojb-mcps" }
]
```

That generator calls the GitHub API, so `changeset version` will then require a
`GITHUB_TOKEN` in the environment. That is the reason it is not the default here
— a versioning step that fails without a secret is a poor default for local use.

## Suggested CI check

Not yet wired up. A workflow that runs `npm run changeset:status` on pull
requests would catch changes that arrive without a release note, which is the
failure mode this system has.
