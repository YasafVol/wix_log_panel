# Manual Testing Guide

This guide validates the `Wix Debug Logs` extension behavior against the PRD.

## 1) Setup

1. Open this repo in VS Code.
2. Launch Extension Development Host (`F5`).
3. In the test workspace, ensure `.wix/debug-logs` exists (or let the script create it).

## 2) Generate Test Logs

Use the included generator:

```bash
node debug_log_spam_generator.mjs --files 10 --lps 200 --duration 60
```

Useful variants:

```bash
# Lower throughput smoke test
node debug_log_spam_generator.mjs --files 3 --lps 30 --duration 20

# Custom target directory
node debug_log_spam_generator.mjs --dir .wix/debug-logs --files 10 --lps 200 --duration 60

# Increase malformed lines to test parser fallback
node debug_log_spam_generator.mjs --malformed-rate 0.15 --duration 30
```

## 3) Functional Checks

- Open panel via command: `Wix: Open Debug Logs Panel`.
- Verify lines appear in near real-time.
- Verify parsing and display format:
  - `[timestamp] [producer] [level] message`
  - malformed lines still render with unknown producer/level handling.
- Verify producer and level filters:
  - multi-select behavior
  - already-buffered and new lines update correctly.
- Verify search:
  - case-insensitive substring
  - match highlighting
  - next/prev navigation.
- Verify controls:
  - Pause/Resume
  - Clear View (does not delete files)
  - Reload
  - Follow Tail.

## 4) Reliability Checks

- Start with no `.wix/debug-logs` folder and confirm waiting/empty state.
- Create folder/files while panel is open and verify auto-attach.
- Delete a tailed file and confirm updates stop without crashing.
- Truncate a file (e.g. `: > .wix/debug-logs/source-1.log`) and ensure tailing recovers.
- Reload VS Code window and verify extension re-attaches cleanly.

## 5) Performance Checks

- Run at `--files 10 --lps 200 --duration 60`.
- Confirm:
  - no visible UI jank/freezes
  - scrolling remains smooth
  - controls remain responsive
  - memory is bounded once max line cap is reached (oldest lines dropped).

## 6) Pass Criteria (MVP)

- New lines appear within ~500ms under normal load.
- No crashes on file create/delete/truncate scenarios.
- Filters/search/actions are usable at ~10k lines.
