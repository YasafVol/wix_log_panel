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

export function buildMatchIndices(entries: LogEntry[], query: string): number[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  const indices: number[] = [];
  entries.forEach((entry, index) => {
    if (entry.rawLower.includes(trimmed)) {
      indices.push(index);
    }
  });
  return indices;
}

export function getNextMatchCursor(
  matchIndices: number[],
  currentCursor: number,
  direction: "next" | "prev"
): number {
  if (matchIndices.length === 0) {
    return -1;
  }

  if (direction === "next") {
    return (currentCursor + 1 + matchIndices.length) % matchIndices.length;
  }
  return (currentCursor - 1 + matchIndices.length) % matchIndices.length;
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
