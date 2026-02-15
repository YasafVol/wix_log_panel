import React from "react";
import { FixedSizeList as List, ListOnItemsRenderedProps } from "react-window";
import type { LogEntry } from "../types";

const ROW_HEIGHT = 22;

interface LogVirtualListProps {
  entries: LogEntry[];
  height: number;
  width: number;
  onNearBottomChange: (nearBottom: boolean) => void;
  listRef: React.RefObject<List>;
}

export function LogVirtualList(props: LogVirtualListProps): JSX.Element {
  const { entries, height, width, onNearBottomChange, listRef } = props;

  const onItemsRendered = React.useCallback(
    ({ visibleStopIndex }: ListOnItemsRenderedProps) => {
      const nearBottom = visibleStopIndex >= Math.max(0, entries.length - 3);
      onNearBottomChange(nearBottom);
    },
    [entries.length, onNearBottomChange]
  );

  return (
    <List
      ref={listRef}
      height={Math.max(0, height)}
      itemCount={entries.length}
      itemSize={ROW_HEIGHT}
      width={Math.max(0, width)}
      overscanCount={12}
      onItemsRendered={onItemsRendered}
      itemData={entries}
    >
      {Row}
    </List>
  );
}

function Row({
  index,
  style,
  data
}: {
  index: number;
  style: React.CSSProperties;
  data: LogEntry[];
}): JSX.Element {
  const entry = data[index];
  const producerColor = getProducerColor(entry.producer);
  const levelStyle = getLevelStyle(entry.level);
  const timestamp = entry.tsRaw ?? "-";
  const levelText = entry.level.toUpperCase();

  return (
    <div
      style={{
        ...style,
        padding: "2px 10px",
        boxSizing: "border-box",
        fontFamily: "var(--vscode-editor-font-family)",
        fontSize: "12px",
        whiteSpace: "pre",
        overflow: "hidden",
        textOverflow: "ellipsis",
        ...levelStyle.line
      }}
      title={entry.raw}
    >
      <span style={{ opacity: 0.65 }}>[{timestamp}] </span>
      <span style={{ color: producerColor }}>[{entry.producer}] </span>
      <span style={levelStyle.tag}>[{levelText}] </span>
      <span>{entry.message}</span>
    </div>
  );
}

function getProducerColor(producer: string): string {
  switch (producer) {
    case "cli":
      return "#4F8CFF";
    case "dev-server":
      return "#22C55E";
    case "linter":
      return "#C084FC";
    default:
      return "var(--vscode-descriptionForeground)";
  }
}

function getLevelStyle(level: LogEntry["level"]): {
  tag: React.CSSProperties;
  line: React.CSSProperties;
} {
  switch (level) {
    case "error":
      return {
        tag: { color: "#EF4444", fontWeight: 700 },
        line: { color: "#FECACA" }
      };
    case "warn":
      return {
        tag: { color: "#F59E0B", fontWeight: 600 },
        line: {}
      };
    case "debug":
      return {
        tag: { opacity: 0.75 },
        line: { opacity: 0.8 }
      };
    case "info":
      return {
        tag: { opacity: 0.9 },
        line: {}
      };
    default:
      return {
        tag: { opacity: 0.7 },
        line: {}
      };
  }
}
