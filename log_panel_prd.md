**Product Requirements Document (PRD)**  
**Product:** Wix Debug Logs VS Code Extension  
**Version:** v1 (MVP)  
**Owner:** TBD  

---

## 1. Summary

Build a VS Code extension that provides a terminal-like log panel for Wix projects.  

The extension watches `.wix/debug-logs/` in the workspace, tails all log files written there by Wix tools (e.g. CLI), and streams them into a single panel. Each log line is parsed, color-coded, and filterable by \[producer\] and \[log level\].  

**Standard log format (agreed):**  
`[ISO_TIMESTAMP] [producer] [level] message`  
Example:  
`[2025-02-15T10:30:45.123Z] [cli] [info] Starting dev server on :3000`

---

## 2. Problem & Goals

### 2.1 Problem

Developers using Wix tooling in VS Code need to juggle multiple terminals and log outputs (CLI, dev server, tools). This causes friction when debugging or monitoring flows, especially when correlating events across tools.

### 2.2 Goals

1. Centralize all Wix-related logs (from `.wix/debug-logs/`) into a single VS Code panel.  
2. Stream logs in near real-time (\< 500ms perceived delay).  
3. Make it easy to visually distinguish and filter logs by producer and level.  
4. Keep the experience lightweight and terminal-like, suitable for continuous use while coding.

### 2.3 Non-Goals (v1)

- Editing logs or modifying files.  
- Persisting extra history beyond what’s in the log files.  
- Remote aggregation or sharing of logs.  
- Rich visualizations (charts, timelines) or deep structured-log inspection.

---

## 3. Users & Key Use Cases

### 3.1 Users

- Wix engineers using VS Code with Wix CLI and related tools.
- (Potential) External developers building with Wix dev tooling in VS Code.

### 3.2 Primary Use Cases

1. **Single view of all Wix logs**  
   - User opens the “Wix Debug Logs” panel and sees logs from all producers (e.g. `cli`, `dev-server`) interleaved and time-ordered.

2. **Quick error triage**  
   - User spots red `[error]` entries, filters to `level: error` and `producer: dev-server` to focus on a failing component.

3. **Correlate flows across producers**  
   - CLI operation and dev server responses appear together to understand end-to-end behavior.

4. **Passive monitoring while coding**  
   - Panel is docked; user glances at it after saves/commands to confirm system health.

---

## 4. Functional Requirements

### 4.1 Directory & File Watching

**FR-1**: On workspace open, the extension checks for `.wix/debug-logs/` at the root.  
- If missing: show non-blocking “No logs yet” empty state and keep watching for folder creation.  

**FR-2**: Watch `.wix/debug-logs/` for:  
- New files created → start tailing.  
- File updates → read appended content.  
- File deletions → stop tailing and remove from producer list if applicable.

**FR-3**: v1 scope:  
- Watch only top-level files under `.wix/debug-logs/` (no subdirectories).

**FR-4**: Initial load:  
- Tail from the end, reading up to a configurable “history cap” (default: last N KB or last M lines; exact values TBD).  
- Do not read entire multi-GB files.

**Acceptance criteria:**  
- Creating/writing a log file in `.wix/debug-logs/` results in lines appearing in the panel within 500ms under normal load.  
- Deleting a file stops new entries from that file; no extension errors.

---

### 4.2 Log Parsing & Data Model

**FR-5**: Parse lines using the agreed format:  
`[ISO_TIMESTAMP] [producer] [level] message`  

Parse into:  
- `timestamp` (optional Date; if parsing fails, treat as unknown)  
- `producer: string`  
- `level: "error" | "warn" | "info" | "debug" | "unknown"`  
- `message: string`  
- `raw: string`  

**FR-6**: If parsing fails (e.g. malformed line):  
- Still display the line in the panel.  
- Mark `producer = "unknown"`, `level = "unknown"`.  

**Acceptance criteria:**  
- Correct extraction of producer and level from the sample format.  
- Malformed lines visible and do not break the stream.

---

### 4.3 Panel & Visualization (VS Code)

**FR-7**: Provide a dedicated panel (custom view / webview) named **“Wix Debug Logs”**, accessible via:  
- Command palette entry: `Wix: Open Debug Logs Panel`.  
- Optional: View → “Wix” section in VS Code Activity Bar (TBD by UX).

**FR-8**: Panel must be terminal-like:  
- Monospaced font.  
- Vertical scrolling.  
- Auto-scroll when at bottom (“follow tail”).  
- If user scrolls up, auto-scroll pauses until user clicks “Follow Tail” / similar.

**FR-9**: Color coding by producer:  
- Each known producer gets a consistent color (default mapping, overridable later):  
  - `cli` – blue  
  - `dev-server` – green  
  - `linter` – magenta  
  - `unknown` – grey  

**FR-10**: Styling by log level:  
- `error` – red, bold (line-level emphasis)  
- `warn` – yellow emphasis  
- `info` – default text  
- `debug` – dimmed  
- `unknown` – default/grey  

**FR-11**: Each line visually includes:  
- Timestamp (muted)  
- `[producer]` tag (colored)  
- `[level]` tag (styled by severity)  
- Message text (colored mostly by producer; level styling is additive on tags and may influence line color).

**Acceptance criteria:**  
- Visual distinction between producers and levels is obvious at a glance.  
- Auto-scroll behavior matches typical terminal “tail” expectations.

---

### 4.4 Filtering, Search, and Controls

**FR-12**: Producer filter:  
- UI control (multi-select) listing all discovered producers from current session.  
- Default: all selected.  
- Changes apply to all subsequent and already-buffered log lines in view.

**FR-13**: Level filter:  
- UI control (multi-select) for `error`, `warn`, `info`, `debug`, `unknown`.  
- Default: all selected.  

**FR-14**: Text search:  
- Search input within the panel.  
- Simple case-insensitive substring search over currently buffered lines.  
- Highlight matches and allow navigation (e.g. next/previous match).

**FR-15**: Controls:  
- **Pause/Resume** streaming:  
  - Pause: stop appending new lines to visible list (but keep reading and buffering in memory up to limit OR drop older ones — see NFR).  
  - Resume: show latest state; if many lines accumulated, do not freeze UI.  
- **Clear View**:  
  - Clears in-memory view (and search state), does **not** delete files.  
- **Reload**:  
  - Re-reads from log files according to initial load rules (FR-4).

**Acceptance criteria:**  
- Filters and search operate in under ~150ms on a typical buffer size (e.g. 10k lines).  
- Pause/resume + clear do not affect underlying log files.

---

## 5. Non-Functional Requirements

### 5.1 Performance

**NFR-1**: Handle at least:  
- Up to ~10 log files simultaneously.  
- Combined rate of ~200 lines/sec without UI jank (no visible freezing of panel or VS Code).  

**NFR-2**: Use a virtualized list / incremental rendering to support up to a configurable maximum in-memory line count (default: e.g. 10k lines).  
- When exceeding max lines, drop oldest lines from memory (with a subtle note).

### 5.2 Reliability

**NFR-3**: Graceful behavior when:  
- `.wix/debug-logs/` is temporarily missing.  
- Files are truncated/rotated (size decreases → re-position tail safely without duplicating lines).  
- VS Code reloads the window (state can be reset; persistence v1 is not required).

### 5.3 Security & Privacy

**NFR-4**: No log content is sent outside the local machine.  
- No telemetry of log message contents.  
- If extension telemetry is added, it must be aggregate-only (usage + performance metrics) and respect VS Code telemetry policies.

---

## 6. UX / UI Outline

**Top Bar (inside panel):**
- Producer multi-select dropdown.
- Level multi-select dropdown.
- Search field + next/prev match controls.
- Buttons: `Pause/Resume`, `Clear`, `Reload`, `Follow Tail` (if applicable).

**Main Area:**
- Scrollable log stream, each row:  
  `[timestamp] [producer] [level] message`

**Empty States:**
- No `.wix/` folder:  
  - “No Wix project detected. This panel listens for logs in `.wix/debug-logs/` at the workspace root.”  
- `.wix` present but no `.wix/debug-logs/`:  
  - “Waiting for logs in `.wix/debug-logs/`…”  
- Directory exists but no files yet:  
  - Same as above, with hint: “Run Wix CLI or dev tools; logs will appear here automatically.”

---

## 7. Technical Notes (Implementation-Level, v1)

- **Platform:** VS Code extension (TypeScript).  
- **Activation Event:**  
  - On workspace open; extension activates when:  
    - `.wix/` directory exists in workspace root, or  
    - Command `Wix: Open Debug Logs Panel` is executed.

- **File Watching & Reading:**  
  - Use Node `fs.watch` or VS Code `workspace.fs` where appropriate.  
  - Maintain file offsets per file to tail without re-reading from start.  
  - Detect truncation via size comparison; adjust offset.  

- **UI:**  
  - Webview or custom editor view using a virtualized list library.  
  - In-memory state for log lines, filters, pause/tail state.

---

## 8. Open Questions

1. **History cap defaults:**  
   - How many lines / KB should be loaded on initial attach per file? (Proposal: up to 5k–10k lines total across files).  

2. **Producer color defaults and configuration:**  
   - Do we expose color overrides in `settings.json` in v1 or defer to v2?  

3. **Pause semantics:**  
   - During pause, do we:  
     - (a) stop reading files, or  
     - (b) continue reading but buffer or drop lines according to max buffer?  
   - Proposal: (b) for continuity, with clear UX that lines may be dropped if buffer limit reached.

---

## 9. Milestones

**M1 – Basic Tail & Panel (MVP core)**  
- VS Code panel with tailing of `.wix/debug-logs/` files.  
- Parsing of standard format.  
- Color coding by producer + level.  
- Auto-scroll.

**M2 – Filters & Search**  
- Producer & level filters.  
- Text search with highlighting.  
- Clear / Reload / Follow Tail.

**M3 – Hardening**  
- Handling of file rotation/truncation.  
- Performance optimization (virtualization, caps).  
- Empty states & error handling.

