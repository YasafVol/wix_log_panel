import * as path from "node:path";
import type { LogEntry, LogLevel } from "./types";

const STANDARD_LINE_RE =
  /^\[(?<ts>[^\]]+)\]\s+\[(?<producer>[^\]]+)\]\s+\[(?<level>[^\]]+)\]\s*(?<message>.*)$/;

export class LogParser {
  private ingestSeq = 0;

  public parseLine(rawLine: string, sourceFile: string): LogEntry {
    const raw = rawLine.replace(/\r$/, "");
    const trimmed = raw.trim();
    const base = this.createUnknown(trimmed, sourceFile);
    const match = STANDARD_LINE_RE.exec(trimmed);
    if (!match?.groups) {
      return base;
    }

    const tsRaw = match.groups.ts;
    const producer = normalizeToken(match.groups.producer, "unknown");
    const level = normalizeLevel(match.groups.level);
    const message = match.groups.message ?? "";
    const timestamp = Date.parse(tsRaw);

    return {
      ...base,
      tsRaw,
      timestamp: Number.isNaN(timestamp) ? undefined : timestamp,
      producer,
      level,
      message
    };
  }

  private createUnknown(raw: string, sourceFile: string): LogEntry {
    this.ingestSeq += 1;
    return {
      id: `log-${this.ingestSeq}`,
      producer: "unknown",
      level: "unknown",
      message: raw,
      raw,
      rawLower: raw.toLowerCase(),
      sourceFile: path.basename(sourceFile),
      ingestSeq: this.ingestSeq
    };
  }
}

function normalizeLevel(level: string): LogLevel {
  const lower = level.toLowerCase();
  if (
    lower === "error" ||
    lower === "warn" ||
    lower === "info" ||
    lower === "debug"
  ) {
    return lower;
  }
  return "unknown";
}

function normalizeToken(token: string, fallback: string): string {
  const normalized = token.trim();
  return normalized.length > 0 ? normalized : fallback;
}
