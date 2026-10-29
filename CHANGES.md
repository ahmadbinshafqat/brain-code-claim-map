# Changes: Scan History Sidebar

Added a browser-local scan history feature so users can revisit recent analyses without re-pasting code.

## Modified files

- `app/page.tsx`
  - Adds a left sidebar with recent scans saved in `localStorage`.
  - Saves successful scan responses with title, timestamp, source code, findings, and report data.
  - Supports reloading a scan by clicking a history item.
  - Supports clearing all saved history.
  - Keeps the existing scan, heatmap, ranked findings, and Markdown download flow working end-to-end.

- `app/globals.css`
  - Adds layout and visual styling for the scan history sidebar.
  - Adds responsive behavior so the sidebar stacks above the main scanner on narrow screens.

- `lib/types.ts`
  - Adds `ScanHistoryItem` and related shared types used by the UI.
  - Keeps scanner response types available for the existing API and analyzer code.

## Integration notes

No new dependencies or environment variables are required. The feature uses browser `localStorage` under the key `code-claim-map.scan-history.v1`.

Run the app as before:

```bash
npm install
npm run dev
```

Then scan code once. The completed scan will appear in the history sidebar and can be reopened later in the same browser.