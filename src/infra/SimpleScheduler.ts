import { IScheduler } from "../core/IScheduler";

export class SimpleScheduler implements IScheduler {
  private intervals = new Map<string, NodeJS.Timeout>();

  scheduleRecurring(
    name: string,
    intervalMs: number,
    fn: () => void | Promise<void>
  ): void {
    if (this.intervals.has(name)) {
      this.stop(name);
      console.warn(`[Scheduler] Replacing existing recurring task "${name}"`);
    }

    const wrapped = async () => {
      try {
        await fn();
      } catch (error) {
        console.error(`[Scheduler] Error while running task "${name}"`, error);
      }
    };

    const interval = setInterval(wrapped, intervalMs);
    interval.unref?.();

    this.intervals.set(name, interval);
  }

  stop(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }
}
