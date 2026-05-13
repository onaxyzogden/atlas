# 2026-05-13 — Atlas Plan · Needs & Yields design-status gate (Rec #1 closeout)

**Status.** Decided · shipped on `feat/atlas-permaculture`.

**Driver.** Permaculture-alignment Rec #1 (P0; Holmgren P6 *Produce no
waste* + P8 *Integrate rather than segregate*). The 2026-04-28 ADR
[`2026-04-28-needs-yields-dependency-graph.md`](2026-04-28-needs-yields-dependency-graph.md)
specified both a data model and a workflow: every catalog `outputs`
resource on a biological / structural element must be routed to
another element's `inputs`, and a project's design status cannot
advance from `draft` to `ready-for-review` until that's satisfied
(or the steward deliberately opts out via a project-level escape
hatch). The data model + audit card v2 + integration scoring all
shipped earlier today; the four remaining slices — the *enforcement*
and *authoring-flow* layers — landed in this session.

## Decision

One pure validator + two `ProjectMetadata` fields drive four UI
surfaces. Stewards see the gate the same way through every entry
point.

### Shared (`packages/shared/`)

- `ProjectMetadata` gains
  - `designStatus?: 'draft' | 'ready-for-review' | 'approved'`
    (default resolved by accessor → `draft`)
  - `allowOrphanOutputs?: boolean` (default `false`)
- New `relationships/statusGate.ts` exports a single pure validator:

  ```ts
  canAdvanceToReadyForReview(edges, entities, allowOrphanOutputs)
    => { ok, orphanCount, unmetCount, reason? }
  ```

  Returns `ok: true` immediately when `allowOrphanOutputs` is `true`
  or `orphanCount === 0`. Reuses `orphanOutputs` / `unmetInputs` from
  `cycle.ts`. Re-exported from `relationships/index.ts`.

- `tests/statusGate.test.ts` — 4 specs (vacuous-allow,
  blocked-by-orphans, override-on, fully-routed). 4/4 pass.

### App (`apps/web/`)

- `store/projectStore.ts` — `DesignStatus` type + `DEFAULT_DESIGN_STATUS`
  + `getDesignStatus(p)` + `getAllowOrphanOutputs(p)`. Both mirror the
  existing `getZoneThresholds` / `getDesignHorizon` accessor pattern.
  Writes go through `updateProject(id, { metadata: { ... } })` — no
  new store method.
- `v3/plan/canvas/relationshipsArmedStore.ts` — ephemeral Zustand
  atom `{ armed, arm, disarm, toggle }`, mirroring
  `useTemporalScrubStore` / `useStampModeStore`. Resets on reload;
  visual-editor mode is a session affordance.
- `features/map/RelationshipsOverlay.tsx` &
  `features/map/RelationshipsRail.tsx` — the bare `FLAGS.RELATIONSHIPS`
  early-returns become `FLAGS.RELATIONSHIPS || armed`. Existing
  flag-gated path is preserved.
- `v3/plan/cards/principle-verification/NeedsYieldsAuditCard.tsx` —
  header gains a status row: `[Status: draft] [Allow orphan
  outputs ☐] [Mark ready for review →]`. CTA disabled with tooltip
  when validator fails; the checkbox writes
  `metadata.allowOrphanOutputs`. The existing "Open map editor →"
  button is renamed to "Open visual editor →" and now arms
  `useRelationshipsArmedStore` *in addition to* calling
  `onSwitchToMap()`.
- `v3/plan/header/DesignStatusChip.tsx` — top-left canvas chip tinted
  by status (draft neutral, ready-for-review estate-gold, approved
  verdant-green). When `allowOrphanOutputs === true` it appends a
  fired-clay `⚠ Orphans allowed` badge — the ADR requires the
  override be a deliberate, surfaced choice. Click opens the audit
  module. Mounted in `PlanLayout.tsx`.
- `v3/plan/PlanModuleSlideUp.tsx` — confirm-on-close intercept. When
  `module === 'principle-verification'`,
  `getAllowOrphanOutputs(project) === false`, and `orphanOutputs(...)`
  > 0, `onClose` is wrapped: an inline `role="dialog"` modal asks
  *"N unrouted outputs. Close anyway, or stay and route them?"*.
  Re-uses the same `orphanOutputs` reader as the audit card so the
  numbers cannot drift.

## Why one validator, not four

The pre-existing audit card already counted orphans; the temptation
was to leave that score-only and bolt CTA logic on top. Instead the
status check is its own pure function so every surface — audit card
header, project-header chip, the future bookmarklet/CLI hook, the
confirm-on-close intercept — answers the same question the same way.
The validator is the kind of code the ADR-approval pipeline (sprint 3
server-side gate) will run unchanged.

## Why an armed atom, not a flag flip

`FLAGS.RELATIONSHIPS` predates the audit narrative and gates visual
edge-authoring behind a build-time switch the steward cannot reach.
Flipping the flag for everyone in this slice was rejected — the
existing flag-gated UX hasn't had a Plan-stage polish pass yet, and
forcing it on top-level would surface unpolished sockets to every
project. An ephemeral armed atom keeps the flag's "on" branch intact
and lets the audit card opt into the visual editor for the duration
of a session ("`FLAGS.RELATIONSHIPS || armed`"). When sockets graduate
to default-on the flag flip is a one-line deletion.

## Why confirm-on-close, not block-on-close

Stewards have legitimate reasons to leave the audit unfinished — they
may need to consult Plant Systems or Livestock first. A hard block
trains them to set `allowOrphanOutputs = true` permanently as a
side-effect of trying to leave the panel; that defeats the gate. A
single confirm dialog raises the cost just enough to be deliberate
and is dismissed automatically once orphans hit zero.

## Out of scope (recap)

- `'approved'` transition gate — separate review workflow. Enum
  value reserved.
- Per-zone `designStatus` — per-project only, per ADR.
- Server-side enforcement — sprint 3 backend item.
- Visual edge-authoring UX polish (sockets, hover affordance) — uses
  the 2026-04-28 component as-is.
- Bookmarklet / CLI hooks for the validator.

## Verification

1. `cd packages/shared && npx vitest run src/tests/statusGate` — 4/4 pass.
2. `cd apps/web && npx tsc --noEmit -p .` — passes (existing
   `DesignElementLayers.tsx:468` `Geometry/MultiPoint→Point` error
   remains; unchanged from pre-session).
3. Dev-server smoke (manual): chip in canvas top-strip reads
   `Status · Draft`; opening the audit card surfaces the new
   row; ticking `Allow orphan outputs` enables the CTA and gains
   the `⚠ Orphans allowed` badge in the canvas chip; closing the
   audit card with orphans triggers the confirm dialog; closing
   with `allowOrphanOutputs = true` does not.

## Files

- `packages/shared/src/schemas/project.schema.ts`
- `packages/shared/src/relationships/statusGate.ts` *(new)*
- `packages/shared/src/relationships/index.ts`
- `packages/shared/src/tests/statusGate.test.ts` *(new)*
- `apps/web/src/store/projectStore.ts`
- `apps/web/src/v3/plan/canvas/relationshipsArmedStore.ts` *(new)*
- `apps/web/src/features/map/RelationshipsOverlay.tsx`
- `apps/web/src/features/map/RelationshipsRail.tsx`
- `apps/web/src/v3/plan/cards/principle-verification/NeedsYieldsAuditCard.tsx`
- `apps/web/src/v3/plan/header/DesignStatusChip.tsx` *(new)*
- `apps/web/src/v3/plan/PlanLayout.tsx`
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx`
