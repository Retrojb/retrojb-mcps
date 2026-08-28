import type { Disposable, TimerHandle } from "./types.js";
import { clearTimer, setTimer } from "./host-timers.js";

export interface PollerOptions {
  /** Delay used while the poller reports itself unsatisfied. */
  readonly idleIntervalMs: number;
  /** Delay used once satisfied — normally longer, to back off. */
  readonly steadyIntervalMs: number;
  /**
   * Whether the current state counts as satisfied. Consulted after each pass to
   * pick the next delay.
   */
  readonly isSatisfied: () => boolean;
  /** The work to run. Overlapping runs are suppressed. */
  readonly run: () => Promise<void>;
  /** Called when `run` rejects, so a failing pass cannot kill the loop. */
  readonly onError?: (error: unknown) => void;
}

/**
 * A self-rescheduling loop with two cadences.
 *
 * Discovery needs to poll fast while nothing is connected — so the plugin
 * attaches promptly when a server appears — and slowly once connected, where it
 * only exists to notice a server that restarted. A fixed interval has to pick
 * one and be wrong the rest of the time.
 *
 * Rescheduling happens after each pass completes rather than on a fixed
 * interval, so a slow pass cannot pile up behind itself.
 */
export class Poller implements Disposable {
  private readonly options: PollerOptions;
  private timer: TimerHandle | null = null;
  private inFlight = false;
  private stopped = true;

  constructor(options: PollerOptions) {
    this.options = options;
  }

  get running(): boolean {
    return !this.stopped;
  }

  /** Starts the loop. `immediate` runs the first pass without waiting. */
  start(immediate = true): void {
    if (!this.stopped) return;
    this.stopped = false;

    if (immediate) void this.tick();
    else this.schedule();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimer(this.timer);
      this.timer = null;
    }
  }

  /**
   * Runs a pass now, resetting the schedule.
   *
   * This is what a "refresh" button in a plugin UI calls: the user should not
   * have to wait out the remaining interval.
   */
  async runNow(): Promise<void> {
    if (this.timer !== null) {
      clearTimer(this.timer);
      this.timer = null;
    }
    await this.tick();
  }

  dispose(): void {
    this.stop();
  }

  private async tick(): Promise<void> {
    if (this.stopped) return;

    if (this.inFlight) {
      this.schedule();
      return;
    }

    this.inFlight = true;
    try {
      await this.options.run();
    } catch (error) {
      this.options.onError?.(error);
    } finally {
      this.inFlight = false;
    }

    this.schedule();
  }

  private schedule(): void {
    if (this.stopped) return;
    if (this.timer !== null) clearTimer(this.timer);

    let satisfied = false;
    try {
      satisfied = this.options.isSatisfied();
    } catch (error) {
      this.options.onError?.(error);
    }

    const delay = satisfied
      ? this.options.steadyIntervalMs
      : this.options.idleIntervalMs;

    this.timer = setTimer(() => {
      this.timer = null;
      void this.tick();
    }, delay);
  }
}
