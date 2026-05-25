# 2026-05-25 — Plan rail: hide the project-level readiness cue when an objective is focused

**Branch.** atlas `feat/atlas-permaculture`, commit `862fdf08` (1 file: `apps/web/src/v3/plan/PlanLayout.tsx`).

## Why

Looking at the Plan view, the steward flagged the **"Plan essentials · 17%"** card (`PlanReadyCue`) as out of place: it "goes against focus of chosen objective in this view." The card stayed pinned at the top of the Plan right rail even after a specific objective was focused, competing with that objective's own progress/checklist.

## Root cause

The Plan right rail (`PlanLayout.tsx`, ~line 471) stacked **two** components unconditionally:

1. **`PlanReadyCue`** — a *project-level* soft completion cue (mirrors `ObserveReadyCue`). It reads `usePlanProgress(projectId)` — **not** the focused objective — so it always showed overall Plan progress, the remaining required objectives, and a "Ready to Act →" button once all are done. Its own docstring calls it a non-gating "progress hint."
2. **`PlanChecklistAside`** — the *objective-aware* rail: "No objective selected" when `activeModule === null` (`PlanChecklistAside.tsx:284`), otherwise the focused objective's workspace (the GuidanceCard progress/checklist).

Because `PlanReadyCue` rendered above the objective-aware aside regardless of focus, drilling into one objective left the generic project-level cue sitting on top — the friction the steward saw.

## The change (1 file, gate on focus state)

`validModule !== null` is exactly the "objective focused" signal the aside already uses. Gated the cue to render only in the no-objective state:

```jsx
rightRail={
  <>
    {validModule === null && (
      <PlanReadyCue projectId={params.projectId ?? null} />
    )}
    <PlanChecklistAside activeModule={validModule} ... />
  </>
}
```

- **No objective focused** (`/v3/project/$id/plan`, bare `plan` route → PlanLayout with null module): cue **present**, alongside the aside's "No objective selected" prompt.
- **Objective focused** (`/v3/project/$id/plan/$module`): cue **hidden**; the rail belongs entirely to that objective's workspace.

## Verification

`preview_screenshot` times out on the WebGL canvas (known MapLibre issue — **stated, not claimed**); verified by DOM probe of `[aria-label="Plan readiness"]` on the live `:5200`:
- `/v3/project/mtc/plan` → `planReadinessCuePresent: true`, title "Plan essentials · 17%", body has "No objective selected". ✓
- `/v3/project/mtc/plan/water-management` → `planReadinessCuePresent: false`, objective workspace fills the rail (aside text ~597 chars). ✓

## Ownership caveat

`PlanReadyCue` and the rail line were introduced by the **parallel session's** commit `047c06f9` (`feat(atlas): data-derived Plan progress + soft Plan→Act gate`); `PlanLayout.tsx`, `v3/plan/components/`, `v3/plan/progress/` are on the standing foreign-WIP exclusion list. The change was made at the steward's explicit direction and committed immediately (single file, explicit path) per [[feedback-commit-immediately-on-rebased-branches]]; if the parallel session has the file open it may hit a conflict on this hunk — flagged to the steward. `git fetch` + divergence check (0 behind / 1 ahead) before push (`291a6ff2..862fdf08`).
