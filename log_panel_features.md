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
- Unified visible stream is sorted by parsed timestamp (with ingest-order fallback).
- Initial attach reads only tail bytes (configurable cap), not whole file.
- Handles truncation by resetting read offset when file size decreases.
- Handles partial lines across chunk boundaries.

## 3) Parsing and Rendering Semantics

- Expected format:
  - `[ISO_TIMESTAMP] [level] message`
  - legacy lines with `[producer]` token are tolerated, but producer token is ignored.
- Parsed fields:
  - timestamp token, level, message, raw line.
  - producer is inferred from source filename convention: `<producer>-debug.log`.
- Malformed line behavior:
  - line is still displayed
  - producer stays inferred from filename when available
  - level is `unknown`.
- Styling:
  - producer colors are auto-assigned from a deterministic hash of producer name (stable per producer, no hardcoded producer mapping)
  - producer color lightness adapts to current VS Code theme class (light/dark/high-contrast)
  - palette is intentionally brightened for better readability in dark themes
  - level emphasis (`error`, `warn`, `info`, `debug`, `unknown`).
- Timestamp display:
  - toolbar toggle switches between full ISO timestamp and short `HH:MM:SS.mmm` display.

## 4) View State and Control Actions

- Follow-tail behavior:
  - auto-scroll when user is at the bottom
  - scrolling up disables follow-tail
  - `Jump to latest` jumps to latest and re-enables auto-scroll.
- Pause/Resume:
  - while paused, host keeps ingesting
  - visible list does not append
  - resume refreshes with current snapshot.
- Clear:
  - clears in-memory view only
  - does not modify log files.
- Reload:
  - clears view and re-runs watcher/tailer attach flow.

## 5) Filters and Controls

- Controls layout:
  - arranged in two rows for readability and predictable wrapping:
    - row 1: title + dropped indicator on left, `Copy Visible` + `Export` on right
    - row 2 left: time mode first, then `Producer`, `Log Level`, pause/resume icon, `Jump to latest`
    - row 2 right: `Reload`, `Clear`.
- Producer filter:
  - checkbox list of discovered producers
  - quick actions: `All`, `None`.
  - opens as a floating popover menu (does not push log list layout).
- Log level filter:
  - checkbox list for `error`, `warn`, `info`, `debug`, `unknown`
  - quick actions: `All`, `None`, `Errors only`.
  - opens as a floating popover menu (does not push log list layout).

## 6) Copy and Export Actions

- Toolbar actions:
  - `Copy Visible` copies current filtered lines to clipboard.
  - `Export` saves current filtered lines to a user-selected file.

## 7) Empty States

- No workspace open.
- No `.wix` directory in workspace root.
- `.wix` exists but `debug-logs` missing.
- `debug-logs` exists but no files discovered.

## 8) Current Automated Coverage

- Parser unit tests.
- Store/ring-buffer unit tests.
- Tailer edge-case tests (tail window, partials, truncation, no trailing newline).
- Webview filtering utility tests.
- Producer color generation tests (deterministic and fallback behavior).

## 9) Sample Data Contract (`plans/debug_log_spam_generator.mjs`)

- Generates one file per producer: `<producer>-debug.log`.
- Default producer set: `cli`, `code_gen`, `auth`.
- Uses per-producer sequential line counters in each file.
- Writes overlapping timestamps across producer files so combined interleaving is visible in the panel.
