import type { TimerHandle } from "./types.js";
import { clearTimer, setTimer } from "./host-timers.js";

/**
 * One awaited request.
 *
 * The payload type is erased to `unknown` rather than carried as a type
 * parameter: the registry is heterogeneous, holding requests with different
 * result types in one map, so there is no single `T` it could be generic over.
 * Each caller re-applies its own type through {@link RequestRegistry.register}.
 */
interface Pending {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
  readonly label: string;
  readonly timer: TimerHandle;
  readonly createdAt: number;
}

export interface RequestRegistryOptions {
  /** Default timeout applied when a call does not specify one. Defaults to 15000ms. */
  readonly defaultTimeoutMs?: number;
  /** Prefix for generated ids, useful when two registries share a channel. */
  readonly idPrefix?: string;
}

/**
 * Correlates outbound requests with their eventual responses.
 *
 * Needed because a bridge plugin's two halves talk over `postMessage`, which is
 * fire-and-forget. Every request that expects an answer needs an id, a promise,
 * and a timeout — without the timeout a dropped reply leaves the caller hanging
 * forever, which in a plugin UI shows up as a button that never stops spinning.
 */
export class RequestRegistry {
  private readonly pending = new Map<string, Pending>();
  private readonly defaultTimeoutMs: number;
  private readonly idPrefix: string;
  private counter = 0;

  constructor(options: RequestRegistryOptions = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 15_000;
    this.idPrefix = options.idPrefix ?? "req";
  }

  /** Generates an id unique within this registry. */
  nextId(): string {
    this.counter += 1;
    return `${this.idPrefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  /** Number of requests awaiting a response. */
  get size(): number {
    return this.pending.size;
  }

  /**
   * Registers a request and returns the promise that its response settles.
   *
   * @param id - correlation id, normally from {@link nextId}.
   * @param label - human-readable name used in the timeout message.
   */
  register<T>(id: string, label: string, timeoutMs?: number): Promise<T> {
    if (this.pending.has(id)) {
      return Promise.reject(
        new Error(`Duplicate request id "${id}" for ${label}`),
      );
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimer(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `${label} timed out after ${timeoutMs ?? this.defaultTimeoutMs}ms`,
          ),
        );
      }, timeoutMs ?? this.defaultTimeoutMs);

      this.pending.set(id, {
        // Widening `(value: T) => void` to `(value: unknown) => void` is not
        // sound in general, and this is the one place the registry takes
        // responsibility for it: `register` is the only writer, and it always
        // stores a resolver whose `T` matches the promise it hands back.
        resolve: resolve as (value: unknown) => void,
        reject,
        label,
        timer,
        createdAt: Date.now(),
      });
    });
  }

  /**
   * Settles a request successfully.
   *
   * @returns `true` when `id` matched a pending request. `false` means the
   *   response was late, duplicated, or unsolicited — the caller decides
   *   whether that is worth reporting.
   */
  resolve(id: string, value: unknown): boolean {
    const entry = this.pending.get(id);
    if (!entry) return false;

    clearTimer(entry.timer);
    this.pending.delete(id);
    entry.resolve(value);
    return true;
  }

  /** Settles a request with a failure. Returns `false` if `id` was unknown. */
  reject(id: string, reason: string | Error): boolean {
    const entry = this.pending.get(id);
    if (!entry) return false;

    clearTimer(entry.timer);
    this.pending.delete(id);
    entry.reject(reason instanceof Error ? reason : new Error(reason));
    return true;
  }

  /**
   * Fails every pending request.
   *
   * Called when the underlying channel dies. Without it, a torn-down connection
   * leaves promises pending until their individual timeouts fire, which reports
   * "timed out" when the real cause was a disconnect.
   */
  rejectAll(reason: string): void {
    const entries = [...this.pending.entries()];
    this.pending.clear();

    for (const [, entry] of entries) {
      clearTimer(entry.timer);
      entry.reject(new Error(`${entry.label}: ${reason}`));
    }
  }
}
