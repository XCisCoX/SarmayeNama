import type { Logger } from 'pino';

/**
 * Tiny interval scheduler with jitter and graceful shutdown.
 * Each job runs on its own timer chain; overlapping runs are prevented by a
 * simple "running" guard (the worker is single-process).
 */
export interface ScheduledJob {
  name: string;
  run: () => Promise<void>;
  intervalMs: () => number;
  /** Run once shortly after startup (default true). */
  runOnStart?: boolean;
}

export class Scheduler {
  private timers = new Map<string, NodeJS.Timeout>();
  private running = new Set<string>();
  private stopped = false;

  constructor(private log: Logger) {}

  /** Register a job and start its timer chain. */
  schedule(job: ScheduledJob): void {
    if (this.timers.has(job.name)) throw new Error(`job already scheduled: ${job.name}`);
    const loop = async () => {
      if (this.stopped) return;
      if (this.running.has(job.name)) {
        this.log.warn({ job: job.name }, 'job still running, skipping tick');
        this.arm(job, loop);
        return;
      }
      this.running.add(job.name);
      const started = Date.now();
      try {
        await job.run();
        this.log.debug({ job: job.name, tookMs: Date.now() - started }, 'job tick done');
      } catch (err) {
        this.log.error({ job: job.name, err: err instanceof Error ? err.message : String(err) }, 'job tick failed');
      } finally {
        this.running.delete(job.name);
      }
      this.arm(job, loop);
    };

    if (job.runOnStart !== false) {
      // run on start (deferred so the process can boot), then arm
      setTimeout(() => {
        void loop();
      }, 1500);
    } else {
      this.arm(job, loop);
    }
  }

  private arm(job: ScheduledJob, loop: () => Promise<void>): void {
    if (this.stopped) return;
    const delay = job.intervalMs();
    const t = setTimeout(() => void loop(), delay);
    // NOTE: intentionally NOT unref'd — the timer chain is what keeps the
    // worker process alive as a daemon. Graceful shutdown clears timers.
    this.timers.set(job.name, t);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }
}

export function jittered(intervalMs: number, factor = 0.1): number {
  return Math.round(intervalMs * (1 + (Math.random() * 2 - 1) * factor));
}
