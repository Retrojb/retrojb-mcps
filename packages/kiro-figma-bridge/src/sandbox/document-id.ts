/**
 * A stable identifier for the open file.
 *
 * Figma exposes `figma.fileKey`, which would be the obvious choice, but it is
 * gated behind `enablePrivatePluginApi` and that flag is only honoured for
 * private organisation plugins — a plugin published on Figma Community reads
 * `undefined`. Since this plugin is meant to be installable by anyone, it cannot
 * depend on it.
 *
 * So the plugin mints its own id and stores it in the file's plugin data, which
 * is private to this plugin, travels with the file, and survives reopening. That
 * gives the server a key it can route on and log against without the plugin ever
 * needing a privileged API.
 *
 * Two honest limitations, since the server's routing depends on them:
 *
 * - **Duplicating a file copies its plugin data**, so a duplicate starts life
 *   claiming the same id as its original. The server resolves the collision by
 *   keeping the most recent connection per id rather than trusting uniqueness.
 * - **A read-only file cannot be written to**, so the id cannot be persisted
 *   there. The fallback is a per-session id, reported with
 *   `documentIdPersisted: false` so the server knows it is not stable.
 */

const DOCUMENT_ID_KEY = "kiroFigmaBridge.documentId";

/** Result of resolving the file's identifier. */
export interface DocumentIdResult {
  readonly documentId: string;
  /** Whether the id is stored in the file, and so stable across sessions. */
  readonly persisted: boolean;
}

let cached: DocumentIdResult | null = null;

/**
 * Mints an opaque identifier.
 *
 * `Math.random` rather than a CSPRNG deliberately: the Figma sandbox has no Web
 * Crypto, and this value is a routing key, not a secret. Nothing is authorised
 * by holding it — the pairing proof does that — so its only requirement is not
 * colliding between the handful of files one person has open.
 */
function mintId(): string {
  const random = () => Math.random().toString(36).slice(2, 10);
  return `doc_${Date.now().toString(36)}_${random()}${random()}`;
}

/**
 * Reads the file's identifier, creating and storing one on first use.
 *
 * Cached for the plugin's lifetime because it is read on every reconnect and on
 * every document-info request, and `getPluginData` is a synchronous document
 * read.
 */
export function documentId(): DocumentIdResult {
  if (cached !== null) return cached;

  let existing: string;
  try {
    existing = figma.root.getPluginData(DOCUMENT_ID_KEY);
  } catch {
    // Reading plugin data can throw in restricted editors. Treat it as absent.
    existing = "";
  }

  if (existing !== "") {
    cached = { documentId: existing, persisted: true };
    return cached;
  }

  const minted = mintId();

  try {
    figma.root.setPluginData(DOCUMENT_ID_KEY, minted);
    // Read back rather than assuming: Dev Mode and view-only files accept the
    // call in some Figma versions and discard the write, which would otherwise
    // look persisted and produce a new id on every launch with no explanation.
    const persisted = figma.root.getPluginData(DOCUMENT_ID_KEY) === minted;
    cached = { documentId: minted, persisted };
  } catch {
    cached = { documentId: minted, persisted: false };
  }

  return cached;
}

/** Clears the memoised id. For tests only. */
export function resetDocumentIdForTests(): void {
  cached = null;
}
