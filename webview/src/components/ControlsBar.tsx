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
  onTogglePause: () => void;
  onClear: () => void;
  onFollowTail: () => void;
  onReload: () => void;
  onProducerFilterChange: (value: string[]) => void;
  onLevelFilterChange: (value: LogLevel[]) => void;
  onSelectAllProducers: () => void;
  onClearProducers: () => void;
  onSelectAllLevels: () => void;
  onClearLevels: () => void;
  onErrorsOnly: () => void;
  onCopyVisible: () => void;
  onExportVisible: () => void;
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
    onTogglePause,
    onClear,
    onFollowTail,
    onReload,
    onProducerFilterChange,
    onLevelFilterChange,
    onSelectAllProducers,
    onClearProducers,
    onSelectAllLevels,
    onClearLevels,
    onErrorsOnly,
    onCopyVisible,
    onExportVisible,
    timeDisplayMode,
    onToggleTimeDisplayMode
  } = props;

  const actionButtonBase: React.CSSProperties = {
    height: 24,
    padding: "0 10px",
    borderRadius: 4,
    border: "1px solid var(--vscode-button-border, transparent)",
    fontSize: 12,
    cursor: "pointer"
  };

  const primaryButton: React.CSSProperties = {
    ...actionButtonBase,
    background: "var(--vscode-button-background)",
    color: "var(--vscode-button-foreground)"
  };

  const secondaryButton: React.CSSProperties = {
    ...actionButtonBase,
    background: "var(--vscode-button-secondaryBackground, var(--vscode-button-background))",
    color: "var(--vscode-button-secondaryForeground, var(--vscode-button-foreground))"
  };

  const subtleButton: React.CSSProperties = {
    ...actionButtonBase,
    background: "var(--vscode-editorWidget-background)",
    color: "var(--vscode-editor-foreground)",
    border: "1px solid var(--vscode-panel-border)"
  };

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid var(--vscode-panel-border)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, minWidth: 110 }}>WIX LOGS</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
          {droppedCount > 0 && (
            <span style={{ opacity: 0.75, marginRight: 8 }}>Dropped: {droppedCount}</span>
          )}
          <button style={subtleButton} onClick={onCopyVisible}>
            Copy Visible
          </button>
          <button style={subtleButton} onClick={onExportVisible}>
            Export
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            style={{ ...secondaryButton, width: 98, justifyContent: "center" }}
            onClick={onToggleTimeDisplayMode}
          >
            Time: {timeDisplayMode === "iso" ? "ISO" : "Short"}
          </button>

          <details style={{ position: "relative" }}>
            <summary
              style={{
                ...subtleButton,
                width: 180,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                listStyle: "none"
              }}
            >
              <span>Producer ({selectedProducers.length})</span>
              <span style={{ marginLeft: 8 }}>▾</span>
            </summary>
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
                <button style={subtleButton} onClick={onSelectAllProducers}>
                  All
                </button>
                <button style={subtleButton} onClick={onClearProducers}>
                  None
                </button>
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
            <summary
              style={{
                ...subtleButton,
                width: 180,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                listStyle: "none"
              }}
            >
              <span>Log Level ({selectedLevels.length})</span>
              <span style={{ marginLeft: 8 }}>▾</span>
            </summary>
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
                <button style={subtleButton} onClick={onSelectAllLevels}>
                  All
                </button>
                <button style={subtleButton} onClick={onClearLevels}>
                  None
                </button>
                <button style={subtleButton} onClick={onErrorsOnly}>
                  Errors only
                </button>
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

          <button
            style={{ ...secondaryButton, width: 34, padding: 0, fontSize: 14 }}
            onClick={onTogglePause}
            title={paused ? "Resume" : "Pause"}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? "▶" : "⏸"}
          </button>

          <button style={primaryButton} onClick={onFollowTail}>
            Jump to latest
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <button style={primaryButton} onClick={onReload}>
            Reload
          </button>
          <button style={secondaryButton} onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
    </header>
  );
}
