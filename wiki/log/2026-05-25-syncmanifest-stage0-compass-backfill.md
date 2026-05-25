# 2026-05-25 — syncManifest: register 7 unclassified Stage-0/compass stores

**Branch.** `feat/atlas-permaculture`, commit `23490e0b` (1 file, +70). The
`syncManifest` coverage guard (`apps/web/src/lib/__tests__/syncManifest.test.ts`
→ "classifies every persisted ogden- store") was **failing the build** — the
third recurrence of the same class of bug after the original P0-1 and the
[[log/... B-series backfill]]: project-scoped `ogden-` persist stores added by
later feature work were never registered in `SYNCED_STORES`/`DEVICE_GLOBAL`, so
each would **silently never sync across devices**. Confirmed pre-existing tech
debt on the branch (`git show HEAD:.../syncManifest.ts` referenced none of the
seven).

**Classification — all seven `versioned-blob`, project-scoped (none device-local).**
Read each store's persist key + version + state shape, then registered with the
established `blob(...)` + `byKey/tagged` helpers:

- `ogden-observation-needs` (v3) — **two** byProject record maps (`byProject`
  run state + `createdByProject` steward-raised needs); the single-record
  `byKey` template can't express it → new custom `observationNeedsShape`
  (`select` pulls both maps' rows for the pid; `apply` writes both back,
  other projects untouched).
- `ogden-true-north` (v1) — `profilesByProject` (one `TrueNorthProfile` per
  project) → `byKey('profilesByProject', null, {})`.
- `ogden-atlas-act-compass` / `-observe-compass` / `-plan-compass` (v1) —
  `byProject: Record<projectId, Partial<Record<module, RawEvidenceMap>>>` →
  `byKey('byProject', null, {})`. **Key call:** these are seeded with mock
  evidence (SEED) for the prototype wheel, but SEED is a *read-time fallback*
  in `currentMap`, never persisted — the persisted blob is only the steward's
  real overrides, so syncing `byProject` is correct and carries no mock data.
- `ogden-atlas-objective-summaries` (v1) — nests project **under** stage
  (`byStage[stage][projectId][module] = note`), so a project's slice spans
  every stage → new custom `objectiveSummaryShape` (extracts `{ [stage]: row }`
  for the pid across all stages; restores per-stage without disturbing other
  projects).
- `ogden-atlas-stage-gate-override` (v1) — `byProject` soft-gate
  "continue anyway" record → `byKey('byProject', null, {})`.

The two custom shapes follow the existing one-off `agribusinessSelect`
precedent; both round-trip `select → apply` with other-project isolation
(the guard's round-trip test exercises the byProject + projectId-tagged
templates, and the new shapes reuse the same setState-functional-updater
contract so the `isSyncing`/temporal guard still suppresses undo frames).

**Verification.** `npx vitest run src/lib/__tests__/syncManifest.test.ts`
**10/10** (incl. the coverage guard, the >50-blob transport-metadata check,
and the select-returns-defined smoke — the new entries satisfy all three);
`npm run lint` (= `tsc --noEmit`) **exit 0**. Live preview not relevant
(sync-manifest registry, not browser-observable).

**Process.** Staged **only** `apps/web/src/lib/syncManifest.ts` by explicit
path — the working tree carried unrelated foreign WIP (`financialStore`,
`MapCanvas`, `EconomicsPanel`, `ZoneSomSidebar`, etc.) left untouched per
[[feedback-no-deletion]]; committed immediately on green + divergence-checked
(0 ahead/0 behind at commit time) per
[[feedback-commit-immediately-on-rebased-branches]].

**Known issue (unchanged, out of scope).** Registration doesn't fix that
`initialSync` 401s/validation-fails for demo projects like `mtc` whose IDs
aren't UUIDs (the server validates `projectId` as a UUID); that's a separate
pre-existing gap.

Continues the syncManifest coverage story from the
[B-series backfill](../decisions/2026-05-18-atlas-syncmanifest-bseries-store-backfill.md)
and the [Phase C consolidation](../decisions/2026-05-22-atlas-phase-c-consolidation.md).
Updates entity [[entities/web-app]].
