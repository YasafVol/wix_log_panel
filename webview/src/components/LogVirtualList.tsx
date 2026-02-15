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
  query: string;
  activeMatchRow: number;
  timeDisplayMode: TimeDisplayMode;
  onCopyLine: (content: string) => void;
  onSendToChat: (content: string) => void;
  onNearBottomChange: (nearBottom: boolean) => void;
  listRef: React.RefObject<List>;
}

export function LogVirtualList(props: LogVirtualListProps): JSX.Element {
  const {
    entries,
    height,
    width,
    query,
    activeMatchRow,
    timeDisplayMode,
    onCopyLine,
    onSendToChat,
    onNearBottomChange,
    listRef
  } = props;
  const [hoveredRow, setHoveredRow] = React.useState<number | null>(null);

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
        query: query.toLowerCase(),
        activeMatchRow,
        timeDisplayMode,
        hoveredRow,
        setHoveredRow,
        onCopyLine,
        onSendToChat
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
    query: string;
    activeMatchRow: number;
    timeDisplayMode: TimeDisplayMode;
    hoveredRow: number | null;
    setHoveredRow: (value: number | null) => void;
    onCopyLine: (content: string) => void;
    onSendToChat: (content: string) => void;
  };
}): JSX.Element {
  const entry = data.entries[index];
  const isActiveMatchRow = data.activeMatchRow === index;
  const isHovered = data.hoveredRow === index;
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
        paddingRight: 150,
        boxSizing: "border-box",
        fontFamily: "var(--vscode-editor-font-family)",
        fontSize: "12px",
        whiteSpace: "pre",
        overflow: "hidden",
        backgroundColor: isActiveMatchRow
          ? "color-mix(in srgb, var(--vscode-textLink-foreground) 15%, transparent)"
          : "transparent",
        ...levelStyle.line
      }}
      onMouseEnter={() => data.setHoveredRow(index)}
      onMouseLeave={() => data.setHoveredRow(null)}
      title={entry.raw}
    >
      <span style={{ opacity: 0.65 }}>[{timestamp}] </span>
      <span style={{ color: producerColor }}>[{entry.producer}] </span>
      <span style={levelStyle.tag}>[{levelText}] </span>{" "}
      <span>{renderMessageWithHighlight(entry.message, data.query)}</span>
      <span
        style={{
          position: "absolute",
          right: 8,
          top: 1,
          display: "inline-flex",
          gap: 4,
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? "auto" : "none"
        }}
      >
        <button
          style={{ height: 20, padding: "0 8px", fontSize: 11 }}
          onClick={() => data.onCopyLine(entry.raw)}
        >
          Copy
        </button>
        <button
          style={{ height: 20, padding: "0 8px", fontSize: 11 }}
          onClick={() => data.onSendToChat(entry.raw)}
        >
          Send to chat
        </button>
      </span>
    </div>
  );
}

function renderMessageWithHighlight(message: string, queryLower: string): React.ReactNode {
  if (!queryLower) {
    return message;
  }

  const lowerMessage = message.toLowerCase();
  if (!lowerMessage.includes(queryLower)) {
    return message;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  while (cursor < message.length) {
    const nextMatch = lowerMessage.indexOf(queryLower, cursor);
    if (nextMatch < 0) {
      nodes.push(message.slice(cursor));
      break;
    }
    if (nextMatch > cursor) {
      nodes.push(message.slice(cursor, nextMatch));
    }
    const end = nextMatch + queryLower.length;
    nodes.push(
      <mark
        key={`${nextMatch}-${end}`}
        style={{
          background: "var(--vscode-editor-findMatchBackground)",
          color: "inherit"
        }}
      >
        {message.slice(nextMatch, end)}
      </mark>
    );
    cursor = end;
  }
  return <>{nodes}</>;
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
