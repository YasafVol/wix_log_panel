import { describe, expect, it } from "vitest";
import { LogStore } from "./logStore";
import type { LogEntry } from "./types";

function createEntry(index: number): LogEntry {
  return {
    id: `id-${index}`,
    producer: index % 2 === 0 ? "cli" : "dev-server",
    level: "info",
    message: `message-${index}`,
    raw: `raw-${index}`,
    rawLower: `raw-${index}`,
    sourceFile: "debug.log",
    ingestSeq: index
  };
}

describe("LogStore", () => {
  it("keeps only bounded lines and tracks dropped count", () => {
    const store = new LogStore(3);
    store.append([createEntry(1), createEntry(2), createEntry(3), createEntry(4)]);

    const snapshot = store.snapshot();
    expect(snapshot.entries).toHaveLength(3);
    expect(snapshot.entries[0]?.id).toBe("id-2");
    expect(snapshot.droppedCount).toBe(1);
  });

  it("tracks producers from accepted entries", () => {
    const store = new LogStore(10);
    store.append([createEntry(1), createEntry(2)]);
    const snapshot = store.snapshot();

    expect(snapshot.knownProducers).toEqual(["cli", "dev-server"]);
  });
});
