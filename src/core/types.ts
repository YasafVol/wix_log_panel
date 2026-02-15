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

export interface TailFileState {
  filePath: string;
  offset: number;
  lastSize: number;
  leftover: string;
  active: boolean;
}

export interface UiSnapshot {
  entries: LogEntry[];
  droppedCount: number;
  knownProducers: string[];
  view: {
    paused: boolean;
    followTail: boolean;
  };
}

export type HostToWebview =
  | { type: "init"; payload: UiSnapshot }
  | {
      type: "append";
      payload: { entries: LogEntry[]; droppedCount: number; knownProducers: string[] };
    }
  | { type: "state"; payload: { view: { paused: boolean; followTail: boolean } } }
  | { type: "emptyState"; payload: { kind: EmptyStateKind } }
  | { type: "error"; payload: { message: string } };

export type WebviewToHost =
  | { type: "setProducerFilter"; payload: { producers: string[] } }
  | { type: "setLevelFilter"; payload: { levels: LogLevel[] } }
  | { type: "setQuery"; payload: { query: string } }
  | { type: "togglePause" }
  | { type: "clearView" }
  | { type: "reload" }
  | { type: "setFollowTail"; payload: { followTail: boolean } }
  | { type: "searchNext" }
  | { type: "searchPrev" }
  | { type: "copyVisibleLogs"; payload: { content: string } }
  | { type: "exportVisibleLogs"; payload: { content: string } }
  | { type: "copyLogLine"; payload: { content: string } }
  | { type: "sendLogLineToChat"; payload: { content: string } };

export interface LogSettings {
  maxLines: number;
  initialReadBytesPerFile: number;
  readChunkBytes: number;
}
