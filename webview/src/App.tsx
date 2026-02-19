import React from "react";
import { FixedSizeList as List } from "react-window";
import { ControlsBar } from "./components/ControlsBar";
import { LogVirtualList } from "./components/LogVirtualList";
import { filterEntries } from "./filtering";
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
  const [timeDisplayMode, setTimeDisplayMode] =
    React.useState<TimeDisplayMode>("iso");
  const [size, setSize] = React.useState({ width: 1, height: 1 });
  const producerFilterDirtyRef = React.useRef(false);

  const listRef = React.useRef<List>(null);
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  const filteredEntries = React.useMemo(
    () => filterEntries(entries, selectedProducers, selectedLevels),
    [entries, selectedProducers, selectedLevels]
  );

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
    if (!followTail || filteredEntries.length === 0) {
      return;
    }
    listRef.current?.scrollToItem(filteredEntries.length - 1, "end");
  }, [filteredEntries, followTail]);

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
        onTogglePause={() => vscodeApi.postMessage({ type: "togglePause" })}
        onToggleTimeDisplayMode={() =>
          setTimeDisplayMode((previous) => (previous === "iso" ? "short" : "iso"))
        }
        timeDisplayMode={timeDisplayMode}
        onClear={() => vscodeApi.postMessage({ type: "clearView" })}
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
            timeDisplayMode={timeDisplayMode}
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
