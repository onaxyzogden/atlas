# 2026-05-13 — Option C: residence → Zone-0 lazy derivation


**Closed.** Realized the ADR
[`2026-05-13-atlas-residence-zone0-derivation.md`](decisions/2026-05-13-atlas-residence-zone0-derivation.md)
(Option C). When no explicit homestead is placed and exactly one
existing residence-kind BE entity (`building`, `cabin`, `yurt`,
`tent-glamping`, `earthship`) sits on the parcel, downstream tools now
treat its polygon centroid as a *derived* Zone 0 anchor. The
`homesteadStore` is never written from the residence — explicit
Place-homestead stays the only writer. Per user decision the derived
marker is **invisible** (no `<HomesteadMarker>` for derived anchors),
the resolved anchor is **snapshotted** onto each `PermacultureZone`
record with a new `anchorSource: 'derived' | 'explicit'` field, and a
new local-only **observe telemetry** stub records gate-flip transitions
so we can later measure how often derivation lands the gate without an
explicit Place.

**Changes.**
- `packages/shared/src/builtEnvironmentKinds.ts` — added shared
  `RESIDENCE_KINDS` constant.
- `apps/web/src/v3/observe/hooks/useEffectiveHomestead.ts` *(new)* —
  resolves `{ point, source, derivedFrom }` from explicit →
  single-residence centroid → none. Ships with an imperative twin
  `resolveEffectiveHomestead` for pointer handlers / store subscribers.
- `apps/web/src/lib/observeInteractionLog.ts` *(new)* — telemetry stub
  mirroring `actInteractionLog.ts` (queue + idle/ceiling + session id +
  `VITE_ATLAS_TELEMETRY_ENABLED` gate). Flush is local-only
  (`console.debug` in dev) until a backend endpoint exists. Events:
  `homestead_gate_flip`, `homestead_explicit_set`,
  `homestead_explicit_clear`.
- `apps/web/src/store/humanContextStore.ts` — `PermacultureZone` gains
  optional `anchorSource: 'derived' | 'explicit'` (absence treated as
  `'explicit'` for backward compat with persisted records).
- Five consumers migrated behind the hook:
  - `apps/web/src/v3/observe/tools/ObserveTools.tsx` — gate reads
    effective hook; emits `homestead_gate_flip` on
    placed/source transitions.
  - `apps/web/src/v3/observe/components/draw/PermacultureZoneTool.tsx`
    — reads through hook; writes `anchorSource` on save.
  - `apps/web/src/v3/observe/components/draw/AnnotationSectorHandles.tsx`
    — reads through `resolveEffectiveHomestead`; apex-drag *write* to
    `homesteadStore` unchanged (drag is an explicit Place equivalent);
    refresh now also subscribes to the BE store so the wedge tracks a
    moved residence.
  - `apps/web/src/v3/observe/components/draw/SunWindWedgeTool.tsx` —
    reads through hook for bearing-seed origin.
  - `apps/web/src/v3/observe/ObserveLayout.tsx` — `<HomesteadMarker>`
    stays gated on **explicit only** (invisible derivation); wired
    `homestead_explicit_set` / `homestead_explicit_clear` telemetry to
    the Place / Clear callbacks.

**Verification.** `tsc --noEmit -p apps/web` — no new errors from these
files; the remaining errors are confined to an unrelated untracked
`__tests__/fieldRemovers.test.ts` fixture. Preview smoke deferred —
recommended manual check: explicit Place/Clear flips the
Permaculture-zone tile and emits `source: 'explicit'`; a parcel with no
explicit homestead and exactly one existing residence enables the tile
with `source: 'derived'` and renders **no** HomesteadMarker; a parcel
with multiple residences keeps the tile disabled.
