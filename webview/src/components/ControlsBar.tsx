import React from "react";

interface ControlsBarProps {
  followTail: boolean;
  droppedCount: number;
  onFollowTail: () => void;
  onReload: () => void;
}

export function ControlsBar(props: ControlsBarProps): JSX.Element {
  const { followTail, droppedCount, onFollowTail, onReload } = props;
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 12px",
        borderBottom: "1px solid var(--vscode-panel-border)"
      }}
    >
      <div style={{ fontWeight: 600 }}>Wix Debug Logs</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={onReload}>Reload</button>
        {!followTail && <button onClick={onFollowTail}>Follow Tail</button>}
        {droppedCount > 0 && (
          <span style={{ opacity: 0.75 }}>Dropped: {droppedCount}</span>
        )}
      </div>
    </header>
  );
}
