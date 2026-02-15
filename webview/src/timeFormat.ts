import type { LogEntry } from "./types";

export type TimeDisplayMode = "iso" | "short";

export function formatTimestamp(entry: LogEntry, mode: TimeDisplayMode): string {
  if (mode === "iso") {
    if (entry.tsRaw) {
      return entry.tsRaw;
    }
    if (typeof entry.timestamp === "number") {
      return new Date(entry.timestamp).toISOString();
    }
    return "-";
  }

  const timestampMs = resolveTimestampMs(entry);
  if (timestampMs === undefined) {
    return entry.tsRaw ?? "-";
  }
  return formatShortTime(timestampMs);
}

function resolveTimestampMs(entry: LogEntry): number | undefined {
  if (typeof entry.timestamp === "number") {
    return entry.timestamp;
  }
  if (!entry.tsRaw) {
    return undefined;
  }
  const parsed = Date.parse(entry.tsRaw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatShortTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}
