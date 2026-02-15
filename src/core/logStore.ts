import type { LogEntry } from "./types";

export class LogStore {
  private entries: LogEntry[] = [];
  private droppedCount = 0;
  private producers = new Set<string>();

  public constructor(private readonly maxLines: number) {}

  public append(batch: LogEntry[]): { accepted: LogEntry[]; droppedCount: number } {
    if (batch.length === 0) {
      return { accepted: [], droppedCount: this.droppedCount };
    }

    for (const entry of batch) {
      this.entries.push(entry);
      this.producers.add(entry.producer);
    }

    const overflow = this.entries.length - this.maxLines;
    if (overflow > 0) {
      this.entries.splice(0, overflow);
      this.droppedCount += overflow;
    }

    return { accepted: batch, droppedCount: this.droppedCount };
  }

  public clear(): void {
    this.entries = [];
    this.producers = new Set<string>();
    this.droppedCount = 0;
  }

  public snapshot(): {
    entries: LogEntry[];
    droppedCount: number;
    knownProducers: string[];
  } {
    return {
      entries: [...this.entries],
      droppedCount: this.droppedCount,
      knownProducers: [...this.producers].sort()
    };
  }
}
