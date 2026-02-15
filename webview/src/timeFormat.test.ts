import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./timeFormat";
import type { LogEntry } from "./types";

function makeEntry(partial: Partial<LogEntry>): LogEntry {
  return {
    id: "1",
    producer: "cli",
    level: "info",
    message: "message",
    raw: "raw",
    rawLower: "raw",
    sourceFile: "debug.log",
    ingestSeq: 1,
    ...partial
  };
}

describe("formatTimestamp", () => {
  it("uses tsRaw in iso mode when available", () => {
    const entry = makeEntry({ tsRaw: "2026-02-15T10:01:02.003Z" });
    expect(formatTimestamp(entry, "iso")).toBe("2026-02-15T10:01:02.003Z");
  });

  it("formats short mode as HH:MM:SS.mmm", () => {
    const entry = makeEntry({ timestamp: Date.parse("2026-02-15T10:01:02.003Z") });
    expect(formatTimestamp(entry, "short")).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  it("falls back safely when timestamp is missing", () => {
    const entry = makeEntry({});
    expect(formatTimestamp(entry, "short")).toBe("-");
  });
});
