import React from "react";
import { FixedSizeList as List } from "react-window";
import { ControlsBar } from "./components/ControlsBar";
import { LogVirtualList } from "./components/LogVirtualList";
import type { EmptyStateKind, HostToWebview, LogEntry, UiSnapshot } from "./types";
import { vscodeApi } from "./vscodeApi";

export function App(): JSX.Element {
  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [droppedCount, setDroppedCount] = React.useState(0);
  const [emptyState, setEmptyState] = React.useState<EmptyStateKind | undefined>(
    undefined
  );
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(
    undefined
  );
  const [followTail, setFollowTail] = React.useState(true);
  const [size, setSize] = React.useState({ width: 1, height: 1 });

  const listRef = React.useRef<List>(null);
  const listContainerRef = React.useRef<HTMLDivElement>(null);

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
        setEmptyState(undefined);
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
    if (!followTail || entries.length === 0) {
      return;
    }
    listRef.current?.scrollToItem(entries.length - 1, "end");
  }, [entries, followTail]);

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
    if (entries.length > 0) {
      listRef.current?.scrollToItem(entries.length - 1, "end");
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
        followTail={followTail}
        droppedCount={droppedCount}
        onFollowTail={onFollowTail}
        onReload={() => vscodeApi.postMessage({ type: "reload" })}
      />
      {errorMessage && (
        <div style={{ padding: "8px 12px", color: "var(--vscode-errorForeground)" }}>
          {errorMessage}
        </div>
      )}
      {emptyState && entries.length === 0 ? (
        <EmptyState kind={emptyState} />
      ) : (
        <div ref={listContainerRef} style={{ flex: 1, minHeight: 0 }}>
          <LogVirtualList
            entries={entries}
            listRef={listRef}
            height={size.height}
            width={size.width}
            onNearBottomChange={(nearBottom) => {
              if (!nearBottom && followTail) {
                setFollowTail(false);
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
