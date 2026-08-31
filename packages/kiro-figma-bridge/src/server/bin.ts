#!/usr/bin/env node
/**
 * Entry point launched by the editor.
 *
 * It does two jobs at once: serves MCP over stdio to the AI agent that spawned it,
 * and runs the WebSocket bridge the Figma plugin connects to. One process for both
 * so there is a single thing to configure and a single lifetime to manage — when
 * the editor closes the agent, the bridge goes with it.
 *
 * **stdout is the JSON-RPC channel.** One stray `console.log` corrupts the stream
 * and the client reports an unparseable message rather than the real problem, so
 * every diagnostic in this file goes to stderr.
 */

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { BridgeServer, type LogLevel, type Logger } from "./bridge-server.js";
import { fetchFigmaIdentity, type FigmaIdentity } from "./figma-identity.js";
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./mcp.js";
import {
  formatPairCode,
  looksUnexpanded,
  resolvePairing,
} from "./pair-code.js";
import { BRIDGE_PORTS } from "../shared/protocol.js";

/**
 * Explains a placeholder that was never substituted.
 *
 * Worth a bespoke message rather than folding into "no pairing code": the
 * variable *is* set from this process's point of view, so the usual advice to
 * set it is actively misleading. The fix is in the MCP client's configuration,
 * one level up, and that is not somewhere the user would think to look.
 */
function unexpandedAdvice(names: readonly string[]): string {
  return [
    `${names.join(" and ")} arrived as an unsubstituted placeholder (the literal text "\${${names[0] ?? ""}}"), not a value, so it has been ignored.`,
    "Your MCP client did not expand it — usually because the variable is missing from the environment the client itself was launched with (starting the editor from the Dock does not load your shell profile), or because the client only expands variables you have approved.",
    "Either put a real value in the client's config, or make sure the variable exists in the client's own environment, then restart it.",
  ].join(" ");
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface Args {
  readonly port: number | undefined;
  readonly printPairCode: boolean;
  readonly help: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const portIndex = argv.indexOf("--port");
  const rawPort =
    portIndex !== -1 ? argv[portIndex + 1] : process.env.KIRO_FIGMA_BRIDGE_PORT;
  const parsed =
    rawPort === undefined ? Number.NaN : Number.parseInt(rawPort, 10);

  return {
    port: Number.isInteger(parsed) ? parsed : undefined,
    printPairCode: argv.includes("--print-pair-code"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

const HELP = `${SERVER_NAME} ${SERVER_VERSION}

Connects the AI agent in your editor to the Figma file you have open.

Usage
  kiro-figma-bridge [--port <n>]
  kiro-figma-bridge --print-pair-code

Options
  --port <n>          Bind this port instead of scanning ${BRIDGE_PORTS[0]}-${BRIDGE_PORTS[BRIDGE_PORTS.length - 1]}.
  --print-pair-code   Print the pairing code and exit. Does not start a server.
  --help              Show this message.

Environment
  FIGMA_ACCESS_TOKEN                     Your Figma personal access token. The pairing
                                         code is derived from it, and it is used once to
                                         look up which account this bridge acts for. The
                                         token itself is never sent to the plugin.
  KIRO_FIGMA_BRIDGE_PAIR_CODE            Use this pairing code instead of deriving one.
  KIRO_FIGMA_BRIDGE_PORT                 Same as --port.
  KIRO_FIGMA_BRIDGE_REQUIRE_USER_MATCH   Set to 1 to refuse editors signed in as a
                                         different Figma account than the token's owner.
  KIRO_FIGMA_BRIDGE_NO_AUTH              Set to 1 to accept unauthenticated plugins.
                                         Insecure; for developing this plugin only.
  KIRO_FIGMA_BRIDGE_LOG_LEVEL            debug, info (default), warn, or error.
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const pairing = resolvePairing(process.env);

  // Printing the code is a standalone query, so stdout is the right channel here
  // — no MCP session exists to corrupt.
  if (args.printPairCode) {
    if (pairing.source === "disabled") {
      process.stderr.write(
        "Authentication is disabled (KIRO_FIGMA_BRIDGE_NO_AUTH=1). There is no pairing code.\n",
      );
      process.exitCode = 1;
      return;
    }
    if (pairing.code === "") {
      process.stderr.write(
        pairing.unexpanded.length > 0
          ? `${unexpandedAdvice(pairing.unexpanded)}\n`
          : "No pairing code: set FIGMA_ACCESS_TOKEN (or KIRO_FIGMA_BRIDGE_PAIR_CODE) and run this again.\n",
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${formatPairCode(pairing.code)}\n`);
    return;
  }

  const minRank =
    LEVEL_RANK[
      (process.env.KIRO_FIGMA_BRIDGE_LOG_LEVEL ?? "info") as LogLevel
    ] ?? LEVEL_RANK.info;

  const log: Logger = (level, message) => {
    if (LEVEL_RANK[level] < minRank) return;
    process.stderr.write(`[${SERVER_NAME}] ${level}: ${message}\n`);
  };

  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  let owner: FigmaIdentity | null = null;
  const rawToken = process.env.FIGMA_ACCESS_TOKEN?.trim() ?? "";
  // A placeholder cannot identify anyone, and calling the API with it would only
  // add a "could not confirm the account" warning on top of the real error.
  const token = looksUnexpanded(rawToken) ? "" : rawToken;

  if (token !== "") {
    const result = await fetchFigmaIdentity(token);
    if (result.ok) {
      owner = result.identity;
      log("info", `Acting for Figma account @${owner.handle}`);
    } else {
      // Not fatal. The pairing code is derived from the token by hashing, which
      // does not require the token to be valid, so the bridge still authenticates
      // correctly — it just cannot name the account.
      log(
        "warn",
        `Could not confirm the Figma account for FIGMA_ACCESS_TOKEN: ${result.reason}. Pairing still works; the account cannot be verified.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Warnings the user needs to see before anything connects
  // ---------------------------------------------------------------------------

  if (pairing.source === "disabled") {
    log(
      "warn",
      "Authentication is DISABLED. Any process on this machine can drive your Figma file while the plugin is open. Unset KIRO_FIGMA_BRIDGE_NO_AUTH for normal use.",
    );
  } else if (pairing.unexpanded.length > 0) {
    log("error", unexpandedAdvice(pairing.unexpanded));
  } else if (pairing.code === "") {
    log(
      "error",
      "No FIGMA_ACCESS_TOKEN and no KIRO_FIGMA_BRIDGE_PAIR_CODE, so no plugin can pair with this server. Set one and restart.",
    );
  }

  const requireUserMatch =
    process.env.KIRO_FIGMA_BRIDGE_REQUIRE_USER_MATCH === "1";

  // ---------------------------------------------------------------------------
  // Bridge
  // ---------------------------------------------------------------------------

  const bridge = await BridgeServer.start({
    pairing,
    owner,
    requireUserMatch,
    port: args.port,
    log,
  });

  log("info", `Bridge listening on ws://127.0.0.1:${bridge.port}`);

  if (pairing.required && pairing.code !== "") {
    // Deliberately prominent: this is the one thing the user has to act on, and
    // it is buried in editor log output otherwise.
    process.stderr.write(
      [
        "",
        `  Open the "Kiro Figma Bridge" plugin in Figma and enter:`,
        "",
        `      ${formatPairCode(pairing.code)}`,
        "",
        pairing.source === "token"
          ? "  This code comes from your FIGMA_ACCESS_TOKEN and will not change until you rotate it."
          : "  This code comes from KIRO_FIGMA_BRIDGE_PAIR_CODE.",
        "",
      ].join("\n"),
    );
  }

  // ---------------------------------------------------------------------------
  // MCP over stdio
  // ---------------------------------------------------------------------------

  const stdio = serveStdio(() => createMcpServer(bridge), {
    onerror: (error) => {
      log("error", error.stack ?? error.message);
    },
  });

  log("info", `${SERVER_NAME} ${SERVER_VERSION} serving MCP on stdio`);

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    log("info", `Received ${signal}, shutting down`);
    void (async () => {
      try {
        await stdio.close();
      } catch {
        // Already closed.
      }
      await bridge.stop();
      process.exit(0);
    })();
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });
}

await main().catch((error: unknown) => {
  process.stderr.write(
    `[${SERVER_NAME}] fatal: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
