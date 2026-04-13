# ADR: PDF Export Architecture
**Date:** 2026-04-11
**Status:** accepted

## Context
The `project_exports` table existed in the DB schema but no export service was implemented. The frontend used `window.print()` for all exports. The project needed professional-quality PDF exports for 7 document types that go to investors and landowners.

## Decision
1. **Puppeteer** for HTML-to-PDF rendering (not jsPDF, pdf-lib, or Playwright)
   - Puppeteer renders full HTML/CSS faithfully, supports Google Fonts, print-quality output
   - Lighter than Playwright for this use case
   - `PUPPETEER_EXECUTABLE_PATH` env var for Docker deployments

2. **Synchronous rendering** (not BullMQ queued)
   - Pre-assembled HTML renders in 1-3 seconds — no user-visible delay
   - Simpler than async: endpoint returns URL directly, no polling needed
   - Can be moved to BullMQ later if render times grow

3. **Browser singleton** (not per-request launch)
   - Launching Chromium takes 2-3s; reusing saves ~80% of render time
   - One browser, new page (tab) per request
   - Cleanup via Fastify `onClose` hook

4. **TypeScript template-literal functions** (not Handlebars, EJS, or .html files)
   - Type-safe data bag, no extra dependency, matches codebase conventions
   - Full access to TypeScript utility functions for formatting

5. **Client-side data via request body `payload`**
   - Financial model, scenarios, and field notes are localStorage-only (no backend sync)
   - Frontend serializes Zustand store state into `payload.financial`, `payload.scenarios`, `payload.fieldNotes`
   - Templates degrade gracefully when payload is absent

## Consequences
- `puppeteer` adds ~100MB to node_modules (Chromium binary)
- Server needs enough RAM for one Chromium instance (~100MB at rest)
- Frontend must serialize store state when requesting financial/scenario/field note exports
- Templates are pure functions — easy to test in isolation
- When backend sync is implemented (Sprint 3), templates can switch to DB-only data sourcing
