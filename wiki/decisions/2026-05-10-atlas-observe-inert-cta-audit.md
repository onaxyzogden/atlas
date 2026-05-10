# Atlas Observe Stage — Always-inert CTA audit, single-rule deletion

**Date:** 2026-05-10
**Status:** Accepted
**Context:** Atlas (`atlas/` submodule) — Observe stage dashboards & detail pages

---

## Decision

When a CTA button has **no live target** — no `onClick`, no backing surface,
no concrete destination — **delete it**. This is the uniform rule across all
v3 stages. Decorative-looking interactivity is an anti-pattern; either wire
the button to a real surface or remove it.

## Why

After the slide-up tab restructure (commit `acabaec`) and the option-B
sweep (`4105ba4`) cleared the now-redundant portal CTAs, an audit found 11
buttons across 10 Observe files that had **always** been inert — not stripped
by the restructure, but never wired in the first place. They span dashboards
("Go to next: Site Analysis", "View full design implications", "Create
action plan from synthesis") and detail pages ("View all actions", "View
design overlay", "Add to design plan", "Create transect", "Add journal
entry"). Plan and Act stages were clean.

Three reasons to delete rather than wire-or-keep:

1. **Decorative is the worst option.** Affordances that look interactive
   but aren't teach users to distrust the entire surface.
2. **Wiring requires inventing targets.** No action-plan generator exists,
   no export pipeline exists, "View design overlay" has no current route,
   and the `Create transect` / `Add journal entry` affordances are already
   reachable via the tools panel and journal slide-up respectively. The
   in-page duplicates add zero pathway.
3. **Delete matches precedent.** Commit `4105ba4` (option B for the
   slide-up restructure) established the rule for the post-restructure
   inert population. Extending the same rule to the always-inert
   population keeps the codebase coherent and dashboards visually
   quieter, and forces all navigation/actions to flow through the
   established surfaces (slide-up tabs, tools panel, module bar).

If a future session adds an action-plan generator, export pipeline, or
overlay system, the buttons can be re-introduced with handlers at that
time.

## Scope

11 button deletions across 10 files in `apps/web/src/v3/observe/modules/`:

| File | Button copy |
|---|---|
| `macroclimate-hazards/MacroclimateDashboard.tsx` | Go to next: Site Analysis |
| `sectors-zones/SectorsDashboard.tsx` | Go to next: Site Analysis |
| `swot-synthesis/SwotDashboard.tsx` | Create action plan from synthesis · Export synthesis summary |
| `human-context/HumanContextDashboard.tsx` | View full design implications |
| `earth-water-ecology/EcologicalDetail.tsx` | View all actions |
| `earth-water-ecology/HydrologyDetail.tsx` | View all risks · View design overlay |
| `sectors-zones/SectorCompassDetail.tsx` | Add to design plan |
| `topography/TerrainDetail.tsx` | Create transect |
| `swot-synthesis/SwotDiagnosisReport.tsx` | Add to design plan |
| `swot-synthesis/SwotJournal.tsx` | Add journal entry |

Unused `ArrowRight` and `Plus` imports dropped from
`MacroclimateDashboard.tsx`, `HumanContextDashboard.tsx`,
`SectorCompassDetail.tsx`, and `TerrainDetail.tsx`.

No prop or interface changes — these buttons were local to their JSX and
did not propagate types (unlike the option-B sweep, which trimmed
`ModuleCardShellProps`).

## Open questions resolved

- **`Create transect` in `TerrainDetail.tsx`** was the only button with a
  clear backing surface (the transect draw tool in the tools panel). Two
  options were on the table: (A) delete uniformly, (B) wire only this one
  to activate the draw tool. **Option A shipped** — single-rule cleanliness,
  and the draw tool is already one click away in the tools panel. The
  duplicate header button added zero new pathway.

## Verification

- TypeScript: `tsc --noEmit` clean (with raised `--max-old-space-size`).
- Dev preview spot-check (port 5200):
  - 6 dashboards (Topography · Macroclimate · Sectors · SWOT · Human
    Context · Earth/Water/Ecology) — no orphaned bottom-of-card CTA stub.
  - 6 detail tabs (Terrain · Hydrology · Ecological · Sector Compass ·
    SWOT Journal · SWOT Diagnosis Report) — inert header/footer CTAs
    gone.
- No React key/missing-children warnings introduced.

## Files changed

```
apps/web/src/v3/observe/modules/macroclimate-hazards/MacroclimateDashboard.tsx
apps/web/src/v3/observe/modules/sectors-zones/SectorsDashboard.tsx
apps/web/src/v3/observe/modules/swot-synthesis/SwotDashboard.tsx
apps/web/src/v3/observe/modules/human-context/HumanContextDashboard.tsx
apps/web/src/v3/observe/modules/earth-water-ecology/EcologicalDetail.tsx
apps/web/src/v3/observe/modules/earth-water-ecology/HydrologyDetail.tsx
apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDetail.tsx
apps/web/src/v3/observe/modules/topography/TerrainDetail.tsx
apps/web/src/v3/observe/modules/swot-synthesis/SwotDiagnosisReport.tsx
apps/web/src/v3/observe/modules/swot-synthesis/SwotJournal.tsx
```
