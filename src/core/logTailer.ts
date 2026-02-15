import * as fs from "node:fs/promises";
import type { TailFileState } from "./types";

export interface TailReadResult {
  lines: string[];
  fileMissing: boolean;
}

export class LogTailerService {
  private readonly states = new Map<string, TailFileState>();

  public constructor(
    private readonly initialReadBytesPerFile: number,
    private readonly readChunkBytes: number
  ) {}

  public async initialRead(filePath: string): Promise<TailReadResult> {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        return { lines: [], fileMissing: true };
      }

      const initialOffset = Math.max(0, stat.size - this.initialReadBytesPerFile);
      const state: TailFileState = {
        filePath,
        offset: initialOffset,
        lastSize: stat.size,
        leftover: "",
        active: true
      };
      this.states.set(filePath, state);

      const lines = await this.readRangeToLines(state, stat.size, {
        skipLeadingPartial: initialOffset > 0,
        flushTrailingAtEof: true
      });
      return { lines, fileMissing: false };
    } catch {
      this.states.delete(filePath);
      return { lines: [], fileMissing: true };
    }
  }

  public async readUpdates(filePath: string): Promise<TailReadResult> {
    const state = this.states.get(filePath);
    if (!state) {
      return this.initialRead(filePath);
    }

    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        this.states.delete(filePath);
        return { lines: [], fileMissing: true };
      }

      if (stat.size < state.offset) {
        state.offset = 0;
        state.leftover = "";
      }

      state.lastSize = stat.size;
      const lines = await this.readRangeToLines(state, stat.size, {
        skipLeadingPartial: false,
        flushTrailingAtEof: false
      });
      return { lines, fileMissing: false };
    } catch {
      this.states.delete(filePath);
      return { lines: [], fileMissing: true };
    }
  }

  public removeFile(filePath: string): void {
    this.states.delete(filePath);
  }

  public reset(): void {
    this.states.clear();
  }

  private async readRangeToLines(
    state: TailFileState,
    endOffset: number,
    options: { skipLeadingPartial: boolean; flushTrailingAtEof: boolean }
  ): Promise<string[]> {
    if (endOffset <= state.offset) {
      return [];
    }

    const handle = await fs.open(state.filePath, "r");
    const lines: string[] = [];
    let leftover = state.leftover;
    let droppingLeadingPartial = options.skipLeadingPartial;

    try {
      while (state.offset < endOffset) {
        const remaining = endOffset - state.offset;
        const bytesToRead = Math.min(this.readChunkBytes, remaining);
        const buffer = Buffer.allocUnsafe(bytesToRead);
        const { bytesRead } = await handle.read(
          buffer,
          0,
          bytesToRead,
          state.offset
        );
        if (bytesRead <= 0) {
          break;
        }

        state.offset += bytesRead;
        let chunkText = `${leftover}${buffer
          .subarray(0, bytesRead)
          .toString("utf8")}`;

        if (droppingLeadingPartial) {
          const firstBreak = chunkText.indexOf("\n");
          if (firstBreak < 0) {
            leftover = "";
            continue;
          }
          chunkText = chunkText.slice(firstBreak + 1);
          droppingLeadingPartial = false;
        }

        const parts = chunkText.split("\n");
        leftover = parts.pop() ?? "";
        for (const line of parts) {
          lines.push(line);
        }
      }
    } finally {
      await handle.close();
    }

    if (options.flushTrailingAtEof && leftover.length > 0 && lines.length === 0) {
      lines.push(leftover);
      leftover = "";
    }

    state.leftover = leftover;
    return lines;
  }
}
