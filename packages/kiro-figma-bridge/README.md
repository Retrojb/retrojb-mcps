# @retrojb/kiro-figma-bridge

Connects the AI agent in your editor to the Figma file you have open.

Ask Kiro, Claude Code, Cursor, or Codex about the design on screen and it can
read the actual document: the layers you have selected, a component's real
padding, the variables behind a colour, the rendered pixels of a frame. It can
also point at things — highlighting a layer on your canvas so you can see which
one it means.

Nothing leaves your machine. The agent talks to a local server over MCP, and
that server talks to a Figma plugin over a WebSocket on loopback.

```
┌──────────────────────┐          ┌─────────────────────┐         ┌──────────────┐
│  your editor         │  stdio   │  bridge server      │   ws    │  Figma       │
│  Kiro / Claude /     │◄────────►│  127.0.0.1:9770     │◄───────►│  plugin      │
│  Cursor / Codex      │   MCP    │  (this package)     │  local  │  window      │
└──────────────────────┘          └─────────────────────┘         └──────┬───────┘
                                                                        │ figma API
                                                                 ┌──────▼───────┐
                                                                 │ your file    │
                                                                 └──────────────┘
```

## Why the plugin and the server are separate

A Figma plugin cannot listen on a port, and a process on your machine cannot
call the Figma plugin API. Only a plugin running inside Figma can read the
document, so the plugin has to be the one that dials out. The server exists to
be dialled, and to hold the MCP connection to your agent.

The plugin itself is split again, because Figma splits it: the sandbox
(`code.js`) owns the `figma` API and has no network, and the UI iframe
(`ui.html`) owns the network and has no `figma`. Every request crosses that
boundary twice.

## Security

This opens a listening socket on your machine, so it is worth being explicit
about what protects it.

**The access token never leaves the server.** `FIGMA_ACCESS_TOKEN` grants API
access to your whole Figma account, and a plugin is the last place it should end
up. Instead the server hashes it into an 8-character **pairing code** and prints
that. The derivation is one-way, so the code cannot be turned back into the
token, and deterministic, so you type it into the plugin once rather than every
session.

**The pairing code is never transmitted either.** The server sends a fresh
random challenge on every connection; the plugin replies with an HMAC of it
keyed by the code. A listener on loopback sees only a signature that is useless
on the next connection. The proof also covers the file id and the Figma user id,
so a client cannot sign one document and then claim to be another.

**Why this matters at all:** any web page you have open can connect to
`ws://localhost:9770`. Browsers permit that cross-origin, and `Origin` cannot be
used to stop it because a Figma plugin iframe legitimately sends `Origin: null`.
The pairing code is what makes the difference between "your agent can drive your
Figma file" and "anything running on your machine can".

Also in place:

- The socket binds `127.0.0.1`, never `0.0.0.0`.
- The `Host` header must be a loopback name, which closes DNS rebinding.
- A connection that does not authenticate within 10 seconds is dropped, and an
  unauthenticated connection cannot send or receive anything but the handshake.
- `/health` is unauthenticated by necessity — it is how discovery works — so it
  carries only what is needed to decide whether to dial. Never the code, never
  the token, never your email.
- **Document edits are off by default.** The agent can read your file and
  highlight layers out of the box; changing it requires ticking a box in the
  plugin window.

The one thing this does _not_ protect against is another process on your machine
that can read your environment, since it can derive the same code. Treat the
bridge as trusted-local, the same as any dev server.

## Setup

### 1. Get a Figma access token

Figma → your avatar → Settings → Security → Personal access tokens → generate
one. Read-only scopes are enough; the token is used once to look up which
account the bridge is acting for.

### 2. Build

```bash
npm install
npx turbo build --filter=@retrojb/kiro-figma-bridge
```

That produces both halves:

| Path                 | What it is                            |
| -------------------- | ------------------------------------- |
| `dist/server/bin.js` | the bridge server, run by your editor |
| `dist/figma-plugin/` | the plugin, imported into Figma       |

### 3. Point your agent at it

Each client has its own config file. In every case, set `FIGMA_ACCESS_TOKEN` in
the server's `env` rather than relying on your shell, because editors do not
reliably pass your shell environment to a spawned process.

**Kiro** — `.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["./packages/kiro-figma-bridge/dist/server/bin.js"],
      "env": { "FIGMA_ACCESS_TOKEN": "figd_your_token" },
      "disabled": false
    }
  }
}
```

**Claude Code** — `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["./packages/kiro-figma-bridge/dist/server/bin.js"],
      "env": { "FIGMA_ACCESS_TOKEN": "figd_your_token" }
    }
  }
}
```

**Cursor** — `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["./packages/kiro-figma-bridge/dist/server/bin.js"],
      "env": { "FIGMA_ACCESS_TOKEN": "figd_your_token" }
    }
  }
}
```

**Codex** — `~/.codex/config.toml`. Note this one is TOML, not JSON:

```toml
[mcp_servers.figma]
command = "node"
args = ["/absolute/path/to/packages/kiro-figma-bridge/dist/server/bin.js"]

[mcp_servers.figma.env]
FIGMA_ACCESS_TOKEN = "figd_your_token"
```

Running more than one at once is fine. Each spawns its own server, they take
separate ports from 9770 upward, and the plugin connects to all of them — so
both agents can see the same file.

### 4. Load the plugin into Figma

While developing, or for personal use:

Figma Desktop → Plugins → Development → Import plugin from manifest… → pick
`packages/kiro-figma-bridge/dist/figma-plugin/manifest.json`.

After a rebuild, close and reopen the plugin window; Figma caches plugin files
app-wide. You only need to re-import when `manifest.json` itself changes.

### 5. Pair

Start your agent, open the plugin in Figma, and paste the code the server
printed:

```
  Open the "Kiro Figma Bridge" plugin in Figma and enter:

      6KWK-BYAS
```

To see it again without reading editor logs:

```bash
FIGMA_ACCESS_TOKEN=figd_your_token npm run pair-code --workspace @retrojb/kiro-figma-bridge
```

The code only changes when you rotate the token, and the plugin remembers it per
machine.

## Publishing to Figma Community

The manifest is deliberately publishable. Figma → Plugins → Development → your
plugin → Publish.

Two things shape the design here, and both are worth knowing before you change
anything:

**`figma.fileKey` is unavailable to published plugins.** It only works for
private organisation plugins, behind `enablePrivatePluginApi`, and setting that
flag makes a plugin unpublishable. So this plugin mints its own id and stores it
in the file's plugin data instead. It travels with the file and survives
reopening, with two caveats: duplicating a file copies the id, and a read-only
file cannot store one (reported as `documentIdPersisted: false`). A test asserts
the flag stays absent so this cannot regress by accident.

**Reviewers see your `networkAccess` list.** Every entry is shown on the
plugin's Community page. This manifest lists only `localhost` ports, which makes
the "no data leaves your machine" claim checkable rather than a promise in a
description.

Adding a port to `BRIDGE_PORTS` means adding it to `manifest.json` too — Figma
blocks anything unlisted, and the failure is a silent connection refusal. A test
covers that pairing.

## Tools

| Tool                    | Reads / writes | What it does                                                                |
| ----------------------- | -------------- | --------------------------------------------------------------------------- |
| `figma_status`          | read           | Connected files, the account the bridge acts for, whether pairing succeeded |
| `figma_get_document`    | read           | File name, pages, which page is open                                        |
| `figma_get_selection`   | read           | Selected layers with type, size, position, and layer path                   |
| `figma_get_node`        | read           | Full properties of one layer, optionally with descendants                   |
| `figma_find_nodes`      | read           | Search by name substring and/or node type                                   |
| `figma_get_components`  | read           | Components and component sets with keys and descriptions                    |
| `figma_get_variables`   | read           | Variables and collections, with each value per mode                         |
| `figma_get_styles`      | read           | Paint, text, effect, and grid styles                                        |
| `figma_export_image`    | read           | Renders a layer to PNG/JPG, or returns SVG markup                           |
| `figma_recent_activity` | read           | Selection, page, and edit events since connecting                           |
| `figma_highlight`       | view           | Outlines layers on the canvas so the user can see them                      |
| `figma_clear_highlight` | view           | Removes those outlines                                                      |
| `figma_set_selection`   | view           | Replaces the canvas selection                                               |
| `figma_scroll_to`       | view           | Moves the viewport to a layer                                               |
| `figma_rename_layer`    | **write**      | Renames a layer. Needs "Allow document edits"                               |

"view" changes what the user is looking at but nothing that gets saved into the
file.

Searches and component listings default to the open page. `scope: "document"`
covers every page but forces Figma to load the whole file, which is slow on a
large one.

## Configuration

| Variable                               | Effect                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `FIGMA_ACCESS_TOKEN`                   | Derives the pairing code and identifies the account. Never sent to the plugin. |
| `KIRO_FIGMA_BRIDGE_PAIR_CODE`          | Use this code instead of deriving one. Survives token rotation.                |
| `KIRO_FIGMA_BRIDGE_PORT`               | Bind this port instead of scanning 9770-9779.                                  |
| `KIRO_FIGMA_BRIDGE_REQUIRE_USER_MATCH` | `1` refuses editors signed in as a different Figma account. See below.         |
| `KIRO_FIGMA_BRIDGE_NO_AUTH`            | `1` accepts unauthenticated plugins. Insecure; for developing this plugin.     |
| `KIRO_FIGMA_BRIDGE_LOG_LEVEL`          | `debug`, `info` (default), `warn`, `error`. All logging goes to stderr.        |

### On strict user matching

The server compares `figma.currentUser.id` from the editor against the account
id from `GET /v1/me`. A mismatch means someone else's Figma session is talking
to your bridge, and it is always reported — in the server log and in the plugin
window.

It is not refused by default. Those two identifiers are believed to be the same,
but Figma does not document that as a contract, so enforcing it by default would
risk locking people out of their own bridge over an undocumented detail. Set
`KIRO_FIGMA_BRIDGE_REQUIRE_USER_MATCH=1` if you would rather fail closed.

## Development

```bash
npm run dev --workspace @retrojb/kiro-figma-bridge     # rebuild the plugin on change
npm run check-types --workspace @retrojb/kiro-figma-bridge
npm run test --workspace @retrojb/kiro-figma-bridge
```

The three execution contexts each have their own `tsconfig` and their own ESLint
scope, which is what turns "used `fetch` in the sandbox" or "used `figma` in the
iframe" into a compile error rather than a runtime failure only reproducible
inside Figma.

Tests run the real server against a real WebSocket client
(`tests/helpers/fake-plugin.mjs`), including the client misbehaving on purpose —
wrong code, wrong protocol version, a proof signed for a different document.
`tests/hmac.test.mjs` checks the hand-written SHA-256 and HMAC against
`node:crypto`, which is what justifies shipping them: the same implementation
has to run in the Figma sandbox, the plugin iframe, and Node, and only the last
of those has Web Crypto.

## Known limitations

- **No layout or content editing.** Only renaming is implemented as a write. The
  plumbing and permission gate are in place; more mutations are a matter of
  adding handlers.
- **Highlight overlays are axis-aligned.** A rotated layer gets a box around its
  extent rather than a rotated outline.
- **Change monitoring covers the open page**, not the whole document. Watching
  every page requires loading every page, which is the slow path this avoids
  unless asked.
- **Duplicated files share a bridge id** until the copy is reopened. The server
  keeps the most recent connection per id rather than assuming uniqueness.

## Relationship to `@retrojb/figma-bridge-plugin`

That package is a client for a _third-party_ harness
([`southleft/figma-console-mcp`](https://github.com/southleft/figma-console-mcp))
and has no server of its own, no authentication, and depends on
`enablePrivatePluginApi`. This package is self-contained — it ships both halves
— authenticates every connection, and is publishable. They use different port
ranges (9223-9232 versus 9770-9779) and different `/health` discriminators, so
both can run at once without either dialling the other's server.
