import type { LogLevel } from "../types";
import React from "react";
import type { TimeDisplayMode } from "../timeFormat";

interface ControlsBarProps {
  paused: boolean;
  followTail: boolean;
  droppedCount: number;
  producers: string[];
  selectedProducers: string[];
  selectedLevels: LogLevel[];
  query: string;
  matchCount: number;
  activeMatchLabel: string;
  onTogglePause: () => void;
  onClear: () => void;
  onFollowTail: () => void;
  onReload: () => void;
  onProducerFilterChange: (value: string[]) => void;
  onLevelFilterChange: (value: LogLevel[]) => void;
  onQueryChange: (value: string) => void;
  onSearchNext: () => void;
  onSearchPrev: () => void;
  onSelectAllProducers: () => void;
  onClearProducers: () => void;
  onSelectAllLevels: () => void;
  onClearLevels: () => void;
  onErrorsOnly: () => void;
  onCopyVisible: () => void;
  onExportVisible: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  timeDisplayMode: TimeDisplayMode;
  onToggleTimeDisplayMode: () => void;
}

export function ControlsBar(props: ControlsBarProps): JSX.Element {
  const {
    paused,
    followTail,
    droppedCount,
    producers,
    selectedProducers,
    selectedLevels,
    query,
    matchCount,
    activeMatchLabel,
    onTogglePause,
    onClear,
    onFollowTail,
    onReload,
    onProducerFilterChange,
    onLevelFilterChange,
    onQueryChange,
    onSearchNext,
    onSearchPrev,
    onSelectAllProducers,
    onClearProducers,
    onSelectAllLevels,
    onClearLevels,
    onErrorsOnly,
    onCopyVisible,
    onExportVisible,
    searchInputRef,
    timeDisplayMode,
    onToggleTimeDisplayMode
  } = props;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "8px 12px",
        borderBottom: "1px solid var(--vscode-panel-border)"
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 240 }}>
        <div style={{ fontWeight: 600 }}>WIX LOGS</div>
        {droppedCount > 0 && <span style={{ opacity: 0.75 }}>Dropped: {droppedCount}</span>}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <details style={{ position: "relative" }}>
          <summary style={{ cursor: "pointer" }}>Producer ({selectedProducers.length})</summary>
          <div
            style={{
              position: "absolute",
              top: "110%",
              left: 0,
              zIndex: 20,
              minWidth: 180,
              maxHeight: 220,
              overflow: "auto",
              padding: 8,
              border: "1px solid var(--vscode-panel-border)",
              background: "var(--vscode-editor-background)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)"
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <button onClick={onSelectAllProducers}>All</button>
              <button onClick={onClearProducers}>None</button>
            </div>
            {producers.map((producer) => (
              <label key={producer} style={{ display: "block", fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={selectedProducers.includes(producer)}
                  onChange={(event) =>
                    onProducerFilterChange(
                      event.target.checked
                        ? [...selectedProducers, producer]
                        : selectedProducers.filter((value) => value !== producer)
                    )
                  }
                />{" "}
                {producer}
              </label>
            ))}
          </div>
        </details>
        <details style={{ position: "relative" }}>
          <summary style={{ cursor: "pointer" }}>Log Level ({selectedLevels.length})</summary>
          <div
            style={{
              position: "absolute",
              top: "110%",
              left: 0,
              zIndex: 20,
              minWidth: 180,
              maxHeight: 220,
              overflow: "auto",
              padding: 8,
              border: "1px solid var(--vscode-panel-border)",
              background: "var(--vscode-editor-background)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)"
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <button onClick={onSelectAllLevels}>All</button>
              <button onClick={onClearLevels}>None</button>
              <button onClick={onErrorsOnly}>Errors only</button>
            </div>
            {(["error", "warn", "info", "debug", "unknown"] as LogLevel[]).map((level) => (
              <label key={level} style={{ display: "block", fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level)}
                  onChange={(event) =>
                    onLevelFilterChange(
                      event.target.checked
                        ? [...selectedLevels, level]
                        : selectedLevels.filter((value) => value !== level)
                    )
                  }
                />{" "}
                {level}
              </label>
            ))}
          </div>
        </details>
        <input
          ref={searchInputRef}
          value={query}
          placeholder="Search"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <button onClick={onSearchPrev} disabled={matchCount === 0}>
          Prev
        </button>
        <button onClick={onSearchNext} disabled={matchCount === 0}>
          Next
        </button>
        {query && (
          <span style={{ opacity: 0.75, minWidth: 52, textAlign: "right" }}>
            {activeMatchLabel}
          </span>
        )}
        <button onClick={onTogglePause}>{paused ? "Resume" : "Pause"}</button>
        <button onClick={onToggleTimeDisplayMode}>
          Time: {timeDisplayMode === "iso" ? "ISO" : "Short"}
        </button>
        <button onClick={onClear}>Clear</button>
        <button onClick={onCopyVisible}>Copy Visible</button>
        <button onClick={onExportVisible}>Export</button>
        <button onClick={onReload}>Reload</button>
        {!followTail && <button onClick={onFollowTail}>Follow Tail</button>}
      </div>
    </header>
  );
}
