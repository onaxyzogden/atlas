> **⚠️ SUPERSEDED — 2026-05-19.** This spec was authored by a parallel
> session and is **not** the authoritative D4 design. It made unilateral
> calls (new dedicated `act-field-proof` card; no D0 typed-event
> linking) that conflict with the four design forks the operator
> explicitly confirmed in the originating session. The authoritative D4
> design is **[[2026-05-19-d4-field-proof-design]]**
> (`docs/superpowers/specs/2026-05-19-d4-field-proof-design.md`).
> Preserved un-deleted for audit per the no-deletion-in-revamps
> covenant. Do not implement from this document.

# D4 — Field Execution & Proof Design  *(SUPERSEDED)*

**Date:** 2026-05-19
**Sub-project:** D4 (Field execution & proof), 4th slice of Sub-project D
per the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]).
**Status:** design approved; forward-looking spec (D4 is net-new, not yet
implemented — unlike the retroactive D2/D3 specs).

## Goal

Capture evidence that planned work was actually executed in the field.
D0–D3 deliver boolean done-status (D0), critical-path/blocked (D1),
resourcing (D2), and budget/cost (D3) — but nothing records *what
actually happened on the ground*. D4 adds the proof layer: per-WorkItem
actual execution dates, field-notes, photo references, and a steward
sign-off, surfaced for review and at-a-glance status. Success = a
steward can prove an Apricot-Lane-complexity build's work was executed,
with no external tool, no DB migration, and no covenant drift.

## Covenant boundary (non-negotiable)

Purely **operational execution documentation**. D4 has no cost,
budget, financing, capital, investor, yield, riba, gharar, salam, or
advance-purchase surface or framing at all — it is the most clearly
non-covenant D slice. The D3-inherited boundary still applies verbatim
("capital formation, financing, advance-purchase, investor/equity, and
yield-as-return framing stay in Sub-project C under Scholar Council").
Asserted by a test: the engine module pins a no-financing-token
negative regex
(`/interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i`),
consistent with the D1–D3 precedent. Proof status / schedule variance
are derived at render only — **never** written to `WorkItem.status`
(single-writer-spine discipline).

## Spine-writer discipline (the one expansion)

D4 becomes the **single writer** of the two long-existing but
never-written spine fields `WorkItem.actualStart` / `actualEnd`. This
is a deliberate, bounded single-writer-discipline expansion (decided by
the operator): exactly one new action owns exactly these two fields.
No other writer touches them; D4 never writes `status`, `costUSD`,
`costRangeAuto`, or any `*Auto`/dependency/resource field. Every
`replaceGoalCompass*` path (`Dependencies`/`Resources`/`Costs`) was
verified to never read or write `actualStart`/`actualEnd`, so
Goal-Compass regeneration cannot clobber field-authored actual dates;
no preservation contract is required for them.

## Architecture

Mirrors the D2/D3 spine discipline. Provenance is not split here
(actuals are wholly field-authored, no auto seed) — closer to D3's
steward-only actuals than D1/D2's Approach-B seam.

### 1. Schema — `packages/shared`

- `schemas/fieldProof.schema.ts` (new). `PhotoRefSchema = z.object({
  url: z.string(), caption: z.string().optional() })` — **reference
  only, no binary**. `FieldProofSchema`: `id`, `workItemId`,
  `projectId`, `recordedAt` (ISO), `actualStart?`/`actualEnd?`
  (nullable ISO), `fieldNotes?` (string), `photos:
  z.array(PhotoRefSchema).default([])`, `signedOff: z.boolean()`,
  `signedOffBy?`, `signedOffAt?`, `.passthrough()`. Inferred
  `FieldProof`/`PhotoRef` types exported.
- `schemas/workItem.schema.ts` — **no change**: `actualStart`/
  `actualEnd` already exist (nullable ISO). D4 only adds a *writer*,
  not a field.
- `index.ts` — exports `./schemas/fieldProof.schema.js` and
  `./lib/fieldProofAnalysis.js`.

### 2. Pure engine — `packages/shared/src/lib/fieldProofAnalysis.ts` (new)

No React, no store imports. `proofStatus(item, proof | undefined)` →
`'unproven' | 'partial' | 'proven'` (`proven` = `signedOff === true`
&& both actual dates present; `partial` = any proof artefact present
but not signed-off; else `unproven`). `scheduleVariance(item)` →
`{ startDeltaDays, endDeltaDays } | null` from spine `scheduledStart/
End` vs `actualStart/End` (render-only; positive = late). Defensive on
missing dates; never reads/writes `WorkItem.status`. Covenant
no-financing-token test pinned here.

### 3. Proof store — `apps/web/src/store/fieldProofStore.ts` (new)

Zustand+persist `ogden-field-proof` (version 1, projectId-tagged, no
migrate — collision-verified against all keys in `syncManifest.ts`).
State shape mirrors `workItemBudgetStore` exactly (same
projectId-tagged structure and `getProject*` selector convention) so
the two steward-authored Act stores stay structurally identical.
Actions: `upsertProof` (keyed by
projectId+workItemId, bumps `recordedAt`), `removeProof`,
`getProjectProofs`. **Steward-authored only — no `replaceGoalCompass*`
preservation contract** (mirrors D3 budget actuals). Orphans-by-design
(no cascade-delete; orphan = proof whose `workItemId` no longer
resolves). Registered in `syncManifest.ts` as
`blob('ogden-field-proof', useFieldProofStore, 'projectId-tagged', 1,
tagged('proofs'))`.

### 4. Spine actuals writer — `apps/web/src/store/workItemStore.ts`

New action `setActualDates(projectId, workItemId, { actualStart,
actualEnd })` — the **sole** writer of `WorkItem.actualStart/End`.
Idempotent same-value short-circuit (returns same reference, no
`updatedAt` churn). Writes only on the matching project+item; never
touches `status`, `costUSD`, any `*Auto`/dependency/resource field, or
other projects/items. A hard-gate unit test pins this exact contract.

### 5. Surfaces — two touch-points

- `apps/web/src/features/act/FieldProofCard.tsx` (new). Own
  `act-field-proof` manifest entry, lazy-registered across the same
  six mount points D3's `act-budget` uses (`v3/act/types.ts`,
  `ActModuleSlideUp.tsx`, `DashboardRouter.tsx`, `ActHub.tsx`,
  `navigation/taxonomy.ts`, `stage-navigator/stageModules.ts`).
  Blocks: per-WorkItem proof capture (actual start/end pickers,
  field-notes, add/remove photo-ref rows, sign-off toggle writing
  through `upsertProof` + `setActualDates`); review list with
  `proofStatus` + `scheduleVariance`; orphan-proof audit section
  (explicit remove, no cascade).
- Render-only proof badge on `PlanExecutionTrackerCard.tsx` —
  `unproven`/`partial`/`proven` pill per row, pure read via
  `proofStatus`, **zero writes**. *Coordination:* this file is
  actively modified out-of-band by the concurrent D2.1 stream; the
  badge is a minimal additive read-only insert. The implementation
  plan must fetch + re-check divergence immediately before touching
  it and keep the diff tightly scoped (no-clobber).

### 6. Registration

Append-only, mirroring D3 exactly: one new `act-field-proof` entry per
the six mount points; one new `blob(...)` line in `syncManifest.ts`.
No `PlanModule`/union change, no exhaustive-switch contract (verified
the Act manifest is an open list, as confirmed for D3).

## Testing (TDD, as-built target)

1. `fieldProofAnalysis.test.ts` — `proofStatus`
   unproven/partial/proven boundaries (signed-off-but-no-dates =
   partial; both-dates-no-signoff = partial; both = proven);
   `scheduleVariance` early/on-time/late + missing-date null;
   no-`status`-mutation invariant; covenant no-financing regex.
2. `fieldProofStore.test.ts` (`// @vitest-environment happy-dom`) —
   upsert keyed by workItemId (idempotent overwrite), remove,
   per-project isolation, orphan retention.
3. `workItemStore.actualDates.test.ts` — single-writer hard gate:
   sets only `actualStart/End`; idempotent no-op; never mutates
   `status`/`costUSD`/`*Auto`/other project/item.
4. `FieldProofCard.test.tsx` (happy-dom) — mounts; capture writes a
   proof + actual dates; the three badge states render; no cost/
   currency string anywhere (covenant at the UI layer, mirroring the
   D2 `ResourcingCard` precedent).

## Verification

- `packages/shared` tsc exit 0, clean.
- `apps/web` whole-project tsc with
  `$env:NODE_OPTIONS='--max-old-space-size=8192'` — green = no NEW
  error vs the pre-D4 baseline (pre-existing out-of-band debt is not a
  D4 regression).
- Four suites green: `fieldProofAnalysis`, `fieldProofStore`,
  `workItemStore.actualDates`, `FieldProofCard`.
- Covenant grep over engine + `FieldProofCard` rendered surface — zero
  financing/capital tokens.
- `FieldProofCard` is plain React deep behind the Act module slide-up
  — tsc + suites are the authoritative gate. No browser screenshot
  claimed if the surface cannot be reached (screenshot-honesty rule;
  MapLibre/WebGL hang precedent from D1–D3).

## Commit posture

Explicit-path staging **only** — never `git add -A`/`.`. The working
tree carries the live concurrent D2.1 out-of-band stream (and others);
each D4 file staged by exact path, per-file diff inspected for D4
scope. `PlanExecutionTrackerCard.tsx` is shared with the D2.1 stream —
fetch + `git rev-list --left-right --count HEAD...@{u}` immediately
before touching it; if its diff mixes D4 and non-D4 hunks, surface as
a blocker (no silent hunk-split). `wiki/index.md`/`wiki/log.md` may be
dirty with other streams — the D4 session-close ADR is a standalone
commit, leaving `wiki/index.md` for its owner if dirty (mirrors the
D2/D3/B3 precedent). No force-push; push only if fast-forward.

## Scope / risk boundary

- **Single-writer expansion (highest):** D4 newly writes spine
  `actualStart/End`. Mitigation: exactly one action owns exactly two
  fields; hard-gate test pins it; verified outside every
  `replaceGoalCompass*` path so regeneration cannot clobber.
- **Covenant:** no cost/financing surface in D4 at all; engine +
  UI no-finance tests + release-gate grep.
- **Additive only:** new isolated `ogden-field-proof` slice (no
  migrate); new schema fields `.optional()`/`.default([])` +
  `.passthrough()` ⇒ no DB migration; registration append-only; no
  `WorkItem.status` auto-mutation.
- **No-clobber:** D4 coexists with the live D2.1 stream;
  `PlanExecutionTrackerCard.tsx` is the shared hot file — strict
  explicit-path staging + pre-touch divergence re-check mandatory.
- **Photo storage deliberately out:** references/URLs only; no
  binary/base64/IndexedDB persistence (explicit YAGNI — avoids
  localStorage size pressure and a new binary-persistence concern).
