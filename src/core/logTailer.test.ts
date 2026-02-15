import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LogTailerService } from "./logTailer";

const tempRoots: string[] = [];

async function createTempFile(contents: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wix-log-tailer-"));
  tempRoots.push(dir);
  const filePath = path.join(dir, "debug.log");
  await fs.writeFile(filePath, contents, "utf8");
  return filePath;
}

describe("LogTailerService", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map(async (root) => {
        await fs.rm(root, { recursive: true, force: true });
      })
    );
  });

  it("reads only the tail window on initial attach", async () => {
    const filePath = await createTempFile("a\nb\nc\n");
    const tailer = new LogTailerService(4, 1024);

    const result = await tailer.initialRead(filePath);

    expect(result.fileMissing).toBe(false);
    expect(result.lines).toEqual(["c"]);
  });

  it("keeps partial lines until a newline arrives", async () => {
    const filePath = await createTempFile("[t] [cli] [info] hello\npar");
    const tailer = new LogTailerService(1024, 1024);

    const first = await tailer.initialRead(filePath);
    expect(first.lines).toEqual(["[t] [cli] [info] hello"]);

    await fs.appendFile(filePath, "tial\n", "utf8");
    const second = await tailer.readUpdates(filePath);
    expect(second.lines).toEqual(["partial"]);
  });

  it("includes trailing line on initial read even without final newline", async () => {
    const filePath = await createTempFile("[t] [cli] [info] last line");
    const tailer = new LogTailerService(1024, 1024);

    const result = await tailer.initialRead(filePath);

    expect(result.fileMissing).toBe(false);
    expect(result.lines).toEqual(["[t] [cli] [info] last line"]);
  });

  it("recovers cleanly after truncation", async () => {
    const filePath = await createTempFile("one\ntwo\n");
    const tailer = new LogTailerService(1024, 1024);
    await tailer.initialRead(filePath);

    await fs.writeFile(filePath, "fresh\n", "utf8");
    const result = await tailer.readUpdates(filePath);

    expect(result.fileMissing).toBe(false);
    expect(result.lines).toEqual(["fresh"]);
  });
});
