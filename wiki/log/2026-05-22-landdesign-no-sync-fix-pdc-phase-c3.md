# 2026-05-22 — `landDesign` silent no-sync fix (PDC Phase C, C3)

**Branch:** `feat/atlas-permaculture`
**Commit:** `15612b75`
**ADR:** [[2026-05-22-atlas-typed-promotion-access-utility]] (C3 flipped from Deferred → Done)
**Roadmap:** `~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`
**Plan:** `~/.claude/plans/quiet-snuggling-tower.md`

## What & why

`useLandDesignStore` (Plan-stage non-structure design elements — pond, swale,
paddock, orchard, path, road, gate, bridge, turnaround; localStorage key
`ogden-atlas-design-elements`, `byProject: Record<projectId, DesignElement[]>`,
version 2, **not** temporal) was classified `typed-design-feature` in
`syncManifest.ts`. That classification tells the generic versioned-blob sync
loop to **skip** the store ("the design surface already round-trips through
`design_features`"). But unlike `ogden-zones` / `ogden-built-environment-v2`
(and the C1/C2 `ogden-paths` / `ogden-utilities`), **no typed transport was
ever wired** for it — a `grep` over `syncService.ts` for `design-elements` /
`landDesign` / `DesignElement` returns nothing.

Net effect: these elements were **localStorage-only and silently never synced
across devices** — the exact P0-1 failure the manifest exists to prevent. A
multi-device steward lost every pond/swale/paddock/road they drew, with no
warning.

## The fix — reclassify to `versioned-blob`, not a typed promotion

C1/C2 promoted paths/utilities onto the typed `design_features` path because
they are PDC roster deliverables (server-queryable, appear in the master-plan
PDF). `landDesign` is different: it has **no `design_features` mapper** and is
**not** a roster deliverable (it is freeform sketch geometry). So the correct
transport is an **opaque per-(project, storeKey) blob**, not a typed
promotion.

- `syncManifest.ts` — added `import { useLandDesignStore }`; removed the
  `{ storeKey: 'ogden-atlas-design-elements', classification:
  'typed-design-feature' }` entry; added a `byProject` blob descriptor:
  `blob('ogden-atlas-design-elements', useLandDesignStore, 'byProject', 2,
  byKey('byProject', null, []))` — mirrors `ogden-soil-tests` /
  `ogden-compost-cycle`. `schemaVersion: 2` matches the store's persist
  `version: 2`; `usesTemporal` defaults `false` (persist-only).
- **No `syncService.ts` change** — the generic blob loop already
  subscribes/queues/hydrates every `versioned-blob` from its
  `store` + `selectForProject` + `applyForProject` metadata (supplied by the
  `blob(...)` helper). That is the whole point of the Phase-2.5b generic loop.

## Bundled fix — a C1 test regression

The round-trip unit test at `syncManifest.test.ts:226` used `ogden-paths` as
its "projectId-tagged" example. C1 reclassified `ogden-paths` to
`typed-design-feature`, which removes its `selectForProject`, so
`pa.selectForProject!(...)` threw `TypeError` at runtime. C1/C2 only ran the
new `featureMapping*` test files (not this suite), so the breakage landed
uncommitted-but-red. Repointed the example to `ogden-utility-runs`
(`tagged('runs')`), which is explicitly documented (C2 ADR) to **stay** a
`versioned-blob` — the most rebase-stable choice. (The `byProject` shape stays
covered by the existing `ogden-hazards` case above it.) Bundled into the C3
commit per user decision (same file, same sync surface).

## Verification

- **web vitest** — `npx vitest run syncManifest`: `syncManifest.test.ts`
  10/10 + `syncManifestRoundTrip.test.ts` 67/67 = **77 passed**. The
  typed-design-feature pin test passes with design-elements removed; the
  round-trip test passes on the `ogden-utility-runs` example; and the
  iterate-all-blobs guards (transport metadata / selector-defined /
  applyForProject) now include `ogden-atlas-design-elements` and pass. (The
  `ECONNREFUSED :3000` lines are unrelated store-init fetch-fallback noise,
  not failures.)
- **web tsc** (8 GB node script) — only the 3 known pre-existing unrelated
  errors remain (`StepBoundary.tsx`, `HostUnionContextMenu.test.tsx`,
  `HostUnionDrilldownCard.test.tsx`). No new errors.
- **Deferred (stated, not claimed):** live two-device draw-pond →
  reload-on-device-B round-trip — same auth + seeded-project + headless-WebGL
  + MapTiler wall as Phase A/B; covered meanwhile by the manifest guard tests.

## Deferred to follow-up sessions (Phase C remainder)

- **C4** — consolidate overlapping access/utility authoring (canonical
  ownership: designed access → `pathStore`, designed utility →
  `utilityStore`, BE driveway/power/well/septic = Observe record of existing
  infra, `landDesign` path/road kinds = freeform sketch) + UI clarity in
  `elementCatalog.ts`. No destructive migration.
- **C5** — properties-panel polish: structure `rotationDeg` field + live
  orientation indicator; confirm path/utility edit fields present.
- **C6** — full e2e verify + session ADR for the consolidation.
