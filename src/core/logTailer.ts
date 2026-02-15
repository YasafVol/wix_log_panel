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

      const lines = await this.readRangeToLines(state, stat.size);
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
      const lines = await this.readRangeToLines(state, stat.size);
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
    endOffset: number
  ): Promise<string[]> {
    if (endOffset <= state.offset) {
      return [];
    }

    const handle = await fs.open(state.filePath, "r");
    const lines: string[] = [];

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
        const chunkText = `${state.leftover}${buffer.subarray(0, bytesRead).toString("utf8")}`;
        const parts = chunkText.split("\n");
        state.leftover = parts.pop() ?? "";
        for (const line of parts) {
          lines.push(line);
        }
      }
    } finally {
      await handle.close();
    }

    return lines;
  }
}
