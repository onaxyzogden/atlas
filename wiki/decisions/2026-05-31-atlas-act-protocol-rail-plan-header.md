# ADR: Act left-rail Objectives/Protocols toggle + Plan header project-type label

**Date:** 2026-05-31
**Branch:** `feat/atlas-permaculture`
**Commits:** `2f665b74` (Phase 1) · `15d797c1` (Phase 2)
**Status:** Shipped · not pushed

---

## Context

Two follow-on surface asks raised while the steward had the `PlanStratumShell`
left-rail header selected in the live OLOS spine:

1. **Plan header** — project type used to appear in the left-rail header; bring
   it back. Steward decision: **project type only** (no cycle number; cycle may
   make more sense per-stratum but is deferred).

2. **Act left rail** — the Act screen needs a way to view protocols, with an
   indicator when a protocol has been triggered and needs attention. Steward
   decision: **toggle + aggregate badge** (a Design/Protocol-style segmented
   control in the left-rail header; amber dot + count badge on the Protocols
   segment whenever any protocol is triggered; works with existing store data,
   no per-objective-card linkage required).

---

## Decisions

### Phase 1 — Plan header project-type label

**New file:** `apps/web/src/v3/plan/strata/planHeaderLabel.ts`

Pure helper extracted for testability (the full `PlanStratumShell` component
pulls in the router + Zustand stores, making a full-render harness fragile):

```ts
export function planHeaderProjectTypeLabel(
  primaryTypeId: ProjectTypeId | null,
  secondaryCount: number,
): string | null
```

Returns `null` when `primaryTypeId` is absent. Otherwise maps via
`findProjectType(primaryTypeId)?.label` and appends `· +N` when secondaries
are present. Renders as a small secondary-text eyebrow line in the
`PlanStratumShell` header JSX (`data-testid="plan-header-project-type"`),
styled with the existing spine `C`/`F` token palette.

**Data limitation disclosed:** no fully-seeded live project (MTC, Phase 4
Smoke, Three Streams, Apricot Lane) has a populated
`metadata.projectTypeRecord` — they carry only the legacy flat `projectType`
field. The absent-when-null path was confirmed live; the populated-label path
is unit-proven (4/4 tests pass).

**Tests:** `apps/web/src/v3/plan/strata/__tests__/planHeaderLabel.test.ts`
(null when no primary; known type labels; `· +N` suffix; no suffix at zero).

### Phase 2 — Act left-rail Objectives/Protocols toggle + attention badge

**New file:** `apps/web/src/v3/act/tier-shell/ActRailModeToggle.tsx`

Two-segment radiogroup ("Objectives" / "Protocols") with a local
`RailMode = 'objectives' | 'protocols'` type. Props:
`{ mode, onChange, attentionCount }`. When `attentionCount > 0`, an amber
pill badge (`data-testid="act-rail-protocol-badge"`, `--color-gold-brand`)
appears on the Protocols segment. Styled via new CSS classes in
`ActTierShell.module.css` using the Act shell's `--color-*` palette
(NOT the spine hard-coded palette).

**Modified:** `apps/web/src/v3/act/tier-shell/ActTierObjectiveRail.tsx`

Extended `Props` with `mode`, `onModeChange`, `triggeredCount`,
`projectId`, `primaryTypeId: ProjectTypeId | null`,
`secondaryTypeIds: readonly ProjectTypeId[]`. Renders the toggle at the top
of `.railPanel`; in `mode === 'protocols'` mounts `ProtocolLayerPanel`
(reused from `plan/strata/`, not forked) in a `flex:1; min-height:0`
wrapper so it fills and scrolls correctly; in `mode === 'objectives'`
renders the existing `.railHeader` + objective list unchanged.

**Modified:** `apps/web/src/v3/act/tier-shell/ActTierShell.tsx`

Added `useState<RailMode>('objectives')` local state; derives
`primaryTypeId` / `secondaryTypeIds` from
`project.metadata?.projectTypeRecord` (same pattern as Plan); passes all
six new props to `<ActTierObjectiveRail>`. `triggeredCount` was already
computed via `useTriggeredProtocols(id).length`.

**CSS:** new classes in `ActTierShell.module.css`:
- `.railModeBar` — padding wrapper above the rail body
- `.railToggle` / `.railToggleBtn` / `.railToggleBadge` — segmented control
  styled with `--color-*` vars; active segment uses
  `color-mix(in srgb, --color-gold-brand 16%, transparent)`;
  badge is an amber pill `background:var(--color-gold-brand)` / dark text
- `.railProtocolBody` — `flex:1; min-height:0; display:flex` so
  `ProtocolLayerPanel` (which is `height:100%` + its own scroll) fills the
  remaining rail space

**Tests:**
- `ActRailModeToggle.test.tsx` — 5 tests (both segments render; onChange
  fires with chosen mode; badge hidden at 0; shows count when >0;
  aria-checked marks active). All pass.
- `ActTierObjectiveRail.test.tsx` — 2 tests (objectives mode: toggle +
  objective title + no panel; protocols mode: toggle + protocol-layer-panel
  testid + objective title absent). All pass.

---

## Verification

- **tsc:** web `tsc --noEmit` (`--max-old-space-size=8192`) exit 0 for
  both phases.
- **Tests:** 31/31 tier-shell tests green; 4/4 planHeaderLabel tests green.
- **Act DOM (live):** navigated to `/v3/project/mtc/act/tier-shell` — toggle
  renders (Objectives active default); no badge (no triggered protocols on
  MTC); clicking Protocols mounts `ProtocolLayerPanel` ("Protocol Layer / 0
  templates" empty state, correct for null-type MTC); clicking back to
  Objectives hides the panel and restores objective cards. Round-trip
  confirmed via DOM exercise.
- **Plan DOM (partial):** absent-when-null confirmed live. Populated-label
  path unit-proven only (dev-data limitation; no fully-seeded project has
  `projectTypeRecord` populated today).
- `preview_screenshot` unavailable on this Windows setup (hung); verified
  via `preview_eval`/`preview_snapshot`.

---

## Out of scope (deferred)

- Cycle number in the Plan header (steward deferred; revisit as per-stratum).
- Per-objective-card protocol indicator (needs `objectiveId` on protocol
  records/templates — data linkage not present today).
- Persisting Act rail mode to URL/store (local component state only).
- Populating `projectTypeRecord` on existing projects so the Plan label
  renders live.

---

## Constraints respected

- Spine prototype files (`spine/ModeToggle.tsx` etc.) import-only, never
  edited.
- `ProtocolLayerPanel` reused, not forked.
- Foreign WIP in the working tree staged in neither commit.
- Branch 0 behind before each commit.
- CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
- ASCII-only copy.

Entity: [[entities/act-tier-shell]].
Log: [[log/2026-05-31-act-protocol-rail-plan-header]].
