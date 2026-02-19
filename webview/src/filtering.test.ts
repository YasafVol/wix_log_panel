import { describe, expect, it } from "vitest";
import type { LogEntry } from "./types";
import { filterEntries } from "./filtering";

function entry(
  id: string,
  producer: string,
  level: LogEntry["level"],
  raw: string
): LogEntry {
  return {
    id,
    producer,
    level,
    message: raw,
    raw,
    rawLower: raw.toLowerCase(),
    sourceFile: "debug.log",
    ingestSeq: Number(id)
  };
}

describe("webview filtering utils", () => {
  const entries: LogEntry[] = [
    entry("1", "cli", "info", "Starting dev server"),
    entry("2", "dev-server", "error", "Failed to bind port"),
    entry("3", "auth", "warn", "Token almost expired")
  ];

  it("filters by producer and level selections", () => {
    const result = filterEntries(entries, ["dev-server", "auth"], ["error"]);
    expect(result.map((item) => item.id)).toEqual(["2"]);
  });

  it("returns entries sorted by timestamp after filtering", () => {
    const withTimestamps: LogEntry[] = [
      { ...entry("11", "cli", "info", "later"), timestamp: 3000 },
      { ...entry("12", "cli", "info", "earlier"), timestamp: 1000 },
      { ...entry("13", "cli", "info", "middle"), timestamp: 2000 }
    ];
    const result = filterEntries(withTimestamps, ["cli"], ["info"]);
    expect(result.map((row) => row.raw)).toEqual(["earlier", "middle", "later"]);
  });
});
