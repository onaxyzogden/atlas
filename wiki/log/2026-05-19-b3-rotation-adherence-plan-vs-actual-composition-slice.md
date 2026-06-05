# 2026-05-19 — B3: Rotation Adherence (plan-vs-actual composition slice)


**Branch.** `feat/atlas-permaculture`. After the D-series (D0–D5)
closed, the user asked about pending livestock-rotation work and
chose **"Plan-vs-actual adherence"** from a multi-option roadmap
fork — a B3 extension closing the loop between the steward's
*intended* `RotationPlan` and the *actual* `LivestockMoveEvent[]`
move log (both already shipped pre-D-series). Subagent-driven-
development workflow (implementer → spec-reviewer → code-reviewer →
next task) over four tasks; per-task explicit-path commits; **not
pushed** (branch rebased/force-pushed out-of-band).

1. **Pure composition engine** (`254ab499`) — new
   `apps/web/src/features/livestock/rotationAdherence.ts` exporting
   `computeRotationAdherence(input)` that diffs paddocks × plan ×
   moves into a single `Light` + ranked deterministic render-only
   `AdherenceRecommendation[]` + counts. Five rule branches:
   `overgrazed` / `under-rested-reentry` (high), `short-rest` /
   `early-move` (med), `unplanned-paddock` (low) — each fires ≤ once
   per affected paddock. **Reuses** `requiredRestDays()` from
   `rotationSequenceMath.ts` and `destPaddockId()` from
   `livestockMoveLogStore.ts` — never re-derives recovery / rest
   math. Sort comparator copied verbatim from D5
   (`SEVERITY_RANK` → count desc → id asc). House date guard:
   malformed `now` → `Date.now()`. 11 unit tests including
   deterministic ranking, deep-freeze no-mutation, open-interval-
   overgrazed, all five rule branches, and the
   `/interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i`
   covenant-lexicon negative assertion. Test file uses
   `@vitest-environment happy-dom` because importing the runtime
   `destPaddockId` pulls the move-log store's top-level
   `persist.rehydrate()` side-effect (mirrors the
   `goalCompassSpineSync.test.ts` precedent).
2. **Render-only card** (`290035bd`) —
   `apps/web/src/features/livestock/RotationAdherenceCard.tsx`
   (+ `.module.css`), single `{ projectId: string }` prop. Three
   `useMemo` store selectors (paddocks filtered, plan, moves).
   Three states (no-paddocks empty / on-track empty / drift with
   ranked recs). `Read-only` mode badge; palette mirrors
   `RotationSequenceCard.module.css`. Zero store writes, zero
   navigation, zero mutating buttons. Four happy-dom tests
   (no-paddocks, on-track, seeded drift renders a HIGH
   recommendation, container text has no financing lexicon).
3. **Append-only Plan registration** (`0a0d64e0`) — one entry in
   `apps/web/src/v3/plan/types.ts` (`{ label: 'Rotation adherence',
   sectionId: 'plan-livestock-rotation-adherence' }` after the
   existing `'plan-livestock-rotation-plan'`, before the Product
   Chain group), plus a lazy import and one render `case` in
   `apps/web/src/v3/plan/PlanModuleSlideUp.tsx`. No
   palette / view-scope / artifact-presence / guidance edits — the
   `livestock` module is already generically covered.

**Covenant.** Strictly agronomic / ecological. Covenant grep on the
two new sources clean (matches only docstring negative assertions).
No `WorkItem.status` read or write. No DB / API change. No store
slice added.

**Verification.** `pnpm --filter @ogden/web typecheck` exit 0;
`pnpm --filter @ogden/web test` 122/122 files / 1286/1286 tests
green; `pnpm --filter @ogden/web build` ✓ (vite 40.6 s).
`@ogden/shared` untouched.

**Out of scope.** Edit affordances on the adherence surface — this
card is strictly audit. Code-quality reviewer flagged minors
(severity-class collapse, decoupling card tests from engine copy);
deferred per "ship as-is" recommendation.

See [[decisions/2026-05-19-atlas-b3-rotation-adherence]].
