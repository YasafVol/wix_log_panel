import { describe, expect, it } from "vitest";
import { LogParser } from "./logParser";

describe("LogParser", () => {
  it("parses standard wix log lines and infers producer from filename", () => {
    const parser = new LogParser();
    const entry = parser.parseLine(
      "[2025-02-15T10:30:45.123Z] [info] Starting dev server",
      "/tmp/auth-debug.log"
    );

    expect(entry.producer).toBe("auth");
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Starting dev server");
    expect(entry.timestamp).toBeTypeOf("number");
  });

  it("falls back to unknown level for malformed lines and keeps inferred producer", () => {
    const parser = new LogParser();
    const entry = parser.parseLine(
      "this is malformed and must stay visible",
      "/tmp/code_gen-debug.log"
    );

    expect(entry.producer).toBe("code_gen");
    expect(entry.level).toBe("unknown");
    expect(entry.message).toContain("malformed");
  });

  it("uses unknown producer when source filename does not match convention", () => {
    const parser = new LogParser();
    const entry = parser.parseLine(
      "[2025-02-15T10:30:45.123Z] [warn] Legacy file naming",
      "/tmp/random.log"
    );

    expect(entry.producer).toBe("unknown");
    expect(entry.level).toBe("warn");
  });
});
