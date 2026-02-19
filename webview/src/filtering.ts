import type { LogEntry, LogLevel } from "./types";

export function filterEntries(
  entries: LogEntry[],
  selectedProducers: string[],
  selectedLevels: LogLevel[]
): LogEntry[] {
  const producerSet = new Set(selectedProducers);
  const levelSet = new Set(selectedLevels);
  const filtered = entries.filter(
    (entry) => producerSet.has(entry.producer) && levelSet.has(entry.level)
  );
  return filtered.sort(compareEntriesByTime);
}

function compareEntriesByTime(left: LogEntry, right: LogEntry): number {
  const leftTs = typeof left.timestamp === "number" ? left.timestamp : Number.MAX_SAFE_INTEGER;
  const rightTs =
    typeof right.timestamp === "number" ? right.timestamp : Number.MAX_SAFE_INTEGER;
  if (leftTs !== rightTs) {
    return leftTs - rightTs;
  }
  return left.ingestSeq - right.ingestSeq;
}
