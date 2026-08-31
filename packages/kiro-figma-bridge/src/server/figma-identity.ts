/**
 * Resolves which Figma account an access token belongs to.
 *
 * This is the part of the setup that actually ties the bridge to a person. The
 * pairing code proves a plugin holds the right secret; this proves the secret
 * belongs to a specific Figma account, and gives the server an id it can compare
 * against `figma.currentUser.id` reported by the editor.
 *
 * Called once at startup. A failure here is not fatal — the bridge still works,
 * pairing still applies — it only means the server cannot say who it is acting
 * for, so it reports that plainly instead of pretending.
 */

const FIGMA_ME_URL = "https://api.figma.com/v1/me";

/** The account behind an access token. */
export interface FigmaIdentity {
  readonly id: string;
  readonly handle: string;
  /** Known to the server, deliberately never sent to the plugin. */
  readonly email: string | null;
}

export type IdentityResult =
  | { readonly ok: true; readonly identity: FigmaIdentity }
  | { readonly ok: false; readonly reason: string };

/** Shape of the `/v1/me` response this code depends on. */
interface MeResponse {
  readonly id?: unknown;
  readonly handle?: unknown;
  readonly email?: unknown;
}

/**
 * Looks up the token owner.
 *
 * Tries the `X-Figma-Token` header first, which is what personal access tokens
 * use, then falls back to `Authorization: Bearer` on a 401/403, which is what
 * OAuth access tokens use. Trying both rather than inspecting the token's prefix
 * because the prefixes are an implementation detail Figma has changed before, and
 * one extra request on a cold start is cheap.
 *
 * @param token The access token. Never logged, and never returned.
 * @param fetchImpl Injected so tests can drive this without a network call.
 */
export async function fetchFigmaIdentity(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IdentityResult> {
  const attempts: Record<string, string>[] = [
    { "X-Figma-Token": token },
    { Authorization: `Bearer ${token}` },
  ];

  let lastReason = "no attempt was made";

  for (const headers of attempts) {
    let response: Response;
    try {
      response = await fetchImpl(FIGMA_ME_URL, {
        headers: { ...headers, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      // Offline, DNS failure, or timeout. Retrying with a different header would
      // fail identically, so stop here.
      return {
        ok: false,
        reason: `could not reach api.figma.com (${error instanceof Error ? error.message : String(error)})`,
      };
    }

    if (response.status === 401 || response.status === 403) {
      lastReason = `Figma rejected the access token (HTTP ${response.status})`;
      continue;
    }

    if (!response.ok) {
      return { ok: false, reason: `Figma returned HTTP ${response.status}` };
    }

    let body: MeResponse;
    try {
      body = (await response.json()) as MeResponse;
    } catch {
      return { ok: false, reason: "Figma returned a body that was not JSON" };
    }

    const id = typeof body.id === "string" ? body.id : null;
    const handle = typeof body.handle === "string" ? body.handle : null;

    if (id === null || handle === null) {
      return {
        ok: false,
        reason: "Figma's response did not include an account id and handle",
      };
    }

    return {
      ok: true,
      identity: {
        id,
        handle,
        email: typeof body.email === "string" ? body.email : null,
      },
    };
  }

  return { ok: false, reason: lastReason };
}
