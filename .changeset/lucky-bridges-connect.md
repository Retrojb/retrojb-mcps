---
"@retrojb/kiro-figma-bridge": minor
---

Add `kiro-figma-bridge`: connects the AI agent in an editor (Kiro, Claude Code, Cursor, Codex) to the Figma file the user has open.

Ships both halves of the bridge. A publishable Figma plugin reads the document and highlights layers on the canvas; a local server exposes that to the agent as MCP tools over stdio while talking to the plugin over a WebSocket on loopback. Fifteen tools cover selection, layer properties, search, components, variables, styles, image export, and recent activity, plus one gated write.

Every connection is authenticated. `FIGMA_ACCESS_TOKEN` stays in the server process and is hashed into a short pairing code, which is itself never transmitted — the plugin proves possession with an HMAC over a per-connection challenge that also binds the file and user ids. The socket is loopback-only with `Host` validation, unauthenticated connections cannot issue commands, and document edits are off until the user opts in.
