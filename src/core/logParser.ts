import * as path from "node:path";
import type { LogEntry, LogLevel } from "./types";

const STANDARD_LINE_RE =
  /^\[(?<ts>[^\]]+)\]\s+(?:\[(?<lineProducer>[^\]]+)\]\s+)?\[(?<level>[^\]]+)\]\s*(?<message>.*)$/;

export class LogParser {
  private ingestSeq = 0;

  public parseLine(rawLine: string, sourceFile: string): LogEntry {
    const raw = rawLine.replace(/\r$/, "");
    const trimmed = raw.trim();
    const inferredProducer = inferProducerFromSourceFile(sourceFile);
    const base = this.createUnknown(trimmed, sourceFile, inferredProducer);
    const match = STANDARD_LINE_RE.exec(trimmed);
    if (!match?.groups) {
      return base;
    }

    const tsRaw = match.groups.ts;
    const level = normalizeLevel(match.groups.level);
    const message = match.groups.message ?? "";
    const timestamp = Date.parse(tsRaw);

    return {
      ...base,
      tsRaw,
      timestamp: Number.isNaN(timestamp) ? undefined : timestamp,
      level,
      message
    };
  }

  private createUnknown(
    raw: string,
    sourceFile: string,
    inferredProducer: string
  ): LogEntry {
    this.ingestSeq += 1;
    return {
      id: `log-${this.ingestSeq}`,
      producer: inferredProducer,
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

function inferProducerFromSourceFile(sourceFile: string): string {
  const fileName = path.basename(sourceFile).toLowerCase();
  const match = /^(?<producer>[a-z0-9_-]+)-debug\.log$/.exec(fileName);
  if (!match?.groups?.producer) {
    return "unknown";
  }
  return normalizeToken(match.groups.producer, "unknown");
}
