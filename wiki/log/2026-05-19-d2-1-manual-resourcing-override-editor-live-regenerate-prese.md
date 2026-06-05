# 2026-05-19 — D2.1: manual resourcing-override editor + live regenerate-preservation run (run6)


**Branch.** `feat/atlas-permaculture`. Committed `d2853b2f` (editor +
TDD), `f63187ba` (code-quality fixes), `dfd8a5f6` (dev seed seam) — landed
out-of-band on the rebased branch before this session resumed. ADR:
[[decisions/2026-05-18-atlas-d2-1-resourcing-override-ui]]; closes the
single deferred item of [[decisions/2026-05-18-atlas-d2-resourcing]].

Executed the approved plan Parts A/B. **Part A** — built the missing
per-WorkItem manual resourcing-override editor: `ResourcingEditor` inline
in `PlanExecutionTrackerCard`'s `TaskItem` (mirrors `DependencyEditor`),
edits manual `equipmentRequired`/`materials` only, Save →
`updateItem(id,{overridden:true,…})`. Stable `crypto.randomUUID()`
material-row keys; `role="group" aria-label="Resourcing"`. TDD suite
`PlanExecutionTrackerCard.resourcing.test.tsx` 4/4 (toggle/open;
override+Save preserves `*Auto`; pre-population; Cancel no-write);
combined Resourcing suites 7/7. Two-stage reviewed (spec ✅; code-quality
✅ after a fix loop on index-keyed rows + brittle DOM traversal).

**Part B1** — dev seam `apps/web/src/dev/seedGoalCompassPlan.ts`
(`window.__ogdenSeedGoalCompassPlan`), idempotent, reproduces
`GeneratedPlanTab.handleGenerate` argument-for-argument; registered in
`main.tsx`.

**Part B2 — live run6** (preview `web-a1` :5240, builtin "351 House"
`31b47ae7-…`): 19 goal-compass WorkItems seeded; target
`gc-task-keyline-access-track` manually overridden via the real editor UI
(equipment `STEWARD-OVERRIDE-EXCAVATOR`, material
`STEWARD-COMPOST/m³/9`). Post-override: `overridden:true`, manual set,
`*Auto` unchanged, BOM shows `… manual`. Regenerated via the real Plan →
Goal Compass → "Generate proposal". **Post-regenerate (contract PASS):**
manual fields byte-identical, `overridden` still true, `source` still
`goal-compass`, `updatedAt` unchanged (gate short-circuited the overridden
row — zero churn), 18 non-overridden rows re-seeded their `*Auto` (sync
ran spine-wide, skipped the overridden row). Console clean (zero errors;
only known unrelated act-telemetry/machinery 500s — no preview backend).
Screenshot hang on the WebGL canvas disclosed; DOM/localStorage +
console-log assertions are the verification of record.

**Note.** The branch already carries D3 (budget/cost) commits landed
out-of-band below the D2.1 commits; the planned Part C was only a written
D3 brainstorm seed (no code), so nothing was reconciled — D3 has its own
on-branch ADR/spec.
