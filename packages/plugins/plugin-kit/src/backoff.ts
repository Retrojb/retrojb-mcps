export interface BackoffOptions {
  /** Delay for the first retry. Defaults to 1000ms. */
  readonly initialMs?: number;
  /** Ceiling for any single delay. Defaults to 30000ms. */
  readonly maxMs?: number;
  /** Multiplier applied per consecutive attempt. Defaults to 2. */
  readonly factor?: number;
  /**
   * Fraction of the computed delay to randomise, 0 to 1. Defaults to 0.2.
   *
   * Matters when several connections drop together — a Figma plugin talking to
   * four harness instances would otherwise retry all four in lockstep forever.
   */
  readonly jitter?: number;
  /** Random source, injectable so tests are deterministic. */
  readonly random?: () => number;
}

/**
 * Exponential backoff with jitter.
 *
 * Tracks attempts rather than scheduling them, so the caller keeps control of
 * its own timers and can reset the moment a connection succeeds.
 */
export class Backoff {
  private readonly initialMs: number;
  private readonly maxMs: number;
  private readonly factor: number;
  private readonly jitter: number;
  private readonly random: () => number;
  private attempts = 0;

  constructor(options: BackoffOptions = {}) {
    this.initialMs = Math.max(1, options.initialMs ?? 1000);
    this.maxMs = Math.max(this.initialMs, options.maxMs ?? 30_000);
    this.factor = Math.max(1, options.factor ?? 2);
    this.jitter = Math.min(1, Math.max(0, options.jitter ?? 0.2));
    this.random = options.random ?? Math.random;
  }

  /** Consecutive failures recorded since the last {@link reset}. */
  get attemptCount(): number {
    return this.attempts;
  }

  /** Records an attempt and returns how long to wait before the next one. */
  nextDelay(): number {
    const raw = this.initialMs * Math.pow(this.factor, this.attempts);
    this.attempts += 1;

    const capped = Math.min(this.maxMs, raw);
    if (this.jitter === 0) return Math.round(capped);

    // Symmetric jitter around the capped delay, clamped so it never goes
    // below the initial delay or above the ceiling.
    const spread = capped * this.jitter;
    const offset = (this.random() * 2 - 1) * spread;
    return Math.round(
      Math.min(this.maxMs, Math.max(this.initialMs, capped + offset)),
    );
  }

  /** Peeks at the next delay without recording an attempt. */
  peekDelay(): number {
    const raw = this.initialMs * Math.pow(this.factor, this.attempts);
    return Math.round(Math.min(this.maxMs, raw));
  }

  /** Clears the attempt count. Call on a successful connection. */
  reset(): void {
    this.attempts = 0;
  }
}
