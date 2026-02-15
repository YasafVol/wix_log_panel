export type LogLevel = "error" | "warn" | "info" | "debug" | "unknown";

export type EmptyStateKind =
  | "noWorkspace"
  | "noWix"
  | "waitingLogsDir"
  | "noFiles";

export interface LogEntry {
  id: string;
  tsRaw?: string;
  timestamp?: number;
  producer: string;
  level: LogLevel;
  message: string;
  raw: string;
  rawLower: string;
  sourceFile: string;
  ingestSeq: number;
}

export interface UiSnapshot {
  entries: LogEntry[];
  droppedCount: number;
  knownProducers: string[];
}

export type HostToWebview =
  | { type: "init"; payload: UiSnapshot }
  | { type: "append"; payload: { entries: LogEntry[]; droppedCount: number } }
  | { type: "emptyState"; payload: { kind: EmptyStateKind } }
  | { type: "error"; payload: { message: string } };

export type WebviewToHost = { type: "reload" };
