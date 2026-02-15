import { describe, expect, it } from "vitest";
import { LogParser } from "./logParser";

describe("LogParser", () => {
  it("parses standard wix log lines", () => {
    const parser = new LogParser();
    const entry = parser.parseLine(
      "[2025-02-15T10:30:45.123Z] [cli] [info] Starting dev server",
      "/tmp/debug.log"
    );

    expect(entry.producer).toBe("cli");
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Starting dev server");
    expect(entry.timestamp).toBeTypeOf("number");
  });

  it("falls back to unknown for malformed lines", () => {
    const parser = new LogParser();
    const entry = parser.parseLine(
      "this is malformed and must stay visible",
      "/tmp/debug.log"
    );

    expect(entry.producer).toBe("unknown");
    expect(entry.level).toBe("unknown");
    expect(entry.message).toContain("malformed");
  });
});
