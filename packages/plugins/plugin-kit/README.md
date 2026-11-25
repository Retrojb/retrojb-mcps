# @retrojb/plugin-kit

Transport primitives shared by bridge plugins.

A _bridge plugin_ runs inside a host application — Figma, Sketch, a browser
extension — and connects it to an MCP harness. The harness drives; the bridge
executes host API calls and reports host events back.

The pieces here are the parts that are the same whatever the host is.

| Export            | Problem it solves                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RequestRegistry` | Correlates requests with responses over a fire-and-forget channel, with timeouts. Without it, a dropped reply hangs the caller forever — which in a plugin UI is a button that never stops spinning.                  |
| `Poller`          | A self-rescheduling loop with two cadences: fast while searching, slow once found. Reschedules after each pass completes, so a slow pass cannot pile up behind itself.                                                |
| `Backoff`         | Exponential backoff with jitter. Tracks attempts rather than scheduling them, so the caller keeps control of its timers. Jitter matters when several connections drop together and would otherwise retry in lockstep. |
| `Diagnostics`     | A bounded, subscribable log buffer. Plugins have no console a user will actually look at, so errors have to be surfaced in the plugin's own UI. Bounded because a plugin can stay open for days.                      |

## Host requirements

Deliberately dependency-free, with no DOM and no Node types. This code has to
run in a Figma plugin sandbox, a plugin iframe, and a test process without
change.

The one host capability it needs — `setTimeout` and `clearTimeout` — is declared
explicitly in `src/host-timers.ts` rather than pulled in via the `DOM` or `node`
type libraries. Two reasons: those libraries would also supply `document`,
`window`, and `process`, none of which exist in a Figma sandbox, so having them
in scope turns a compile error into a runtime one. And declaring them as globals
would collide with `lib.dom.d.ts` in consumers that legitimately do have a DOM.

## Scope

Shaped by one consumer so far, `figma-bridge-plugin`. Everything here was needed
to build that plugin rather than added speculatively — it is extraction, not a
framework. Expect the surface to shift when a second bridge lands.

## Usage

```ts
import {
  Backoff,
  Diagnostics,
  Poller,
  RequestRegistry,
} from "@retrojb/plugin-kit";

const diagnostics = new Diagnostics({ capacity: 300 });
diagnostics.subscribe((entries) => render(entries));

const registry = new RequestRegistry({ defaultTimeoutMs: 20_000 });
const id = registry.nextId();
const reply = registry.register<Result>(id, "load document");
channel.post({ id, method: "LOAD" });
// later: registry.resolve(id, payload) or registry.reject(id, "failed")

const poller = new Poller({
  idleIntervalMs: 3000,
  steadyIntervalMs: 10_000,
  isSatisfied: () => connections.length > 0,
  run: () => discover(),
  onError: (error) => diagnostics.warn("discovery", String(error)),
});
poller.start();
await poller.runNow(); // what a refresh button calls
```

Consumers bundle this from TypeScript source rather than from built output, so
there is no build-order dependency and no way to ship a stale `dist`.
