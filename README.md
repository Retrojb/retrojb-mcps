# retro-mcps

A monorepo for MCP servers and other AI tooling, built on
[Turborepo](https://turborepo.dev).

## What's inside

### MCP servers

- **[`wcag-a11y-scanner`](packages/wcag-a11y-scanner)** — applies WCAG 2
  guidelines for colour contrast, screen reader support, and keyboard/tab
  navigation. Five tools for computing contrast ratios, auditing markup, and
  looking up success criteria, plus reference resources and a manual checklist.

### Bridge plugins

Some tools cannot be reached from a server. Figma, for instance, only exposes its
API from inside a plugin, so connecting an agent to it needs a plugin that runs in
the host application and relays between it and a harness.

- **[`figma-bridge-plugin`](packages/figma-bridge-plugin)** — Figma desktop
  plugin for the [Figma Console MCP](https://docs.figma-console-mcp.southleft.com/)
  harness. Speaks its wire protocol over localhost WebSocket, with on-demand
  reconnect, per-harness connectivity status, errors surfaced in the plugin
  window, live selection detail, and in-canvas highlighting of whichever node a
  command references.
- **[`@retrojb/plugin-kit`](packages/plugin-kit)** — the transport primitives bridge
  plugins share: request correlation, polling, backoff, and a bounded diagnostics
  buffer.

### Apps

- **[`docs`](apps/docs)** — the documentation site. Plain-language guides to the
  WCAG 2 criteria the scanner covers. Runs on port 3001.
- **[`web`](apps/web)** — Next.js app. Runs on port 3000.

### Shared packages

- `@repo/ui` — React component library shared by the apps
- `@repo/eslint-config` — shared ESLint configuration
- `@repo/typescript-config` — shared `tsconfig.json` bases

Everything is TypeScript.

## Getting started

```sh
npm install
npm run build
```

Then run the dev servers:

```sh
npm run dev
```

Or scope to one workspace:

```sh
npx turbo dev --filter=docs
npx turbo build --filter=@retrojb/wcag-a11y-scanner
```

## Using the MCP servers

MCP servers in this repo build to `dist/` and speak stdio, so any MCP host can
launch them. For Kiro, add them to `.kiro/settings/mcp.json` in the workspace, or
`~/.kiro/settings/mcp.json` to make them available everywhere:

```json
{
  "mcpServers": {
    "@retrojb/wcag-a11y-scanner": {
      "command": "node",
      "args": ["packages/wcag-a11y-scanner/dist/bin.js"],
      "disabled": false
    }
  }
}
```

Build the server first — the host launches `dist/bin.js`, not the TypeScript
source.

To try a server's tools without a host, use the MCP inspector:

```sh
npm run inspect --workspace @retrojb/wcag-a11y-scanner
```

## Using the bridge plugins

A bridge plugin is installed into its host application rather than registered with
an MCP client. For `figma-bridge-plugin`:

```sh
npx turbo build --filter=@retrojb/figma-bridge-plugin
```

Then in Figma Desktop → Plugins → Development → Import plugin from manifest…,
choose `packages/figma-bridge-plugin/dist/manifest.json`.

Each bridge ships a mock harness so you can exercise it without the real tool
installed:

```sh
npm run mock-server --workspace @retrojb/figma-bridge-plugin
```

## Adding a bridge plugin

New bridges go in `packages/<host>-bridge-plugin`. `figma-bridge-plugin` is the
reference layout:

- `src/shared/` — the wire protocol and any cross-context message contracts.
  Host-agnostic: no DOM, no host SDK.
- `src/<host-context>/` and `src/ui/` — one directory per execution context, when
  the host splits them. Give each its own tsconfig with only the type libraries
  that context actually has, so reaching for the wrong global is a compile error
  rather than a runtime one.
- `build.mjs` — esbuild, producing whatever the host loads directly.
- `tools/mock-*.mjs` — a mock harness speaking the real protocol, usable both
  manually and from tests.
- Depend on `@retrojb/plugin-kit` for connection state, retries, and diagnostics
  rather than reimplementing them.

Bundle workspace dependencies from TypeScript source via an esbuild `alias` that
mirrors the `paths` entry in your tsconfig. That keeps `build` independent of
build order and rules out shipping a stale `dist`.

## Adding an MCP server

New servers go in `packages/<name>`. `wcag-a11y-scanner` is the reference
layout:

- `package.json` with `"type": "module"`, a `bin` entry pointing at
  `dist/bin.js`, and `build: "tsc"`
- `tsconfig.json` extending `@repo/typescript-config/base.json`, with `outDir`
  set to `dist`
- `src/bin.ts` — the executable; calls `serveStdio(createServer)` and logs only
  to stderr, since stdout is the JSON-RPC channel
- `src/server.ts` — a `createServer()` factory registering tools and resources
- `src/index.ts` — side-effect-free library exports, so the package can be
  imported without starting a server

`turbo.json` already lists `dist/**` as a build output, so caching works without
further configuration.

## Scripts

| Command               | Effect                             |
| --------------------- | ---------------------------------- |
| `npm run build`       | Build every app and package        |
| `npm run dev`         | Start every dev server and watcher |
| `npm run test`        | Run every workspace's tests        |
| `npm run check-types` | Type-check every workspace         |
| `npm run lint`        | Lint every workspace               |
| `npm run format`      | Format with Prettier               |

## Known issues

`npm run lint` currently fails across every workspace with
`TypeError: Cannot read properties of undefined (reading 'Intrinsic')`. The cause
is `ts-api-utils` being incompatible with the TypeScript version aliased in
`@repo/eslint-config` (`typescript: npm:@typescript/typescript6`). It predates
the packages in this repo and affects `docs`, `web`, and `@repo/ui` equally.

Note that ESLint exits `0` despite the crash, so `turbo lint` reports success.
Use `npm run check-types` as the real gate until the toolchain versions are
reconciled.
