# D4 — Field Execution & Proof Design

**Date:** 2026-05-19
**Sub-project:** D4 (Field execution & proof), 4th slice of Sub-project D
per the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]).
**Status:** design approved (4 binding forks + Approach A); spec pending
user review before the implementation-plan step.
**Builds on:** the single-writer `WorkItem` spine and the D1/D2/D3
provenance + pure-engine + hard-gate-test discipline
([[2026-05-18-d2-resourcing-design]],
[[2026-05-18-d3-budget-cost-tracking-design]]). Consumes the D0
proof-edge infrastructure (5 immutable append-only domain event-log
stores, each carrying an optional `workItemId?` back-link — schema
comment: "D4 surfaces the proof; D0 only stores the edge").

## Goal

Close the plan→field loop on the canonical WorkItem spine: let a
steward record that a planned work item was actually executed in the
field, link it to immutable D0 domain-event evidence (or a generic
fallback when no typed event class fits), and surface a per-project
proof board (Proven / Claimed / Open) plus render-only "this recent
event probably fulfils that item" suggestions that only ever write on
explicit steward confirmation. Success = a steward can walk an
Apricot-Lane-complexity build's plan and see, per item, whether it is
proven-in-field with evidence — with zero new persistence migrations,
zero silent spine-status mutation, and zero covenant drift.

## Covenant boundary (non-negotiable)

Strictly **operational field execution & proof tracking only**.
Explicitly out of D4: D5 dashboards / adaptive recommendations /
analytics; any riba / gharar / CSRA (struck 2026-05-04 on *bayʿ mā
laysa ʿindak* grounds) / salam / investor / equity / financing /
yield-as-return framing — those stay in Scholar-gated Sub-project C and
are rejected back to C, never patched into a D surface. No DB
migration. Legacy surfaces are retired-not-deleted (no-deletion-in-
revamps covenant). **No silent spine-status auto-mutation**: the
single-writer spine is honoured — engine output is render-only;
suggestions never write; the only status write is an explicit
steward-confirmed `fulfilWorkItem` action. This boundary is asserted by
a test: a no-financing-token negative regex
(`/interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i`)
over `JSON.stringify(analyzeFieldProof(...))`, plus a
no-`status`-mutation invariant over the pure engine (mirrors
`budgetVariance.test.ts`).

## The four binding decisions (user-confirmed forks)

1. **Proof model — typed event + generic fallback.** When a typed D0
   domain-event class fits the item's intervention/source, fulfilment
   links a real typed event; otherwise a generic `ProofEvent` fallback
   record carries the proof. Both stamp `workItemId`.
2. **Evidence — structured + optional photo ref.** Proof carries
   structured fields (who, actual start/end, notes) plus an *optional*
   `evidence` object holding a `photoRef` string (+ optional `geo`
   tuple). No binary upload, no file handling (out of scope / no new
   infra).
3. **Surface — extend `PlanExecutionTrackerCard` in place.** No new
   manifest entry. Because that card is ~1078 lines, the new surface is
   a well-bounded child component `FieldProofPanel.tsx` that the
   tracker card imports and mounts — the card stays the owning Act
   surface; the panel is independently understandable/testable.
4. **Fulfilment — manual capture + render-only suggestion.** Steward
   manually captures fulfilment; the engine additionally computes
   render-only "recent event likely fulfils this item" suggestions, but
   a suggestion **never** writes — it only pre-fills the capture editor
   on an explicit Confirm click (mirrors the only existing precedent,
   `RotationScheduleCard`'s 7-day matcher, but made explicit-confirm
   rather than auto-stamp).

## Architecture

Mirrors the D1/D2/D3 spine discipline exactly: pure unit-tested engine
in `@ogden/shared/lib/` → thin single-writer `workItemStore` action →
`@ogden/shared` schema (additive, `.optional()` + `.passthrough()`, no
migration) → projectId-tagged store (syncManifest-registered) → Act
child surface → hard-gate tests.

### 1. Pure engine — `packages/shared/src/lib/fieldProof.ts` (new)

No React, no store imports. Exports:

- `type ProofState = 'proven' | 'claimed' | 'open'` — **proven** =
  `status === 'done'` AND at least one linked proof event id;
  **claimed** = `status === 'done'` with no linked event; **open** =
  not done.
- `routeProofTarget(source): 'maintenance' | 'livestock-move' |
  'nursery' | 'generic'` — maps a WorkItem source/intervention class to
  the typed D0 store that should carry its proof, else `'generic'`.
  **Harvest is deliberately NOT in the routing table** — a WorkItem is
  a planned task, not "a harvest"; harvest entries remain their own D0
  domain log and are not auto-treated as task proof.
- `classifyProof(item, linkedEventIds): ProofState` — pure, reads only
  `item.status` + the supplied linked-id set; never mutates.
- `suggestProofMatches(items, domainEvents, windowDays = 7):
  Suggestion[]` — render-only. For each not-done item, finds recent
  domain events of the routed class within `windowDays` of the item's
  scheduled window; returns `{ itemId, eventId, store, daysApart }`
  candidates. **Pure, no write, no store access** — the caller decides.
- `analyzeFieldProof(items, linkedEventsByItemId, domainEvents,
  windowDays?) → { byItemId: Map<id, ProofState>, suggestions:
  Suggestion[], counts: { proven; claimed; open } }`. Derived only;
  never reads/writes `WorkItem.status`. Exported from `@ogden/shared`.

### 2. Schema — `packages/shared/src/schemas/proofEvent.schema.ts` (new)

`ProofEventSchema = z.object({ id, projectId, workItemId, actorWho?,
actualStart?, actualEnd?, notes?, evidence?: z.object({ photoRef:
z.string(), geo?: z.tuple([z.number(), z.number()]) }), createdAt
}).passthrough()`. The generic fallback proof record (used when
`routeProofTarget` returns `'generic'`). Exported from `@ogden/shared`.
No change to `workItem.schema.ts` is required for the link — the back-
link lives on the event side (`workItemId`), exactly as the 5 D0
domain-event schemas already do; the spine's existing
`status`/`doneAt`/`actualStart`/`actualEnd` + `.passthrough()` carry
the fulfilment state with **no migration, no literal-site churn**.

### 3. Store — `apps/web/src/store/proofEventStore.ts` (new)

Zustand+persist `ogden-work-item-proof` (version 1, projectId-tagged,
no migrate, `partialize → { events }`). `addProofEvent`,
`updateProofEvent`, `removeProofEvent`,
`getProjectProofEvents(projectId)`. Steward-authored — **no Goal-
Compass preservation contract**. Orphans-by-design: an event is
immutable-by-intent and survives `unfulfilWorkItem` (audit trail).
Registered in `syncManifest.ts` as `blob('ogden-work-item-proof',
useProofEventStore, 'projectId-tagged', 1, tagged('events'))`
(coverage-guard clean).

### 4. Single-writer completion action — `apps/web/src/store/workItemStore.ts` (modified)

- `fulfilWorkItem(id, { who?, actualStart?, actualEnd?, notes?,
  evidence? })` — the **sole** spine-status completion writer for the
  field-proof path. Stamps `actualStart` / `actualEnd` / `doneAt` /
  `status: 'done'` / `who` on the WorkItem; routes via
  `routeProofTarget(item.source)`: if a typed D0 store, calls that
  store's existing `add*` then its `update*` to stamp
  `workItemId` on the new event (mirrors `RotationScheduleCard`'s
  stamp pattern, the only existing precedent); else writes a
  `ProofEvent` fallback with `workItemId` set. Idempotent — re-fulfil
  of an already-proven item is a no-op short-circuit returning the same
  state reference.
- `unfulfilWorkItem(id)` — reverses the spine fields (status back to
  prior/`todo`, clears `doneAt`/`actualStart`/`actualEnd`) but **keeps
  the immutable proof event** (orphan-by-design audit trail; matches
  the D3 actuals orphan precedent).

No new `*Auto` provenance field is needed (Goal Compass never authors
field proof — proof is wholly steward/field-originated).

### 5. Surface — `apps/web/src/features/act/FieldProofPanel.tsx` (new child)

Imported and mounted by `PlanExecutionTrackerCard.tsx` (the existing
`act-plan-tracker` manifest entry is reused — **no new manifest
entry**, decision 3). One `useMemo` over project `WorkItem`s + linked
proof events + D0 domain events → `analyzeFieldProof`. Blocks:

- **Proof board** — per item: Proven / Claimed / Open badge
  (render-only, from the engine), evidence summary (who / dates / note
  / photoRef) when present.
- **Capture editor** — explicit fulfil: who, actual start/end, notes,
  optional photoRef/geo → `fulfilWorkItem`; an explicit un-fulfil
  control → `unfulfilWorkItem`.
- **Suggestions** — render-only list from `suggestProofMatches`; each
  row has an explicit **Confirm** button that pre-fills + submits the
  capture editor (never auto-writes). Same density/tokens
  (`stageCard.module.css`) as the existing tracker blocks.

`PlanExecutionTrackerCard.tsx` change is minimal: import the panel and
render it as an additional section — no behavioural change to the
existing phase/layer/timeline group modes.

### 6. Retire-not-delete

No surface is superseded by D4 (it is purely additive — a new panel on
an existing card). `RotationScheduleCard`'s 7-day auto-stamp matcher is
left **untouched and un-deprecated** (it is a distinct rotation-domain
feature, not the generic plan-proof path); D4 does not consume or
modify it — the explicit-confirm `FieldProofPanel` suggestion flow is a
parallel, covenant-stricter mechanism, documented as such in the ADR so
the divergence is intentional and recorded.

## Targeted hardening (test list)

Mirrors the D2/D3 hard-gate pattern:

1. `fieldProof.test.ts` (`@ogden/shared`) — `classifyProof`
   proven/claimed/open boundary (done+event / done+no-event / not-done);
   `routeProofTarget` typed-class mapping + `'generic'` fallback +
   **harvest-excluded** assertion; `suggestProofMatches` in-window vs
   out-of-window, missing-date skip, render-only (returns candidates,
   asserts no mutation of inputs); `analyzeFieldProof` counts rollup;
   no-`WorkItem.status`-mutation invariant
   (`expect(JSON.stringify(out)).not.toMatch(/status/i)` on engine
   output); **covenant no-financing-token negative regex**.
2. `proofEventStore.test.ts` (web) — add/update/remove keyed by
   projectId, per-project isolation, `workItemId` stamped.
3. `workItemStore.fulfil.test.ts` (web) — `fulfilWorkItem` stamps
   spine fields + creates/stamps the routed event; idempotence hard
   gate (re-fulfil = same reference, no duplicate event);
   `unfulfilWorkItem` reverses spine but **keeps** the event
   (orphan-by-design); typed-route vs generic-fallback both covered.

## Verification

- `packages/shared` tsc exit 0, clean.
- `apps/web` whole-project tsc with
  `$env:NODE_OPTIONS='--max-old-space-size=8192'` — green = no NEW
  error vs pre-D4 baseline (pre-existing out-of-band debt is not a D4
  regression).
- Three suites green: `fieldProof`, `proofEventStore`,
  `workItemStore.fulfil`; full `@ogden/shared` + web vitest with zero
  NEW failures (the previously-disclosed pre-existing failures, if any,
  are not D4-introduced).
- `vite build` ok (expect default-heap OOM → rerun with
  `--max-old-space-size=8192`; environment, not code).
- Covenant audit: forbidden-lexicon grep over engine + `FieldProofPanel`
  rendered surface — zero matches outside the negative-assertion test.
- `FieldProofPanel` is plain React deep behind the Act module slide-up;
  tsc + the suites are the authoritative gate. Live screenshot
  disclosed-blocked if the MapLibre/WebGL hang recurs (screenshot-
  honesty rule; D1/D2/D3 precedent) — routing/import wiring then
  verified statically by grep.

## Commit posture

Explicit-path staging **only** — never `git add -A`/`.`. The working
tree carries heavy concurrent out-of-band D0 streams; each D4 file is
staged by exact path, per-file diff inspected for D4 scope. D3 remains
uncommitted pending its own explicit instruction and is **not** swept
into a D4 commit. `wiki/index.md`/`wiki/log.md` D0-owned dirtiness is
left to the D0 owner; the D4 session-close touches only the standalone
D4 ADR + a `wiki/log.md` prepend (D2/D3 ADR precedent). Branch
divergence checked (fetch + `git rev-list --left-right --count
HEAD...@{u}`) before any push; **no push without explicit request**;
no force-push.

## Scope / risk boundary

- **Covenant (highest):** any financing/investor/yield-as-return/CSRA/
  salam field or framing is out — rejected to Scholar-gated Sub-project
  C, never patched into D. Enforced by the engine no-financing-token
  regex + a release-gate covenant grep over engine + panel output.
- **Single-writer honoured:** the engine is render-only; suggestions
  never write; the only `status` write is the explicit steward-
  confirmed `fulfilWorkItem`. No-`status`-mutation invariant pins the
  engine.
- **Additive only:** new isolated `ogden-work-item-proof` slice (no
  migrate); proof link lives on the event side (`workItemId`), so the
  spine schema is **unchanged** ⇒ no DB migration, no literal-site
  churn; manifest unchanged (panel rides the existing tracker entry);
  registration append-only.
- **Precedent-mirrored:** `fulfilWorkItem`'s event-stamp follows
  `RotationScheduleCard`'s proven `updateEvent(..., { workItemId })`
  pattern 1:1; no parallel logic that could drift.
- **Retire-not-delete:** nothing superseded; `RotationScheduleCard`
  left untouched, its divergence from the explicit-confirm path
  documented intentionally in the ADR.
- **No-clobber:** D4 coexists with concurrent out-of-band D0 streams
  and the uncommitted D3 tree; strict explicit-path staging mandatory;
  D3 not swept into D4.
