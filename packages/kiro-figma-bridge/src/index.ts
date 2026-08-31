/**
 * Public surface of the bridge server half.
 *
 * Re-exports only, and deliberately side-effect free: importing this must not
 * bind a port or write to stdio. `src/server/bin.ts` is the thing that starts a
 * server, and it is reached through the `kiro-figma-bridge` binary.
 *
 * The Figma plugin half is not exported. It is not importable JavaScript — it is
 * bundled by `build.mjs` into `dist/figma-plugin/` for Figma to load directly.
 */

export { BridgeServer } from "./server/bridge-server.js";
export type {
  BridgeServerOptions,
  LogLevel,
  Logger,
  PluginSession,
  RecordedEvent,
} from "./server/bridge-server.js";

export { fetchFigmaIdentity } from "./server/figma-identity.js";
export type { FigmaIdentity, IdentityResult } from "./server/figma-identity.js";

export { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./server/mcp.js";

export {
  derivePairCode,
  formatPairCode,
  resolvePairing,
} from "./server/pair-code.js";
export type {
  PairingConfig,
  PairingEnv,
  PairingSource,
} from "./server/pair-code.js";

export {
  authChallenge,
  authProof,
  BRIDGE_PORTS,
  normalizePairCode,
  PROTOCOL_VERSION,
} from "./shared/protocol.js";
export type {
  BridgeCommand,
  BridgeHealth,
  DocumentIdentity,
  FigmaUserRef,
  OwnerIdentity,
  PluginEvent,
  SelectionInfo,
  UserMatch,
} from "./shared/protocol.js";
