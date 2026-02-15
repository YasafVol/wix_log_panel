import React from "react";
import { FixedSizeList as List } from "react-window";
import { ControlsBar } from "./components/ControlsBar";
import { LogVirtualList } from "./components/LogVirtualList";
import { buildMatchIndices, filterEntries, getNextMatchCursor } from "./filtering";
import type { TimeDisplayMode } from "./timeFormat";
import type {
  EmptyStateKind,
  HostToWebview,
  LogEntry,
  LogLevel,
  UiSnapshot
} from "./types";
import { vscodeApi } from "./vscodeApi";

const ALL_LEVELS: LogLevel[] = ["error", "warn", "info", "debug", "unknown"];

export function App(): JSX.Element {
  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [knownProducers, setKnownProducers] = React.useState<string[]>([]);
  const [droppedCount, setDroppedCount] = React.useState(0);
  const [emptyState, setEmptyState] = React.useState<EmptyStateKind | undefined>(
    undefined
  );
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(
    undefined
  );
  const [paused, setPaused] = React.useState(false);
  const [followTail, setFollowTail] = React.useState(true);
  const [selectedProducers, setSelectedProducers] = React.useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = React.useState<LogLevel[]>(ALL_LEVELS);
  const [query, setQuery] = React.useState("");
  const [activeMatchCursor, setActiveMatchCursor] = React.useState(-1);
  const [timeDisplayMode, setTimeDisplayMode] =
    React.useState<TimeDisplayMode>("iso");
  const [size, setSize] = React.useState({ width: 1, height: 1 });
  const producerFilterDirtyRef = React.useRef(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const listRef = React.useRef<List>(null);
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  const filteredEntries = React.useMemo(
    () => filterEntries(entries, selectedProducers, selectedLevels),
    [entries, selectedProducers, selectedLevels]
  );
  const matchIndices = React.useMemo(
    () => buildMatchIndices(filteredEntries, query),
    [filteredEntries, query]
  );
  const activeMatchRow =
    activeMatchCursor >= 0 && activeMatchCursor < matchIndices.length
      ? matchIndices[activeMatchCursor]
      : -1;

  React.useEffect(() => {
    const listener = (event: MessageEvent<HostToWebview>) => {
      const message = event.data;
      if (!message?.type) {
        return;
      }

      if (message.type === "init") {
        applySnapshot(message.payload);
        return;
      }

      if (message.type === "append") {
        setEntries((previous) => [...previous, ...message.payload.entries]);
        setDroppedCount(message.payload.droppedCount);
        applyKnownProducers(message.payload.knownProducers);
        setEmptyState(undefined);
        return;
      }

      if (message.type === "state") {
        setPaused(message.payload.view.paused);
        setFollowTail(message.payload.view.followTail);
        return;
      }

      if (message.type === "emptyState") {
        setEmptyState(message.payload.kind);
        return;
      }

      if (message.type === "error") {
        setErrorMessage(message.payload.message);
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!query.trim()) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const cursor = getNextMatchCursor(matchIndices, activeMatchCursor, "next");
        setActiveMatchCursor(cursor);
        return;
      }
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        const cursor = getNextMatchCursor(matchIndices, activeMatchCursor, "prev");
        setActiveMatchCursor(cursor);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeMatchCursor, matchIndices, query]);

  React.useEffect(() => {
    if (!followTail || filteredEntries.length === 0) {
      return;
    }
    listRef.current?.scrollToItem(filteredEntries.length - 1, "end");
  }, [filteredEntries, followTail]);

  React.useEffect(() => {
    if (matchIndices.length === 0) {
      setActiveMatchCursor(-1);
      return;
    }
    if (activeMatchCursor >= matchIndices.length) {
      setActiveMatchCursor(matchIndices.length - 1);
    }
  }, [activeMatchCursor, matchIndices]);

  React.useEffect(() => {
    if (activeMatchRow < 0) {
      return;
    }
    listRef.current?.scrollToItem(activeMatchRow, "center");
  }, [activeMatchRow]);

  React.useEffect(() => {
    const node = listContainerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entriesList) => {
      const next = entriesList[0];
      if (!next) {
        return;
      }
      setSize({
        width: Math.floor(next.contentRect.width),
        height: Math.floor(next.contentRect.height)
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onFollowTail = (): void => {
    setFollowTail(true);
    vscodeApi.postMessage({ type: "setFollowTail", payload: { followTail: true } });
    if (filteredEntries.length > 0) {
      listRef.current?.scrollToItem(filteredEntries.length - 1, "end");
    }
  };

  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        color: "var(--vscode-editor-foreground)",
        backgroundColor: "var(--vscode-editor-background)"
      }}
    >
      <ControlsBar
        paused={paused}
        followTail={followTail}
        droppedCount={droppedCount}
        producers={knownProducers}
        selectedProducers={selectedProducers}
        selectedLevels={selectedLevels}
        query={query}
        matchCount={matchIndices.length}
        activeMatchLabel={
          matchIndices.length === 0 ? "0/0" : `${Math.max(activeMatchCursor + 1, 1)}/${matchIndices.length}`
        }
        onTogglePause={() => vscodeApi.postMessage({ type: "togglePause" })}
        onToggleTimeDisplayMode={() =>
          setTimeDisplayMode((previous) => (previous === "iso" ? "short" : "iso"))
        }
        timeDisplayMode={timeDisplayMode}
        onClear={() => {
          setQuery("");
          setActiveMatchCursor(-1);
          vscodeApi.postMessage({ type: "clearView" });
        }}
        onFollowTail={onFollowTail}
        onReload={() => vscodeApi.postMessage({ type: "reload" })}
        onProducerFilterChange={(next) => {
          producerFilterDirtyRef.current = true;
          setSelectedProducers(Array.from(new Set(next)).sort());
          vscodeApi.postMessage({ type: "setProducerFilter", payload: { producers: next } });
        }}
        onLevelFilterChange={(next) => {
          setSelectedLevels(next);
          vscodeApi.postMessage({ type: "setLevelFilter", payload: { levels: next } });
        }}
        onQueryChange={(next) => {
          setQuery(next);
          setActiveMatchCursor(-1);
          vscodeApi.postMessage({ type: "setQuery", payload: { query: next } });
        }}
        onSearchNext={() => {
          const cursor = getNextMatchCursor(matchIndices, activeMatchCursor, "next");
          setActiveMatchCursor(cursor);
          setFollowTail(false);
          vscodeApi.postMessage({ type: "searchNext" });
          vscodeApi.postMessage({ type: "setFollowTail", payload: { followTail: false } });
        }}
        onSearchPrev={() => {
          const cursor = getNextMatchCursor(matchIndices, activeMatchCursor, "prev");
          setActiveMatchCursor(cursor);
          setFollowTail(false);
          vscodeApi.postMessage({ type: "searchPrev" });
          vscodeApi.postMessage({ type: "setFollowTail", payload: { followTail: false } });
        }}
        onSelectAllProducers={() => {
          producerFilterDirtyRef.current = true;
          setSelectedProducers(knownProducers);
          vscodeApi.postMessage({
            type: "setProducerFilter",
            payload: { producers: knownProducers }
          });
        }}
        onClearProducers={() => {
          producerFilterDirtyRef.current = true;
          setSelectedProducers([]);
          vscodeApi.postMessage({ type: "setProducerFilter", payload: { producers: [] } });
        }}
        onSelectAllLevels={() => {
          setSelectedLevels(ALL_LEVELS);
          vscodeApi.postMessage({ type: "setLevelFilter", payload: { levels: ALL_LEVELS } });
        }}
        onClearLevels={() => {
          setSelectedLevels([]);
          vscodeApi.postMessage({ type: "setLevelFilter", payload: { levels: [] } });
        }}
        onErrorsOnly={() => {
          setSelectedLevels(["error"]);
          vscodeApi.postMessage({
            type: "setLevelFilter",
            payload: { levels: ["error"] }
          });
        }}
        onCopyVisible={() =>
          vscodeApi.postMessage({
            type: "copyVisibleLogs",
            payload: { content: filteredEntries.map((entry) => entry.raw).join("\n") }
          })
        }
        onExportVisible={() =>
          vscodeApi.postMessage({
            type: "exportVisibleLogs",
            payload: { content: filteredEntries.map((entry) => entry.raw).join("\n") }
          })
        }
        searchInputRef={searchInputRef}
      />
      {errorMessage && (
        <div style={{ padding: "8px 12px", color: "var(--vscode-errorForeground)" }}>
          {errorMessage}
        </div>
      )}
      {emptyState && filteredEntries.length === 0 ? (
        <EmptyState kind={emptyState} />
      ) : (
        <div ref={listContainerRef} style={{ flex: 1, minHeight: 0 }}>
          <LogVirtualList
            entries={filteredEntries}
            query={query}
            activeMatchRow={activeMatchRow}
            timeDisplayMode={timeDisplayMode}
            onCopyLine={(content) =>
              vscodeApi.postMessage({ type: "copyLogLine", payload: { content } })
            }
            onSendToChat={(content) =>
              vscodeApi.postMessage({ type: "sendLogLineToChat", payload: { content } })
            }
            listRef={listRef}
            height={size.height}
            width={size.width}
            onNearBottomChange={(nearBottom) => {
              if (!nearBottom && followTail) {
                setFollowTail(false);
                vscodeApi.postMessage({
                  type: "setFollowTail",
                  payload: { followTail: false }
                });
              }
            }}
          />
        </div>
      )}
    </main>
  );

  function applySnapshot(snapshot: UiSnapshot): void {
    setEntries(snapshot.entries);
    setDroppedCount(snapshot.droppedCount);
    setPaused(snapshot.view.paused);
    setFollowTail(snapshot.view.followTail);
    applyKnownProducers(snapshot.knownProducers);
  }

  function applyKnownProducers(nextProducers: string[]): void {
    setKnownProducers(nextProducers);
    setSelectedProducers((previous) => {
      if (!producerFilterDirtyRef.current) {
        return nextProducers;
      }
      const previousSet = new Set(previous);
      return nextProducers.filter((producer) => previousSet.has(producer));
    });
  }
}

function EmptyState({ kind }: { kind: EmptyStateKind }): JSX.Element {
  let text = "Waiting for logs...";
  if (kind === "noWorkspace") {
    text = "No workspace opened. Open a Wix project to view debug logs.";
  } else if (kind === "noWix") {
    text =
      "No Wix project detected. This panel listens in `.wix/debug-logs/` at the workspace root.";
  } else if (kind === "waitingLogsDir") {
    text = "Waiting for logs in `.wix/debug-logs/`...";
  } else if (kind === "noFiles") {
    text = "No log files yet. Run Wix CLI or dev tools and logs will appear here.";
  }

  return (
    <section
      style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        padding: "24px",
        textAlign: "center",
        opacity: 0.85
      }}
    >
      <p>{text}</p>
    </section>
  );
}
