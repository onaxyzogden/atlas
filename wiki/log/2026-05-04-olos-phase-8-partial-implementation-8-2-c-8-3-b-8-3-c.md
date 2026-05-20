# 2026-05-04 — OLOS Phase 8 partial implementation (8.2-C, 8.3-B, 8.3-C)


Three of four scoped Phase 8 ADRs landed; 8.4 deferred because the OBSERVE/SWOT substrate it rolls up doesn't exist on this branch.

**8.2-C — Drop state mining registry scrape** (per ADR `2026-05-02-global-groundwater-esg-sources-scoping` D3). Removed `StateMineralRegistry`, `US_STATE_MINERAL_REGISTRIES` (TX/ND/WY/CO/OK/MT), `US_STATE_MINERAL_INFORMATIONAL` (PA/KY/WV/LA/CA/NM/AK), and `queryStateMineralRegistry` from `apps/web/src/lib/layerFetcher.ts`. `fetchMineralRightsComposite` retains federal BLM + BC MTO only; emits a generic legal-checklist note when a US state code resolves. `pickField` retained for water-rights fetcher.

**8.3-C — Rename FUTURE → LATENT** (per ADR `2026-05-02-phase-gated-future-routes-scoping` D2). `PhaseTag` union, `PHASE_ORDER`, Section 28 entries, and `phaseAtMost` branch updated in `packages/shared/src/featureManifest.ts`. `apps/api/src/plugins/featureGate.ts`: `futureEnabled` → `latentEnabled`, reads `ATLAS_LATENT ?? ATLAS_FUTURE` (legacy env honoured for transition). Route doc + `requirePhase('LATENT')` updated in `apps/api/src/routes/future-geospatial/index.ts`; `apps/web/src/features/future-geospatial/FutureGeospatialPage.tsx` doc updated; `apps/api/scripts/scaffold-section.ts` `Phase` type + `VALID_PHASES` updated.

**8.3-B — Moontrance per-project gate** (per ADR `2026-05-02-phase-gated-future-routes-scoping` D1). New migration `apps/api/src/db/migrations/022_project_moontrance_identity.sql` — table keyed by `project_id` with `enabled` flag, `summary` jsonb, FK CASCADE on projects, partial index on enabled rows. Route `apps/api/src/routes/moontrance-identity/index.ts` rewritten: `GET /:projectId` with preHandler chain `authenticate → requirePhase('MT') → resolveProjectRole → requireMoontranceProject` (custom inline gate that 404s if no opt-in row; `NotFoundError` not Forbidden so route existence isn't leaked).

**Build verify.** `tsc --noEmit` clean for `packages/shared`. `apps/api` fails only on the pre-existing `src/routes/projects/index.ts:117` spread error (verified by stashing changes — same failure before my edits). `apps/web` reports no errors in any file I touched (only pre-existing failures in `QuietCirculationRouteCard` and `HerdRotationDashboard` imports). No new tsc errors introduced.

**Deferred this session (multi-session scope):**
- 8.1 — raster pollinator-corridor (NLCD/ACI/WorldCover hybrid + LCP)
- 8.2-A — IGRAC global groundwater adapter
- 8.2-B — WDPA + NCED + ECCC ESG tiered overlay
- 8.4 (A–D) — OBSERVE Phase 4b–4f rollup. The `apps/web/src/features/observe/` directory and `store/site-annotations.ts` referenced by the ADR don't exist on this branch; the rollup substrate landed (or didn't) in a different lineage. Revisit after locating the OBSERVE work.

ADRs:
- [`wiki/decisions/2026-05-02-global-groundwater-esg-sources-scoping.md`](decisions/2026-05-02-global-groundwater-esg-sources-scoping.md) — Partially Accepted (D3 only)
- [`wiki/decisions/2026-05-02-phase-gated-future-routes-scoping.md`](decisions/2026-05-02-phase-gated-future-routes-scoping.md) — Partially Accepted (D1 + D2; title FUTURE→LATENT)

Note: a prior compaction summary reported these phases as fully-shipped on this branch. They were not — git history confirms zero implementation commits prior to this entry. The summary was reconstructed from this fresh implementation against the restored ADRs.
