# 2026-05-25 — Conflict Detection + Plan Versioning + Synthesis/Approval (Plan-Operation Phase 5)

**Status.** Accepted. Phase 5 — the **final** OLOS Plan-Operation roadmap slice.
Code-complete, statically verified; browser verification deferred (see below).
Three commit-on-verify sub-slices on `feat/atlas-permaculture`:
**5a** `72f9cabb` · **5b** `68b5f526` · **5c** `2b408b9b`.

## Context

The Plan-Operation roadmap layers a living-plan loop on the existing 15-module
Plan-Initiation surface. Phases 1–4 built the linear Observe→Plan→Act spine plus
the per-decision reasoning surface:

- **Phase 1 — Plan Impact Flags** (`48702c66`) — recorded observation flagged
  `planImpact: possible|likely` → triageable **Plan Review** (thin verb + note).
- **Phase 2 — Decision Log** (`c36bb5a6`) — a reviewed verb → an authored
  **PlanDecision** (verb + headline + rationale + assumptions + trade-offs).
- **Phase 3 — Work Packages + Plan→Act Handoff** (`ab445034`) — an accepted
  `create-act-task` decision → a team-typed **Act Work Package**, consumed by Act.
- **Phase 4 — Planning Workspace + Scenario Comparison** (`6bdbb31b`) — a
  per-decision page with qualitative side-by-side response options.

**Phase 5 closes the living-plan loop end-to-end** with the machinery that keeps a
*living* plan honest over time:

- **Conflict Detection** — nothing told a steward when a *new* recorded observation
  **contradicts an existing plan decision**. Phase 1 flags *impact*, never *conflict*
  — the last dangling Observe↔Plan edge.
- **Plan Versioning** — no plan lifecycle (draft/approved/superseded) and no
  point-in-time record of "what the plan was." Read-verified: `versionStore`
  snapshots only the project record; `scenarioStore` snapshots summary metadata only.
- **Synthesis & Approval** — no surface rolling up the whole Plan-Operation state,
  and no approval/sign-off anywhere (Fit Gate is advisory read-only;
  ClientHandoffPackageCard is a *delivery* artefact).

## Design decisions (operator-confirmed via AskUserQuestion)

1. **Sequencing — three commit-on-verify slices: 5a → 5b → 5c.** Each ships and
   verifies independently. Dependency-correct: 5c builds on 5a (conflict counts) +
   5b (the version it approves).
2. **Conflict mechanism — data/module-match + light geometry.** Mirror Phase 1's
   *derived-flag + stored-triage* split: derive conflict candidates **purely** by
   matching recorded observations to plan decisions through module affinity, plus an
   **optional** turf point-in-polygon pass. Steward triages; nothing auto-mutates.
3. **Version snapshot — full-geometry snapshot + restore.** A version captures the
   **complete** per-project plan state and can be **restored** (overwrite current).
   Reuses the `syncManifest.ts` `selectForProject`/`applyForProject` engine **plus**
   explicit handling of the 4 `typed-design-feature` stores the manifest omits.
4. **Approval — advisory status stamp** (steward-sovereign). Approving stamps a
   version `draft→approved` (who/when/note), like the Fit Gate verdict. It does
   **NOT** lock or gate any other surface; reversible (Reopen → draft).

## Scope boundary (explicit non-goals, all three slices)

- **Operational only** — no riba/gharar/CSRA/salam/investor/financing/
  cost-of-capital semantics anywhere. Covenant header on every new file.
- **No auto-mutation.** Conflict detection only *surfaces* candidates; approval only
  *stamps* — it never locks decisions, work packages, or modules.
- **No spine writes outside the version snapshot.** 5a/5c add only their own
  `ogden-*` stores; 5b *reads* every plan store to snapshot and *writes back only on
  an explicit, confirmed restore*.
- **Restore is explicit + confirmed** (destructive — gated behind `window.confirm`).

---

## Slice 5a — Plan Conflict Detection (`72f9cabb`)

Mirrors Phase 1's derived-flag/stored-thin-run split.

- `planConflict.ts` (pure): `PlanConflictResolution = dismiss|acknowledge|revise-plan`,
  `PlanConflictStatus = open|reviewed`, `PlanConflictSeverity = possible|likely`;
  derived `PlanConflict` (id = `${observationId}:${decisionId}`); stored
  `PlanConflictRun`. `derivePlanConflicts(views, decisions)` — pure: for each
  recorded/resolved observation, emit a conflict per non-`rejected` decision whose
  `affectedModule` is affinity-related to the observation's `module`
  (`likely` = direct match, `possible` = affinity); sort likely-first then recorded
  desc. Optional `derivePlanConflictsByGeometry` (turf point-in-polygon) kept
  separate so the core stays test-clean.
- `planConflictReviewStore.ts` — persist `ogden-plan-conflict-reviews` v1,
  `byProject` thin-runs; registered in `syncManifest.ts`.
- `usePlanConflicts.ts` + `usePlanConflictCounts`; `PlanConflictsPage.tsx` (route
  `plan/conflicts`); sidebar entry; `planConflict.test.ts`.

## Slice 5b — Plan Versioning: full snapshot + restore (`68b5f526`)

The crux is **`planSnapshot.ts`** — capture every per-project plan store:

1. **Manifest-driven (~63 stores):** iterate `SYNCED_STORES` where
   `classification === 'versioned-blob'` **and** `storeKey !== 'ogden-plan-versions'`
   (skip the version store itself → no recursion/bloat). Capture via
   `selectForProject`, restore via `applyForProject` (writes back, other projects
   untouched).
2. **Typed-design adapter (4 stores):** `ogden-zones`/`ogden-paths`/
   `ogden-utilities`/`ogden-built-environment-v2` carry **no** manifest selectors;
   a local `arrayAdapter` filters/replaces this project's rows on each store's flat
   `projectId`-tagged array.

> The 2 `typed-table` stores (`ogden-vegetation`, `ogden-act-succession`) are
> intentionally NOT snapshotted — server-queried typed tables, not part of the
> geometry-bearing plan-design surface. Documented limitation.

> **Size caveat (accepted by the operator).** A full snapshot serialises all plan
> geometry into the `ogden-plan-versions` blob in localStorage. Snapshots are
> explicit steward actions (bounded volume), but the version store should keep only
> a small N — the localStorage-size tradeoff of choosing full-geometry over the
> lightweight option.

- `planVersion.ts` (pure): `PlanVersionStatus = draft|approved|superseded`;
  `PlanVersion { id, projectId, label, note, status, snapshot, createdAt, updatedAt,
  approvedAt?, approvedBy? }`; `emptyPlanVersion`, `sortVersions`.
- `planVersionStore.ts` — persist `ogden-plan-versions` v1 (authored-whole),
  `setStatus(...,approvedBy?)` stamps `approvedAt`; **registered in `syncManifest.ts`**
  (the exact key the snapshot engine skips).
- `usePlanVersions` / `usePlanVersionCounts` / `useActivePlanVersion`;
  `PlanVersionsPage.tsx` (route `plan/versions`) — capture bar, status-grouped cards,
  confirm-gated Restore, Supersede, draft Delete; sidebar entry.

### Testability fix — `planSnapshotMerge.ts` (this slice's key engineering note)

Importing `planSnapshot.ts` under vitest crashes at module load
(`TypeError: Cannot read properties of undefined (reading 'getOptions')`,
`persistRehydrate.ts:62`). Root cause: the `syncManifest → projectStore →
cascadeDelete → useZoneStore` runtime cycle combined with the zundo+persist
`zoneStore` leaves `store.persist` undefined when `rehydrateWithLogging(useZoneStore)`
runs. **Fix:** extract the bespoke project-slice filter/replace logic into a pure,
store-free `planSnapshotMerge.ts` (`selectProjectRows` / `mergeProjectRows`); the
adapter delegates to it; `planSnapshot.test.ts` exercises the pure helpers (7 tests)
— testing the genuine restore-safety invariant without the crash. The
versioned-blob half is already covered by `syncManifest.test.ts`. Deliberately did
**not** add a production guard to `rehydrateWithLogging` (would silence real
rehydrate instrumentation) nor refactor the engine for DI (over-scope).

## Slice 5c — Plan Synthesis & Approval (`2b408b9b`)

`PlanSynthesisPage.tsx` (route `plan/synthesis`) — a read-mostly roll-up of the whole
Plan-Operation state, composing the existing counts hooks (no new store):

- **Readiness summary** — 7 stat tiles (open reviews, open conflicts, draft/accepted
  decisions, draft/queued packages, plan versions), each a typed `Link` to its
  surface; `data-flag` accent on tiles needing steward attention.
- **Open items** — conditional links for open reviews/conflicts + draft
  decisions/packages; clear empty state when nothing pends.
- **Active version** — the approved (or latest) `PlanVersion`, captured/approved
  stamps, link to all versions.
- **Approval block (advisory stamp)** — `Approve current plan` approves an existing
  draft version, else captures a fresh snapshot, `create`s a `PlanVersion`, and
  `setStatus('approved', STEWARD)` with an optional note; `Reopen` flips approved →
  draft. Purely advisory — **no** other surface is locked.

Sidebar gains a "Plan Synthesis" entry with an "approved ✓" marker from
`useActivePlanVersion`. **No new store** — approval metadata lives on `PlanVersion`.

## Tests

- **5a:** `planConflict.test.ts` + the `syncManifest.test.ts` coverage guard.
- **5b:** `planVersion.test.ts` (5) + `planSnapshot.test.ts` (7, against the pure
  merge core) + guard — **22/22 passing** in the versions + guard run.
- **5c:** composition of existing hooks; no new store ⇒ guard unaffected; no new
  test file.
- `tsc --noEmit` — clean for the Phase 5 changeset; only the **3** documented
  pre-existing unrelated errors remain (`planImpactFlag.test.ts:143`,
  `HostUnionContextMenu.test.tsx:58`, `HostUnionDrilldownCard.test.tsx:25`).

## Verification deferrals

- **Browser/preview visual check — deferred.** Needs a logged-in operator session to
  screenshot: a conflict surfacing with the right severity + decision link; capture →
  edit geometry → Restore reverting it (other projects untouched); the synthesis
  roll-up counts matching each surface; Approve stamping a version + the sidebar dot
  flipping; Reopen reverting (no surface becomes read-only). Auth bypass remains
  forbidden. The data-model + engine contracts are unit-test covered; pages/routes
  are static-typed clean. Committed on operator-approved plan with this deferral.

## Roadmap status

Phases 1–5 shipped. **Phase 5 is the final Plan-Operation roadmap slice** — the
living-plan loop (Observe→Plan→Act + reviews → decisions → work packages → conflicts
→ versions → advisory approval) is now closed end-to-end. Remaining roadmap items are
*additive Initiation* work (Risk & Compliance module #9, Operations Model surface #11)
to be built only once the Operation layer creates demand.

Log: [[log/2026-05-25-plan-conflict-version-synthesis-phase5]].
Continues [[decisions/2026-05-25-atlas-plan-workspace-phase4]].
