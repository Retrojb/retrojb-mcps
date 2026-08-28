# figma-bridge-plugin

A Figma desktop plugin that bridges Figma to a
[Figma Console MCP](https://docs.figma-console-mcp.southleft.com/) harness.

The harness runs on your machine and exposes Figma to an AI agent, but it has no
way into Figma on its own — Figma's API is only reachable from inside a plugin.
This is that plugin.

It speaks the harness's wire protocol, so it works as a drop-in alternative to
the Desktop Bridge that ships with the harness. See
[Command coverage](#command-coverage) for where the two differ.

## What it does

- **Refresh on demand.** One button drops every harness connection and
  rediscovers from scratch. Useful when you have restarted the harness, switched
  AI clients, or simply do not trust the current state.
- **Shows connectivity, per harness.** Ports 9223-9232 are scanned continuously.
  The Status tab lists every harness found with its version, PID, and how many
  commands it has served.
- **Reports errors in the plugin window.** Figma's plugin console is a separate
  devtools window most people never open, so failures surface in an Activity tab
  instead — connection drops, command failures, broken file identification.
- **Displays the current selection.** Type, size, position, nesting path,
  component linkage, and lock state for everything you have selected, updated
  live.
- **Highlights the node it is referencing.** When a harness command names a node,
  the plugin outlines it on the canvas so you can see what the agent is touching.

## Setup

Build the plugin:

```sh
npm install
npx turbo build --filter=@retrojb/figma-bridge-plugin
```

Then in **Figma Desktop** → **Plugins** → **Development** → **Import plugin from
manifest…**, choose:

```
packages/figma-bridge-plugin/dist/manifest.json
```

Run it from **Plugins** → **Development** → **Retro MCP Bridge**. Start your
harness and the plugin attaches on its own, usually within three seconds.

Figma caches plugin files at the application level, so after a rebuild you need
to close and reopen the plugin window. A re-import is only needed when
`manifest.json` itself changes.

### Development

```sh
npm run dev --workspace @retrojb/figma-bridge-plugin
```

Rebuilds on change, unminified so stack traces in Figma's plugin console are
readable.

## Trying it without an agent

The package ships a mock harness that speaks the real protocol, so you can
exercise the plugin without installing the actual MCP server:

```sh
npm run mock-server --workspace @retrojb/figma-bridge-plugin
```

Open the plugin in Figma, then drive it from the terminal:

```
GET_FILE_INFO
GET_SELECTION
HIGHLIGHT_NODES {"nodeIds":["1:23"],"reason":"manual test"}
```

Select something in Figma and run `GET_SELECTION` to watch selection reporting;
run `HIGHLIGHT_NODES` with a real node id to watch the outline appear.

## Architecture

A Figma plugin runs in two isolated contexts, and neither can do the other's job:

| Context | File      | Has                       | Lacks           |
| ------- | --------- | ------------------------- | --------------- |
| Sandbox | `code.js` | the `figma` API           | network, DOM    |
| UI      | `ui.html` | `WebSocket`, `fetch`, DOM | the `figma` API |

So every harness command arrives in the UI, gets relayed to the sandbox over
`postMessage`, and its result relayed back out the socket it came from.

```
harness ──ws──▶ ui.html ──postMessage──▶ code.js ──▶ Figma API
        ◀──────         ◀───────────────
```

That split drives most of the structure:

- `src/shared/` — types both contexts use. No DOM, no `figma`.
- `src/ui/` — discovery, the socket pool, the window. Typechecked with the DOM
  library and **without** the Figma typings, so an accidental `figma.` reference
  fails the build rather than failing in Figma.
- `src/sandbox/` — the Figma API work. Typechecked with the Figma typings and
  **without** the DOM, for the same reason in reverse.

Three tsconfigs enforce that, and a test asserts it against the built output.

### Discovery

Ports are probed over HTTP `/health` before any WebSocket is opened, and only
dialled if the response looks like a harness (`{status: "ok", version, clients}`).

This ordering is not incidental. `new WebSocket()` against a closed port logs an
uncatchable console error, so scanning ten ports every three seconds by dialling
would bury every real message in noise. `fetch` rejects quietly. The shape check
also matters because port 9223 is Chrome's remote debugging port in some setups,
and it would otherwise accept a WebSocket and then behave strangely.

Cadence is 3s while nothing is connected and 10s once something is, so attaching
is prompt without polling forever at full speed.

### Multiple harnesses

Each harness instance binds its own port, and one runs per AI client tab in normal
use. The plugin connects to **all** of them — a plugin attached to only the first
leaves the others unable to reach Figma. Events are broadcast to every
connection; command replies go back only to the socket that asked, because the
harness rejects a reply arriving on a socket belonging to a different file.

## Node highlighting

Figma gives plugins no overlay or annotation layer, so there are only two honest
ways to point at a node. Both are implemented, selectable in Settings:

**`overlay`** (default) — draws a temporary dashed outline tracing the node's
bounding box. Leaves your selection alone, which matters because the plugin is
simultaneously _displaying_ that selection. The cost is a document mutation and
an undo entry.

**`select`** — sets `figma.currentPage.selection`, borrowing Figma's own
selection chrome. No document mutation, but it destroys whatever you had
selected, and the Selection tab then follows the agent rather than you.

Overlays are cleaned up in four places, because a leaked one is a stray locked
rectangle in your file with nothing running to explain it:

1. when the duration elapses,
2. when the next highlight replaces it,
3. on page change and plugin close,
4. swept at startup, catching anything a crash left behind.

They are also excluded from selection reports and document-change events, so a
highlight never looks to the harness like you edited the file.

Two behaviours worth knowing:

- Outlines are axis-aligned, because `absoluteBoundingBox` is. A rotated node
  gets a box around it rather than a rotated outline.
- A node on another page is **reported, not chased**. Switching your page because
  an agent touched something elsewhere is more disruptive than telling you about
  it, so the Activity tab notes it instead.

## Change monitoring

The harness wants a `DOCUMENT_CHANGE` event stream. Figma offers two ways to
produce one, with very different costs, and the plugin defaults to the cheap one.

**`current-page`** (default) — `nodechange` on the page you are viewing, plus
global `stylechange`. Starts instantly on any file size. Edits made on _other_
pages are not reported.

**`full-document`** (opt-in, in Settings) — `documentchange` across every page.
Complete, but it requires `figma.loadAllPagesAsync()` first, which Figma warns can
take tens of seconds on a large file and can hit a memory limit.

Figma's own guidance is to prefer the granular events for exactly this reason. If
the full load fails, the plugin falls back to `current-page` and says so in the
Activity tab rather than silently monitoring nothing.

One subtlety worth knowing if you touch this code: `nodechange` is bound to a
specific `PageNode`, so switching pages stops the events unless the subscription
is moved. The plugin re-points it on `currentpagechange`; without that, monitoring
would look healthy while reporting nothing.

`GET_LOCAL_COMPONENTS` is the one command that needs a full load regardless, since
`figma.root.findAllWithCriteria` searches the whole document. It pays that cost
lazily on first call and memoises it.

## Command coverage

This bridge implements a focused subset of the harness's surface, not all 72 of
its methods:

| Method                                                   | Purpose                                                |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `GET_FILE_INFO`                                          | File identity, page, editor type                       |
| `GET_SELECTION`                                          | Current selection, harness shape plus UI detail        |
| `GET_NODE`                                               | Serialised node by id                                  |
| `SET_SELECTION`                                          | Select nodes                                           |
| `SCROLL_AND_ZOOM`                                        | Bring nodes into view                                  |
| `HIGHLIGHT_NODES` / `CLEAR_HIGHLIGHT`                    | Outline nodes explicitly (this plugin's own extension) |
| `RENAME_NODE`, `MOVE_NODE`, `RESIZE_NODE`, `DELETE_NODE` | Basic mutations                                        |
| `GET_LOCAL_COMPONENTS`                                   | Local components and component sets                    |
| `GET_VARIABLES_DATA` / `REFRESH_VARIABLES`               | Variables and collections                              |
| `EXECUTE_CODE`                                           | Run arbitrary code in the sandbox                      |

`EXECUTE_CODE` is the significant one: the harness routes most of its write tools
through it, so a large share of harness functionality works even though the named
method is not implemented here. Anything genuinely unimplemented returns an error
listing what is available, rather than failing silently.

If you need the full named-method surface, use the harness's own bundled Desktop
Bridge. This plugin exists for the parts that one does not do: visible
connectivity, error reporting in the window, live selection detail, and canvas
highlighting.

## Security

**`EXECUTE_CODE` runs arbitrary JavaScript against your open document.** That is
inherent to how the harness works, not a choice this plugin makes — but it is
worth being explicit about:

- Any process on your machine that can reach ports 9223-9232 can send commands
  while the plugin is open. There is no authentication on the local transport.
- There is a toggle in Settings. It defaults to **on**, because turning it off
  breaks most harness write tools, and it is deliberately **not persisted** — a
  permission this broad should not be silently re-granted on the next open.
- The timeout bounds how long the caller waits, not how long the code runs. The
  sandbox cannot interrupt a running script.

Close the plugin when you are not actively working with an agent.

## Known constraints

- **`figma.fileKey` needs `enablePrivatePluginApi`.** It is set in the manifest,
  which works for a locally imported development plugin. Without a file key the
  harness cannot route by file: a single connection still works, but multi-file
  routing does not. The plugin warns in the Activity tab when this happens.
- **`METADATA_CHANGE` is not implemented.** The harness uses it to track
  description and annotation edits for version diffing. Everything else in the
  event surface — `FILE_INFO`, `SELECTION_CHANGE`, `PAGE_CHANGE`,
  `DOCUMENT_CHANGE`, `CONSOLE_CAPTURE` — is.
- **Change monitoring is scoped to the current page by default.** See
  [Change monitoring](#change-monitoring) for why, and how to widen it.
- **Cloud relay mode is not implemented.** Local WebSocket only.

## Verification

```sh
npm test --workspace @retrojb/figma-bridge-plugin
```

92 checks. The transport ones are not mocked: Node 24 ships global `WebSocket`
and `fetch`, which are the only host APIs the pool uses, so the shipping
transport code runs against a real server on a real socket — covering discovery,
identification, command round-trips, error propagation, reconnect after an
abrupt drop, suppressed reconnect on a deliberate close, and multi-instance
fan-out.

The sandbox checks run the real highlighter against a fake Figma API, focused on
the cleanup guarantees. That fake also **enforces the dynamic-page rules** — it
throws on a `documentchange` registration without a prior `loadAllPagesAsync`,
exactly as Figma does — and one test boots the real sandbox entry point against
it. That is a regression test for a shipped bug: the plugin used to register
`documentchange` at module top level and died at load with
`Cannot register documentchange handler in incremental mode`.

The build checks assert the output is actually loadable: tokens replaced, assets
inlined, and neither context reaching for the other's globals.
