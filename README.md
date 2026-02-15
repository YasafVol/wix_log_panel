# WIX LOGS (VS Code Extension POC)

WIX LOGS is a VS Code extension POC that tails `.wix/debug-logs` and renders all producers in a single, terminal-style panel.

## What this POC includes

- Single panel view in the VS Code bottom panel (`WIX LOGS`)
- Real-time tailing of top-level files in `.wix/debug-logs`
- Safe parsing with malformed-line fallback (`unknown` producer/level)
- Follow-tail behavior (auto-follow at bottom, manual recover via button)
- Producer and log-level filtering
- Search with highlight + next/prev navigation + keyboard shortcuts
- Pause/resume, clear, reload controls
- Copy/export actions:
  - copy visible logs
  - export visible logs to file
  - copy individual line
  - mock action: `Send to chat`
- Producer colors auto-generated per producer (deterministic, theme-aware)
- Timestamp display toggle: ISO / short time

## Why these choices

- **Webview + virtualization:** Needed for terminal-like UX and smooth rendering under streaming updates.
- **Host/webview split:** File watching/tailing stays in extension host; rendering and interactions stay in webview for clean separation.
- **Deterministic producer colors:** Avoids hardcoded producer maps while keeping visual identity stable across sessions.
- **Malformed-line tolerance:** Debug streams should never break UI; unknown lines remain visible.
- **POC-first scope:** Product interaction quality prioritized over deep reliability hardening (rotation edge cases and throughput hardening are intentionally deferred).

## Run locally

```bash
npm install
npm run build
npm test
```

Run in VS Code via **Run and Debug**:

- `Run Extension (Force New Window)`

Then open command palette in Extension Development Host:

- `WIX LOGS: Open Panel`

## Generate sample logs

```bash
node plans/debug_log_spam_generator.mjs --files 5 --lps 120 --duration 30
```

## Project notes

- Feature behavior inventory lives in `log_panel_features.md`.
- Cursor rule to keep that file current:
  - `.cursor/rules/update-log-panel-features.mdc`
