# 2026-04-24 — §7 regen-events: media upload + dashboard polish


Closes the media-upload gap left by the previous §7 session and folds in
two smoke-test findings from the same dev cycle.

### Shipped
- `apps/api/src/routes/regeneration-events/index.ts` — new
  `POST /:id/regeneration-events/media` multipart sub-route. Consumes
  `multipart/form-data` via `@fastify/multipart`, validates MIME against
  `image/(jpeg|png|webp|gif|heic|heif)`, enforces a 10 MB cap with a
  running-total guard, and writes via `StorageProvider.upload(...)` at
  key `projects/{projectId}/regeneration-events/{mediaId}/{sanitized}`.
  Returns `{ url, contentType, size, filename }` with 201.
- `apps/api/src/services/storage/StorageProvider.ts` — factory now
  detects missing AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_PROFILE`)
  and falls back to `LocalStorageProvider` even when `S3_BUCKET` is set,
  so dev environments with the bucket configured but no creds don't 500
  on first upload.
- `apps/api/src/app.ts` — added a path-traversal-guarded
  `GET /uploads/*` handler that streams files out of
  `data/uploads/` for the local-storage branch. No new dependency
  (`@fastify/static` not required for this single mount).
- `apps/web/src/lib/apiClient.ts` — `api.regenerationEvents.uploadMedia`
  helper (FormData POST with bearer auth, throws `ApiError` on non-2xx).
- `apps/web/src/features/regeneration/LogEventForm.tsx` — multi-file
  picker, per-file upload with running counter, accumulated `mediaUrls`,
  thumbnail preview, remove-button, and submit-disabled-while-uploading.
- `apps/web/src/features/regeneration/RegenerationTimelineCard.tsx` —
  `EventRow` renders a thumbnail strip when `mediaUrls.length > 0`
  (each thumb is an `<a target="_blank">` to the full image).
- `apps/web/src/features/regeneration/RegenerationTimeline.module.css` —
  styles for `.mediaPicker`, `.mediaInput`, `.mediaThumbs`,
  `.mediaThumb`, `.mediaRemove`, `.mediaStatus`, `.eventMedia`,
  `.eventMediaThumb`.
- `packages/shared/src/schemas/regenerationEvent.schema.ts` —
  `mediaUrls` validator relaxed from `z.string().url()` to a refine
  that accepts either `http(s)://` URLs (S3 mode) or server-relative
  paths starting with `/` (local-storage mode).

### Smoke-test findings folded into the same commit
- **Date-fix** (`RegenerationTimelineCard.tsx`): `formatDate` now parses
  `YYYY-MM-DD` strings as *local* calendar dates instead of letting
  `new Date(isoDate)` interpret them as UTC midnight. Without this, an
  event dated `2026-04-23` rendered as `Apr 22` in negative-offset
  timezones.
- **Gate-fix** (`apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx`):
  `<RegenerationTimelineCard>` is hoisted out of the site-data loading
  branch — the timeline is project-scoped (regeneration_events table),
  not site-data-scoped, so it shouldn't disappear behind the FEMA/FWS
  fetch skeleton.

### Verification
- `npx tsc -b apps/api` — clean.
- `apps/web` `tsc --noEmit` — clean.
- API round-trip via browser fetch: register → create project → upload
  PNG (201) → create event with `mediaUrls: [url]` (201) → list returns
  the event with `mediaUrls` populated → `GET <url>` returns 200 (1139
  bytes). Confirmed against the local-fs storage branch.
- UI round-trip: `Photo Smoke UI` project on the Ecological dashboard
  renders the photo event with thumbnail and the observation event,
  both with correct dates (Apr 24 and Apr 22).

### Out of scope (still deferred)
- Polygon-location drawing for events (Point via boundary centroid or
  NULL site-wide only).
- Before/after side-by-side photo-compare pane.
- Editing/deleting events from the timeline UI.
- Lightbox / full-screen photo viewer (thumbnails open in a new tab).
