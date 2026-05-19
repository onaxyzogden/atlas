# apps/web — Verification Standard

This is not a routing CONTEXT.md — it records the agreed UI verification
standard for the Atlas web app.

## Preview verification

`preview_screenshot` (Claude_Preview MCP) stalls on pages that never reach a
settled paint. The Claude preview UA does not report
`prefers-reduced-motion`, so `apps/web/src/main.tsx` sniffs `Claude/` in the
user agent and adds a `reduce-motion` class to `<html>`; the class-based
collapse rule lives in `apps/web/src/app/index.css`. This eliminates the
*animation-driven* stall (verified: animation/transition durations collapse
to `1e-05s` under the Claude UA). **However**, on the current Windows setup
`preview_screenshot` still times out even on pure-DOM `/home` — a separate
known capture-tool hang dominates. Treat screenshots as unavailable here and
verify via DOM exercise regardless of route.

Routes that mount a MapLibre WebGL canvas (v3 `observe`/`plan`/`act`/
`design`, the `/new` boundary step, `/portal/$slug`) have an internal
render loop the capture tool cannot settle, and `preview_screenshot` also
has a separate known Windows hang. For those routes — and any time capture
times out — **DOM-exercise verification is the accepted standard**: drive
state with `preview_eval` / `preview_click` / `preview_fill`, assert with
`preview_snapshot` / `preview_console_logs`, and **state explicitly in the
report that screenshot capture was unavailable and why**. Never claim a UI
works without either a screenshot or an explicit limitation disclosure.

Full rationale: `wiki/decisions/2026-05-19-atlas-preview-screenshot-verification-standard.md`
(parent MILOS repo).
