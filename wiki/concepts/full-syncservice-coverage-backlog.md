# Backlog — Full `syncService` Coverage (2026-05-16)

## Summary
The 2026-05-16 pre-live-testing hardening pass shipped a *manual* multi-device
escape hatch (`projectBundle.ts` whole-namespace export/import) and documented
the partial-sync boundary
([ADR](../decisions/2026-05-16-atlas-multi-device-bundle-escape-hatch.md)),
but deliberately deferred the **durable** fix for P0-1 to this backlog: the
silent multi-device data loss caused by `syncService` covering only 4 of ~68
project-scoped stores.

This entry records the **approved, execution-ready plan** for that durable fix
so it is not lost. It is **catalogued, not executed** — it is a multi-session
(~128k-token) build, not a testing-window blocker (the bundle hatch holds the
line during the testing window).

## The gap (P0-1, restated)
`syncService.ts` write-through syncs only `projectStore`, `zoneStore`,
`builtEnvironmentStoreV2`, and queued comments. ~64 other project-scoped
Zustand `persist` stores (design elements/`landDesign`, `vegetationStore`,
succession/temporal, all Observe annotation stores, project metadata,
`regenerationPlanStore`) are localStorage-only **even when authenticated** —
device B silently shows only project shell + zones + structures.

## Approved approach (decisions locked 2026-05-16)
- **Hybrid storage.** Typed server tables + Zod for stores the server should
  query/reason about (`vegetationStore`, succession); one generic
  versioned-blob table (`project_state_blobs`) for the write-mostly remainder;
  design-element geometry **stays on the existing `design_features` typed path
  — no double-write**.
- **Conflict model: stale-write reject + surface.** Per-store monotonic `rev`;
  server `409`s stale writes; client surfaces a visible conflict (toast +
  Connectivity badge), never silently clobbers.
- **Manifest as single source of truth.** `apps/web/src/lib/syncManifest.ts`
  enumerates every project-scoped store with a `classification`
  (`typed-design-feature` | `typed-table` | `versioned-blob`); a CI coverage
  test fails if any `ogden-` persist store is unclassified — closes the
  "silently missed a store" failure mode permanently.
- **Version-skew guard.** Old client receiving a newer blob `schemaVersion`
  refuses to hydrate that store, keeps local, toasts "update Atlas", and does
  **not** push the stale slice back.
- **Phased rollout** (shadow → typed additive → blobs 5-at-a-time behind a
  per-store flag) so it never risks tester data big-bang.

## Full plan
The complete phased plan (5 phases, file-path-specific, with token estimates,
risk table, staged checklist, verification, and definition of done) is the
approved plan file:
`C:\Users\MY OWN AXIS\.claude\plans\before-we-proceed-with-mutable-crystal.md`
— "Full `syncService` Coverage — Execution-Ready Plan".

## Constraints
- This is the **real long-term P0-1 fix**, deferred deliberately; the
  `projectBundle.ts` hatch is the testing-window mitigation, not a substitute.
- No-deletion policy applies (relabel `projectBundle.ts` offline-only at the
  end, do not remove it).
- No new npm deps.
- Re-prioritise the version-skew guard earlier if the "single fresh build"
  testing assumption breaks (testers upgrading across builds).
