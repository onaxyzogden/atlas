# Log — Atlas Phase F: post-protocol follow-ups

**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`
**ADR:** [[decisions/2026-05-21-atlas-phase-f-post-protocol-followups]]

---

## What landed

Four sub-phases, one commit each, on top of the Phase E protocol-pass
state.

| #   | Slice                                | Commit       |
| --- | ------------------------------------ | ------------ |
| F.1 | Playwright Anti-GIS mobile snapshot  | `1e6118bd`   |
| F.2 | LAUNCH-CHECKLIST Post-Protocol entry | `68e3f359`   |
| F.3 | Per-zone SOM trajectory (API)        | `4106a835`   |
| F.4 | `evidence_audit_log` + emit hook     | `e0443b8b`   |
| F.5 | This ADR + log + index + push        | (this commit) |

## F.1 — Anti-GIS snapshot driver

- **New** `apps/web/scripts/anti-gis-snapshot.ts` — programmatic
  Playwright driver. Mobile viewport 390×844, navigates to the
  Apricot-Lane Observe route, asserts Verdict + first Next Best Action
  are above the fold, writes
  `apps/web/screenshots/anti-gis-apricot-lane.png`.
- `apps/web/package.json` script: `anti-gis:snapshot`.
- `.gitignore` adds `apps/web/screenshots/*.png`; directory tracked via
  `.gitkeep`.
- Optional `ANTI_GIS_STORAGE_STATE` env var for an authenticated
  Playwright `storageState.json` — inert until set; future CI seam.

## F.2 — LAUNCH-CHECKLIST

- Appended `## Post-Protocol Aspirations (Phase E + F follow-ups)` to
  `wiki/LAUNCH-CHECKLIST.md`. Landed: F.1, F.3, F.4. Deferred: replay
  tool, remaining-panel emit rollout, per-zone web surfaces, tooltip
  Evidence retrofit, PDF Evidence, i18n, per-fragment confidence
  ranges, Playwright CI.

## F.3 — Per-zone SOM trajectory

- `apps/api/src/services/terrain/algorithms/soilRegeneration.ts` —
  **additive**: new `ProjectSomTrajectoryInput` + `ZoneTrajectoryInput`
  + `ZoneSomYearRow` types, and a new `projectSomTrajectoryWithZones`
  function returning `{ projectRows, zoneRows }`. v1
  `projectSomTrajectory` left untouched (honours
  [[feedback-no-deletion]] — three existing call-sites keep working).
- `apps/api/src/routes/soil-regeneration/index.ts` — rewritten. POST
  accepts optional `zones: ZoneTrajectoryBody[]` (max 50); response
  grows `{ rowCount, trajectory, zoneRowCount, zoneIds }`. GET accepts
  optional `?zoneId=<id>` (default = whole-project rows, backward-
  compat). Transaction DELETE-then-INSERTs whole-project + per-zone
  layers.
- Unit tests
  (`apps/api/src/services/terrain/algorithms/__tests__/soilRegeneration.test.ts`):
  +4 cases under `projectSomTrajectoryWithZones — F.3 per-zone variant`.
- Route tests (`apps/api/src/tests/somTrajectory.test.ts`): +3 cases —
  POST with zones (rowCount=33, zoneRowCount=22), POST without zones
  (behaviour-identical), GET `?zoneId=food-prod-A` (filters to 3 rows).
- **No new migration.** Migration 031 already supported
  `(project_id, zone_id, year)`.

## F.4 — `evidence_audit_log`

- **Migration 033** — `apps/api/src/db/migrations/033_evidence_audit_log.sql`.
  Table with `project_id`, `panel_key`, `input_hash CHAR(64)`,
  `input_payload JSONB`, `selector_name`, `evidence_output JSONB`,
  `created_at`, `created_by`. Indexes on
  `(project_id, panel_key, created_at DESC)` and on `input_hash`.
- **New** `apps/api/src/routes/evidence-audit/index.ts` — POST
  `/api/v1/projects/:projectId/evidence-audit/log`. Zod validates
  `inputHash` as 64-char hex. Write-only in v1 (no GET).
- `apps/api/src/app.ts` — mounted at `/api/v1/projects` adjacent to
  soil-regeneration.
- Route tests (`apps/api/src/tests/evidenceAudit.test.ts`): 401, 422,
  200 happy path, 403 for non-members.
- **New** `apps/web/src/lib/evidence/hashInputs.ts` — `stableStringify`
  (recursive key sort, JSON.stringify parity for `undefined` / non-
  finite numbers) + `hashInputs` (SHA-256 hex via
  `crypto.subtle.digest`).
- Unit tests
  (`apps/web/src/lib/evidence/__tests__/hashInputs.test.ts`): 5 cases
  covering key-order insensitivity, array-order sensitivity, drop-
  undefined, reproducibility invariant, and value-changes-hash.
- **New** `apps/web/src/lib/evidence/auditEmit.ts` —
  `emitEvidenceAudit(...)` fire-and-forget helper. Errors swallowed.
- `apps/web/src/lib/apiClient.ts` — `api.evidenceAudit.log(...)`.
- `apps/web/src/features/dashboard/LandVerdictCard.tsx` — initial
  adopter. Selector inputs split into a memoised object; `useEffect`
  on that memo fires `emitEvidenceAudit`. Other Evidence panels
  **deferred** to a later slice.

## Verification

- `pnpm --filter @ogden/api run lint` — clean.
- `pnpm --filter @ogden/api run test` — 680 passed, 3 skipped.
- `pnpm --filter @ogden/web run test` — 1780 passed.
- `pnpm --filter @ogden/web run lint` — only pre-existing foreign-WIP
  errors (`ObserveAnnotationLayers.tsx`, `vegetationResolver.ts`,
  `HostUnion*Test`); no errors in F.4 surface.

## Push notes

Branch was force-pushed externally between F.2 and F.3 (per
[[project-branch-rebase]]); local F.3 (`4106a835`) was preserved as a
fast-forward on top of the external commits. F.4 (`e0443b8b`) is the
final local commit ahead of origin at push time.

`git fetch origin && git status -sb` before push → `ahead 1`.
`git push --force-with-lease origin feat/atlas-permaculture`.
