import type { LogEntry, LogLevel } from "./types";

export function filterEntries(
  entries: LogEntry[],
  selectedProducers: string[],
  selectedLevels: LogLevel[]
): LogEntry[] {
  const producerSet = new Set(selectedProducers);
  const levelSet = new Set(selectedLevels);
  return entries.filter(
    (entry) => producerSet.has(entry.producer) && levelSet.has(entry.level)
  );
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
