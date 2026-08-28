import type { DiagnosticEntry, DiagnosticLevel } from "./types.js";

const LEVEL_RANK: Record<DiagnosticLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface DiagnosticsOptions {
  /** Entries retained before the oldest is dropped. Defaults to 200. */
  readonly capacity?: number;
  /** Entries below this level are discarded on write. Defaults to `"debug"`. */
  readonly minLevel?: DiagnosticLevel;
}

/**
 * A bounded, subscribable log buffer.
 *
 * Bridge plugins have no console a user will actually look at — the Figma
 * sandbox logs to a devtools window most people never open. Errors have to be
 * surfaced in the plugin's own UI, which means keeping them in memory and
 * letting the view subscribe.
 *
 * Bounded on purpose: a plugin can stay open for days, and a reconnect loop
 * against a closed port would otherwise grow without limit.
 */
export class Diagnostics {
  private readonly capacity: number;
  private readonly minRank: number;
  private entries: DiagnosticEntry[] = [];
  private nextId = 1;
  private readonly listeners = new Set<
    (entries: readonly DiagnosticEntry[]) => void
  >();

  constructor(options: DiagnosticsOptions = {}) {
    this.capacity = Math.max(1, options.capacity ?? 200);
    this.minRank = LEVEL_RANK[options.minLevel ?? "debug"];
  }

  /** Appends an entry, dropping the oldest once at capacity. */
  record(
    level: DiagnosticLevel,
    scope: string,
    message: string,
    detail?: unknown,
  ): void {
    if (LEVEL_RANK[level] < this.minRank) return;

    const entry: DiagnosticEntry = {
      id: this.nextId++,
      timestamp: Date.now(),
      level,
      scope,
      message,
      ...(detail === undefined ? {} : { detail: safeDetail(detail) }),
    };

    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries = this.entries.slice(this.entries.length - this.capacity);
    }

    this.emit();
  }

  debug(scope: string, message: string, detail?: unknown): void {
    this.record("debug", scope, message, detail);
  }

  info(scope: string, message: string, detail?: unknown): void {
    this.record("info", scope, message, detail);
  }

  warn(scope: string, message: string, detail?: unknown): void {
    this.record("warn", scope, message, detail);
  }

  error(scope: string, message: string, detail?: unknown): void {
    this.record("error", scope, message, detail);
  }

  /** All retained entries, oldest first. */
  all(): readonly DiagnosticEntry[] {
    return this.entries;
  }

  /** Entries at or above `level`, oldest first. */
  atLeast(level: DiagnosticLevel): readonly DiagnosticEntry[] {
    const rank = LEVEL_RANK[level];
    return this.entries.filter((entry) => LEVEL_RANK[entry.level] >= rank);
  }

  /** Count of entries at `level`. */
  countAt(level: DiagnosticLevel): number {
    return this.entries.reduce(
      (total, entry) => (entry.level === level ? total + 1 : total),
      0,
    );
  }

  clear(): void {
    this.entries = [];
    this.emit();
  }

  /** Subscribes to buffer changes. Returns an unsubscribe function. */
  subscribe(
    listener: (entries: readonly DiagnosticEntry[]) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      // A throwing view must not take down the transport that logged the entry.
      try {
        listener(this.entries);
      } catch {
        // Deliberately swallowed: recording a failure here would recurse.
      }
    }
  }
}

/**
 * Reduces a detail payload to something safe to hold and post across a
 * `postMessage` boundary.
 *
 * Figma's bridge serialises structurally, so a payload carrying an `Error`, a
 * cyclic object, or a live node reference throws on send. Failing here is worse
 * than losing fidelity, because the message being sent is usually itself an
 * error report.
 */
function safeDetail(detail: unknown): unknown {
  if (detail instanceof Error) {
    return { name: detail.name, message: detail.message };
  }

  try {
    return JSON.parse(JSON.stringify(detail)) as unknown;
  } catch {
    return String(detail);
  }
}

/** Normalises a thrown value into a message string. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
