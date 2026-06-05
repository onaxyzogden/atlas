# 2026-05-13 — Rec #1 status-gate hardening: MTC seed + metadata preservation


**Why.** End-to-end smoke-test of yesterday's Needs & Yields status
gate flushed out two latent regressions that masked the gate's
persistence:

1. The legacy `/v3/project/mtc/...` route was served from a
   `MTC_FALLBACK` constant inlined into both `PlanLayout` and
   `ActLayout`. The constant was never written to the store, so
   `updateProject('mtc', { metadata: ... })` silently dropped through
   the builtin-allowlist guard — `designStatus` / `allowOrphanOutputs`
   writes vanished before they could reach `persist`.
2. Even after writes started landing for non-MTC builtins,
   `applyBuiltinsToStore`'s `incoming.map()` rebuilt every project
   row from the builtins API and overwrote the local copy. The API
   doesn't ship a `metadata` field, so the rebuild stripped every
   `ProjectMetadata` write (status gate, zone thresholds, design
   horizon) on every reload — undoing the chip flip.

**What.**
- New `MTC_SEED` exported from `projectStore.ts`; seeded as
  `isBuiltin: true` on `onFinishHydration` so the slug is a real
  store row. `PlanLayout` / `ActLayout` switch their fallback to
  `MTC_SEED` (drop the inlined constants).
- `applyBuiltinsToStore` spreads `metadata: existing?.metadata` into
  the rebuilt row so user-edited project metadata survives every
  re-seed pass.
- Bonus selector-stability fix: `OrphanCountProbe`'s
  `useRelationshipsStore((s) => s.edgesByProject[projectId] ?? [])`
  returned a fresh `[]` reference per call, tripping React's
  `useSyncExternalStore` snapshot-stability check and infinite-
  looping the probe whenever a project had no relationship edges
  yet. Subscribe to the dict and derive via `useMemo`.

**Verified.** Live preview at
`/v3/project/ec5ed028-0320-4480-9543-2ff10308834e/plan/principle-verification`:
chip mounts `Status · Draft`, "Mark ready for review →" disabled
with tooltip `4 unrouted outputs. Route them, or tick "Allow orphan
outputs".`. Toggle escape hatch → CTA enables → click → chip flips
to `Status · Ready for review` + fired-clay `⚠ Orphans allowed`
badge. **Reload → chip + badge persist.** `localStorage`-resident
`ogden-projects` carries `metadata: { allowOrphanOutputs: true,
designStatus: "ready-for-review" }` across the re-seed pass. Untick
escape hatch + dismiss → confirm modal fires with
`aria-label="Unresolved orphan outputs"` and 4-count copy. Commits:
[`8f585e4f`], [`e9a7db71`], [`0bc04b4c`].
