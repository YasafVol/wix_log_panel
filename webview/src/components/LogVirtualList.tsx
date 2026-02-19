import React from "react";
import { FixedSizeList as List, ListOnItemsRenderedProps } from "react-window";
import { detectThemeMode, getProducerColor } from "../producerColors";
import type { LogEntry } from "../types";
import { formatTimestamp, type TimeDisplayMode } from "../timeFormat";

const ROW_HEIGHT = 22;

interface LogVirtualListProps {
  entries: LogEntry[];
  height: number;
  width: number;
  timeDisplayMode: TimeDisplayMode;
  onNearBottomChange: (nearBottom: boolean) => void;
  listRef: React.RefObject<List>;
}

export function LogVirtualList(props: LogVirtualListProps): JSX.Element {
  const {
    entries,
    height,
    width,
    timeDisplayMode,
    onNearBottomChange,
    listRef
  } = props;

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
      itemData={{
        entries,
        timeDisplayMode
      }}
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
  data: {
    entries: LogEntry[];
    timeDisplayMode: TimeDisplayMode;
  };
}): JSX.Element {
  const entry = data.entries[index];
  const producerColor = getProducerColor(entry.producer, detectThemeMode());
  const levelStyle = getLevelStyle(entry.level);
  const timestamp = formatTimestamp(entry, data.timeDisplayMode);
  const levelText = entry.level.toUpperCase();

  return (
    <div
      style={{
        ...style,
        position: "relative",
        padding: "2px 10px",
        boxSizing: "border-box",
        fontFamily: "var(--vscode-editor-font-family)",
        fontSize: "12px",
        whiteSpace: "pre",
        overflow: "hidden",
        backgroundColor: "transparent",
        ...levelStyle.line
      }}
      title={entry.raw}
    >
      <span style={{ opacity: 0.65 }}>[{timestamp}] </span>
      <span style={{ color: producerColor }}>[{entry.producer}] </span>
      <span style={levelStyle.tag}>[{levelText}] </span>{" "}
      <span>{entry.message}</span>
    </div>
  );
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
