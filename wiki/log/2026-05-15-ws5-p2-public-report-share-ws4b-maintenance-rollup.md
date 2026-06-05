# 2026-05-15 — WS5 P2 (public report share) + WS4b (maintenance rollup)


Closed the two MVP-delta items deferred from the 2026-05-15
reconciliation session. ADR:
`decisions/2026-05-15-atlas-ws5p2-public-report-share-ws4b-maintenance.md`.

**WS5 P2.** Tokenized, unauthenticated, view-only report share (spec
§5.1.2). Reuses `project_portals` (no migration); `config.reportShare`
block with its own publish flag, decoupled from storytelling
`is_published`. Public `GET /api/v1/portal/:shareToken/report.pdf`
**streams the frozen `capital_partner_summary` PDF bytes through the
API** — the raw storage URL is never client-visible, which *resolves*
the storage-ACL security checkpoint by design rather than assumption.
`Cache-Control: no-store` satisfies the immediate-unpublish gate.
Inherited rate-limit/CDN caveat carried forward (gated before first
public URL).

**WS4b.** `computeMaintenanceSchedule` (pure) → synthetic recurring
"Ongoing maintenance" phase (`order 99`) + tagged `isMaintenanceTask`
tasks, woven at the `runAutoDesign` orchestrator seam (not
`sequencingEngine`), mirroring `regenerationForcing.ts`.
`MaintenanceSchedule` metadata authored across 19 recurring catalog
interventions + 2 recurring regeneration methods (deduped by method
id). `PhaseTask` extended with optional maintenance fields (no persist
bump). New `MaintenanceScheduleCard` (Module 7 · Phasing) rolls up
per-frequency labor/cost, annualised totals, materials procurement,
skilled-help, equipment.

**Latent bug fixed.** `GenerateSiteDesignBar` persisted only
`sequencing.generatedPhases`, silently dropping WS3 regeneration **and**
WS4b maintenance synthetic-phase tasks. `AutoDesignResult` now exposes
combined `generatedPhases` (forcing + sequencing + maintenance); the
consumer persists that. Fixes WS3 task persistence as a side effect.

**Verification.** `tsc --noEmit` clean (web + api; default heap OOMs
on web → 8 GB heap, not a type error). web plan+store 158/158 green
(5 new maintenance specs); api `portal.test.ts` 8/8 green (4 new
public-route specs). No regression.

**Deferred.** Manual hands-on pass (publish → `/report-share/<token>`
logged-out, unpublish → 404) — no dev server run this session.
Launch-readiness rate-limit/CDN on the public route remains open
(inherited, gated before first public URL).
