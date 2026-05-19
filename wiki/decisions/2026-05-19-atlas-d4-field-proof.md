# 2026-05-19 — D4: field-execution proof on the WorkItem spine

**Status:** Implemented & verified (typecheck / vitest / `vite build`);
committed as **six explicit-path commits** on `feat/atlas-permaculture`
(five `feat(d4)` per-task + this `docs(d4)` close), **not pushed**
(branch rebased out-of-band; push is a separate explicit instruction).
Live-preview screenshot verification disclosed-blocked by the known
MapLibre/WebGL hang — surface wiring verified statically instead.
**Context source:** Approved Session Execution Plan for Sub-project D4
([[plans/2026-05-19-d4-field-proof]]), executing the ratified D0–D5
roadmap ([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]) against
the authoritative spec
[[specs/2026-05-19-d4-field-proof-design]]. Builds on the single-writer
spine and mirrors the D1/D2/D3 provenance seam
([[2026-05-18-atlas-d1-dependency-critical-path]],
[[2026-05-18-atlas-d2-resourcing]],
[[2026-05-18-atlas-d3-budget-cost]]). The spine carried
`status`/`doneAt`/`actualStart`/`actualEnd` but no way to record that a
planned `WorkItem` was actually executed in the field, no link to
immutable D0 domain-event evidence, and no Proven/Claimed/Open board.
D4 is that slice.

## Decision

Four user-confirmed binding design forks:

1. **Typed D0 event link + generic fallback.** When a typed D0 domain
   event fits (`maintenance` / `scheduled-livestock-move` /
   `nursery-batch`) the real immutable event carries the proof via its
   existing optional `workItemId` back-link. When no typed class fits
   (`routeProofTarget` → `'generic'`) a net-new generic `ProofEvent`
   record is the proof instead. The back-link always lives on the event
   side — exactly like the 5 D0 domain-event schemas — so the WorkItem
   spine schema is **unchanged** (no `workItem.schema.ts` edit, no DB
   migration, no literal-site churn).
2. **Structured proof + optional reference-only evidence.**
   `ProofEvent` is a structured record (`actorWho`, `actualStart`,
   `actualEnd`, `notes`) with an **optional** `evidence: { photoRef,
   geo? }` — a reference string + coords only, **no binary upload**
   (explicit YAGNI). `.passthrough()` for forward-compatible hydration.
3. **Extend `PlanExecutionTrackerCard` in place via a child panel — NO
   manifest entry.** `FieldProofPanel` is a well-bounded child that
   rides the existing `act-plan-tracker` mount; no new Act manifest
   card, no new route. (Diverges from the now-superseded parallel
   spec's dedicated `act-field-proof` card — see below.)
4. **Manual capture + render-only suggestion with explicit Confirm —
   no silent spine-status auto-mutation.** `suggestProofMatches` is
   render-only (closest in-window typed event per not-done item); a
   suggestion **never** writes on its own. Completion only ever happens
   through an explicit steward action (Save proof / Confirm match).

## Deliberate layering reconciliation (intentional divergence from spec prose)

The authoritative spec's prose assigns the "route the typed domain
event OR write the generic fallback, then complete" responsibility to a
single action. This plan **deliberately split** that:

- `workItemStore.fulfilWorkItem` / `unfulfilWorkItem` are kept
  **spine-only** — they write *only* the spine completion fields
  (`status`/`doneAt`/`actualStart`/`actualEnd`/`who`) and touch **no
  other store**, so `workItemStore` retains **zero app-store
  dependencies**, exactly as it does today.
- The spec's "routes typed event or fallback" responsibility is
  delivered by a thin non-store orchestrator
  `apps/web/src/features/act/fieldProofActions.ts`
  (`fulfilWithGenericProof`, `confirmTypedProofMatch`) that composes the
  domain store / `proofEventStore` write **then** calls `fulfilWorkItem`
  — structurally identical to how `RotationScheduleCard` already pairs
  `updateItem(...)` with `updateEvent(...)` side-by-side (established
  precedent).

**Net behaviour == the spec**: there is still exactly one completion
writer of the spine, exactly one orphan-by-design proof ledger, exactly
the typed-vs-generic routing the spec requires. This is recorded as an
**intentional divergence from the spec's prose, not from its intent**.

## Superseded parallel spec (retire-not-delete)

A parallel session independently authored
`docs/superpowers/specs/2026-05-19-d4-field-execution-proof-design.md`
(a dedicated `act-field-proof` card variant). It was **SUPERSEDED —
retire-not-delete**, banner committed `3751a1fc` (no-deletion-in-revamps
covenant — file preserved with a header banner, not removed). This slice
implements the **authoritative**
`docs/superpowers/specs/2026-05-19-d4-field-proof-design.md` (typed D0
event linking; no dedicated card — child panel on the existing tracker).

## Scope delivered

- **Shared schema** `packages/shared/src/schemas/proofEvent.schema.ts`
  (new) — `ProofEventSchema` (`id`, `projectId`, `workItemId`,
  `actorWho?`, `actualStart?`, `actualEnd?`, `notes?`, `evidence?
  {photoRef, geo?}`, `createdAt`), `.passthrough()`. Steward/field-
  authored only — **no Goal-Compass preservation contract**. Exported
  from `@ogden/shared`. Commit `7743e4c4`.
- **Pure engine** `packages/shared/src/lib/fieldProof.ts` (new, no
  React/store) — `ProofState`, `ProofTarget`, `DomainEvent`,
  `ProofSuggestion`, `FieldProofAnalysis`; `routeProofTarget`
  (source → typed store, **harvest deliberately excluded** — a WorkItem
  is a planned task, not "a harvest"; harvest entries stay their own D0
  log and are never auto-treated as task proof), `classifyProof`
  (done+event = proven / done+none = claimed / not-done = open),
  `suggestProofMatches` (render-only closest-in-window candidate per
  not-done item), `analyzeFieldProof` (rollup + counts). Never reads or
  writes `WorkItem.status`. Exported from `@ogden/shared`. Tests:
  `src/tests/fieldProof.test.ts` (6 — route/classify/suggest purity,
  no-`status`-mutation invariant, covenant no-financing regex).
  Commit `f9a2ebf4`.
- **Generic-proof store** `apps/web/src/store/proofEventStore.ts` (new)
  — Zustand+persist `ogden-work-item-proof`, projectId-tagged CRUD
  (`addProofEvent` / `updateProofEvent` / `removeProofEvent` /
  `getProjectProofEvents`). Steward-authored — **no Goal-Compass
  preservation contract**. **Orphans by design** (no cascade-delete —
  mirrors the D3 actuals discipline). Registered in `syncManifest.ts`
  as `blob('ogden-work-item-proof', useProofEventStore,
  'projectId-tagged', 1, tagged('events'))` (coverage-guard clean).
  Tests: `src/store/__tests__/proofEventStore.test.ts` (3 — CRUD,
  project isolation, orphan retention). Commit `06d08459`.
- **Spine single-writer** `apps/web/src/store/workItemStore.ts` —
  added `fulfilWorkItem(id, capture)` (SOLE writer of the spine
  completion fields; **idempotent** — already-`done` ⇒ no-op, same
  array reference, no `updatedAt` churn; `capture.notes` accepted but
  intentionally ignored — notes belong on the proof event) and
  `unfulfilWorkItem(id)` (reverses **only** the spine back to `todo`).
  Zero app-store dependencies preserved. Tests:
  `src/store/__tests__/workItemStore.fulfil.test.ts` (4 — exact-field
  stamp, idempotence hard gate, no-cross-item mutation, spine-only
  reverse). Commit `f01bbfd3`.
- **Orchestrator + surface + mount** — `fieldProofActions.ts` (new,
  thin: `fulfilWithGenericProof` = write generic `ProofEvent` + spine;
  `confirmTypedProofMatch` = stamp existing typed D0 event's
  `workItemId` + spine, no generic event), `FieldProofPanel.tsx` (new
  child of the tracker — proof board, capture editor, render-only
  suggestions with explicit Confirm), `PlanExecutionTrackerCard.tsx`
  (import + `<FieldProofPanel project={project} />` after `</header>`,
  **no manifest change**). **5th file:** an additive
  `nurseryStore.updateTransfer(id, patch)` setter (see below). Tests:
  `src/features/act/__tests__/fieldProofActions.test.ts` (2 —
  generic-fallback path writes event + fulfils; typed-match path
  stamps the maintenance event + fulfils, no fallback). Commit
  `44d3d73c`.

### The 5th-file addition — `nurseryStore.updateTransfer`

The authoritative design's typed-nursery proof path needs to stamp a
`workItemId` back-link onto an existing `StockTransfer` row, but
`nurseryStore` had **no updater** for transfers (only add). A minimal
**additive** setter `updateTransfer(id, patch)` was added, mirroring
`maintenanceLogStore.updateEvent` exactly (same shape, same map-patch
semantics). Independently reviewed as **justified, minimal, and
in-scope** — it is the smallest possible change to make the typed
nursery path symmetric with the maintenance / livestock-move paths
(which already had `updateEvent`); nothing else in `nurseryStore`
changed.

## Accepted design consequence — un-fulfil does not cascade

Recorded explicitly: `unfulfilWorkItem` reverses **only the spine**
(`status`/`doneAt`/`actualStart`/`actualEnd` → cleared). It deliberately
does **not** cascade-remove the generic `ProofEvent` nor unstamp a typed
event's `workItemId`. Proof rows are an **immutable orphan-by-design
audit trail** (consistent with `proofEventStore` "orphans by design" and
the D3 actuals discipline).

**Consequence (intentional, not a defect):** a
fulfil → un-fulfil → re-fulfil cycle returns the item to `'proven'`
against the *retained* evidence, and the generic path can accumulate
multiple `ProofEvent` rows for the same item across cycles. This is
intentional audit-trail behaviour. Noted as a **known/accepted boundary**
for a future D-slice to revisit *if* explicit proof-cleanup is ever
desired (out of scope for D4).

## Covenant & scope boundary

Strictly **operational field-execution proof**. **Explicitly out:**
cost, financing, capital, investor/equity, advance-purchase,
yield-as-return, riba, gharar, salam framing — those stay in
Scholar-gated Sub-project C. Enforced by: (a) the engine's no-financing
token regex test, (b) the no-`status`-mutation invariant test, (c) the
release-gate covenant grep over the five shipped D4 files. No DB
migration. No `workItem.schema.ts` change. No new manifest entry.
`RotationScheduleCard` and the financial-engine investor surfaces
untouched.

## Verification

- `pnpm --filter @ogden/shared typecheck` exit 0, **fully clean**;
  `pnpm --filter web typecheck` exit 0, **fully clean** (the previously
  disclosed `useFlowEndpointOptions` Paddock baseline debt did not
  surface this run).
- Vitest: `@ogden/shared` **253/253 (18 files)** incl.
  `fieldProof.test.ts` 6; web **1229/1229 (116 files)** incl.
  `proofEventStore.test.ts` 3, `workItemStore.fulfil.test.ts` 4,
  `fieldProofActions.test.ts` 2. **Zero failures.** The
  `ECONNREFUSED`/"failed to fetch builtin samples" lines are the
  expected offline-fallback path (no API server in the test env), not
  test failures — all 116 files green.
- `vite build` exit 0 (`✓ built in 32.01s`, PWA 717 precache
  entries). (`NODE_OPTIONS=--max-old-space-size=8192` — the default
  Node heap OOMs `vite build`; environment, not code; `tsc` had
  already passed.)
- Covenant release-gate grep over the 5 shipped D4 files
  (`fieldProof.ts`, `proofEvent.schema.ts`, `proofEventStore.ts`,
  `fieldProofActions.ts`, `FieldProofPanel.tsx`): every lexicon hit is
  either a **negative covenant declaration** inside a doc-comment
  ("No cost / financing / capital / investor / yield-as-return…") or
  the JavaScript `return` keyword in pure control flow. **No real
  financing/capital field, value, user string, or logic.** PASS.
- Surface wiring verified statically:
  `Select-String PlanExecutionTrackerCard.tsx -Pattern FieldProofPanel`
  → exactly two hits (`import` line 38 + `<FieldProofPanel
  project={project} />` mount line 926). Combined with web `tsc` exit
  0, the panel is wired and type-sound.
- Live-preview screenshot verification **disclosed-blocked** by the
  known MapLibre/WebGL hang (`FieldProofPanel` is deep behind the Act
  module slide-up; the D1–D3 preview hang recurs). Per the approved
  plan's screenshot-honesty fallback: **no screenshot claimed**; the
  two-hit static wiring + web `tsc` exit 0 is the authoritative proof.

## Commit posture

Six explicit-path commits on `feat/atlas-permaculture`, **explicit-path
staging only** (never `git add -A`/`.`), **nothing pushed**:

- `7743e4c4` feat(d4): generic ProofEvent fallback schema
- `f9a2ebf4` feat(d4): pure field-proof engine (classify/route/suggest) + tests
- `06d08459` feat(d4): proofEventStore (projectId-tagged) + syncManifest registration
- `f01bbfd3` feat(d4): spine-only single-writer fulfilWorkItem/unfulfilWorkItem + hard gate
- `44d3d73c` feat(d4): FieldProofPanel + orchestrator, mounted on the tracker card
- (this) docs(d4): ADR + session log for field-execution-proof slice

`wiki/index.md` deliberately **not modified** (D0-owned dirty — left
for its owner, per the D2/D3 ADR precedent). The uncommitted D3 working
tree and concurrent out-of-band D0/D2.1 streams were **not touched**.

## Notes & deferred

- Live exercise of the proof board / capture / suggest-confirm flow
  **deferred** behind the WebGL preview hang — proven by construction
  (pure-engine unit tests + orchestrator hard-gate tests + static
  wiring). Recommended as the first step of a future session with a
  working preview screenshot path.
- Proof-cleanup on un-fulfil (cascade / dedupe) is an explicitly
  **accepted out-of-scope boundary** (see "Accepted design
  consequence") for a future D-slice if ever desired.
- Continues the D-series. D5 is its own brainstorm→spec→plan cycle.
