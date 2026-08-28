#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

/**
 * stdio entry point, for a host that launches this server as a child process.
 *
 * stdout is the JSON-RPC channel — one stray `console.log` corrupts the stream,
 * so every diagnostic goes to stderr.
 */
serveStdio(createServer, {
  onerror: (error) => {
    console.error(`[${SERVER_NAME}] ${error.stack ?? error.message}`);
  },
});

console.error(`${SERVER_NAME} ${SERVER_VERSION} listening on stdio`);
