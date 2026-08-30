/**
 * Turning unknown thrown values into something usable.
 *
 * `catch` binds `unknown`, and the reflex is `String(error)` — which renders a
 * plain object as `[object Object]` and loses the message entirely. These
 * helpers exist so that never reaches a log line or a protocol response.
 */

/** Extracts a human-readable message from any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null) {
    // Node's system errors and many library errors are plain objects carrying a
    // `message`, so this is the common case rather than an exotic one.
    const candidate = error as { message?: unknown; code?: unknown };
    if (typeof candidate.message === "string") return candidate.message;
    if (typeof candidate.code === "string") return candidate.code;

    try {
      return JSON.stringify(error);
    } catch {
      return "[unserialisable error]";
    }
  }

  return String(error);
}

/** Normalises any thrown value into a real `Error`, preserving the original. */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(errorMessage(error), { cause: error });
}

/**
 * Whether a thrown value is a Node system error carrying `code`.
 *
 * Lets callers distinguish "the file is not there" from "the disk is full",
 * which matters when the correct response to one is to carry on and the other is
 * to stop.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === code
  );
}
