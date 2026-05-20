# 2026-04-25 — §7 before/after photo-compare pane


Closes the last deferred item on `regen-stage-intervention-log` (featureManifest
§7 Soil, Ecology & Regeneration). Events linked via `parent_event_id` now surface
a side-by-side BEFORE/AFTER photo comparison modal.

### Changes
- `apps/web/src/features/regeneration/PhotoComparePane.tsx` (NEW) —
  modal overlay with two columns: label + date header, title, photo
  gallery, notes. Escape-to-close + click-outside-to-close + modal
  aria. No drag-slider: field photos aren't pixel-aligned, so the
  side-by-side read is the honest one.
- `apps/web/src/features/regeneration/RegenerationTimelineCard.tsx` —
  per-row "Log follow-up" (always) and "Compare before / after" (shown
  only when both self + parent carry `mediaUrls`) action buttons.
  `followUpParent` and `comparePair` state drives the form/overlay.
- `apps/web/src/features/regeneration/LogEventForm.tsx` — accepts
  optional `parentEvent` prop, threads `parentEventId` into the
  submitted payload, and renders a "↳ Follow-up to '…'" banner
  (clearable via the banner × or Cancel).
- `apps/web/src/features/regeneration/RegenerationTimeline.module.css`
  — .rowActions, .rowActionBtn, .followBanner styling plus the
  compare overlay classes (.compareOverlay/Modal/Close/Grid/Column/
  Head/Label/Date/Title, .comparePhotoList/Photo/Empty, .compareNotes).
  Responsive: single-column under 720 px.
- `apps/web/vite.config.ts` — added `/uploads` to the dev-server
  proxy (mirrors the existing `/api` entry). Fastify serves uploaded
  media from `/uploads/*` in local-filesystem fallback mode; without
  the proxy, Vite's SPA fallback was masking image GETs with
  `index.html` (preview verification blocker).
- `apps/web/src/features/soil-ecology/CONTEXT.md` — removed
  "before/after photo-compare pane" from the deferred list; documented
  the new action-button behaviour.

### Verification
- `cd atlas/apps/web && npx tsc --noEmit` — clean (exit 0).
- Browser smoke: registered fresh user, created a project, uploaded
  two distinct 240×160 PNGs as "before.png" (#8c5a32) and "after.png"
  (#3c8246), POSTed two events (observation + milestone) with the
  milestone's `parentEventId = before.id`. Verified:
  - Timeline renders both rows with correct chips and follow-chip
    on the milestone.
  - Milestone row shows both "Log follow-up" and "Compare before /
    after" buttons; root row shows only "Log follow-up".
  - Compare button opens the overlay with both images loading at full
    natural resolution (240×160) and correct BEFORE/AFTER labels and
    dates.
  - Screenshot captured at desktop preset confirming side-by-side.

### Related
- §7 regeneration-events table (migration 015).
- `RegenerationEvent.parentEventId` schema field.
