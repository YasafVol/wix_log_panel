# WIX LOGS - Feature and Behavior Inventory

This file tracks the implemented product features and expected runtime behavior for the WIX LOGS panel.

## 1) Entry Points and Placement

- Command palette entry: `WIX LOGS: Open Panel`.
- Panel host location: VS Code bottom panel area (next to Problems/Output/Terminal).
- View title: `WIX LOGS`.
- Activation triggers:
  - command execution (`wixDebugLogs.openPanel`)
  - opening the view (`onView:wixDebugLogs.view`)
  - workspace contains `.wix`.

## 2) Log Discovery and Streaming

- Watches workspace root `.wix/debug-logs/` for top-level files only.
- Reacts to file create/change/delete events.
- Tails files incrementally using byte offsets.
- Initial attach reads only tail bytes (configurable cap), not whole file.
- Handles truncation by resetting read offset when file size decreases.
- Handles partial lines across chunk boundaries.

## 3) Parsing and Rendering Semantics

- Expected format:
  - `[ISO_TIMESTAMP] [producer] [level] message`
- Parsed fields:
  - timestamp token, producer, level, message, raw line.
- Malformed line behavior:
  - line is still displayed
  - producer is `unknown`
  - level is `unknown`.
- Styling:
  - producer colors are auto-assigned from a deterministic hash of producer name (stable per producer, no hardcoded producer mapping)
  - producer color lightness adapts to current VS Code theme class (light/dark/high-contrast)
  - level emphasis (`error`, `warn`, `info`, `debug`, `unknown`).
- Timestamp display:
  - toolbar toggle switches between full ISO timestamp and short `HH:MM:SS.mmm` display.

## 4) View State and Control Actions

- Follow-tail behavior:
  - auto-scroll when user is at the bottom
  - scrolling up disables follow-tail
  - `Follow Tail` jumps to latest and re-enables auto-scroll.
- Pause/Resume:
  - while paused, host keeps ingesting
  - visible list does not append
  - resume refreshes with current snapshot.
- Clear:
  - clears in-memory view only
  - does not modify log files.
- Reload:
  - clears view and re-runs watcher/tailer attach flow.

## 5) Filters and Search

- Producer filter:
  - checkbox list of discovered producers
  - quick actions: `All`, `None`.
  - opens as a floating popover menu (does not push log list layout).
- Log level filter:
  - checkbox list for `error`, `warn`, `info`, `debug`, `unknown`
  - quick actions: `All`, `None`, `Errors only`.
  - opens as a floating popover menu (does not push log list layout).
- Search:
  - case-insensitive substring on visible lines
  - highlights all matching substrings in message text
  - `Prev`/`Next` navigation with wraparound
  - active match row highlighting
  - keyboard shortcuts:
    - `Cmd/Ctrl+F` focuses search
    - `Enter` next match
    - `Shift+Enter` previous match.

## 6) Copy and Export Actions

- Toolbar actions:
  - `Copy Visible` copies current filtered lines to clipboard.
  - `Export` saves current filtered lines to a user-selected file.
- Per-line actions:
  - `Copy` copies that raw log line.
  - `Send to chat` is a mock action (logs a mock send event + notification).

## 7) Empty States

- No workspace open.
- No `.wix` directory in workspace root.
- `.wix` exists but `debug-logs` missing.
- `debug-logs` exists but no files discovered.

## 8) Current Automated Coverage

- Parser unit tests.
- Store/ring-buffer unit tests.
- Tailer edge-case tests (tail window, partials, truncation, no trailing newline).
- Webview filtering/search utility tests.
- Producer color generation tests (deterministic and fallback behavior).
