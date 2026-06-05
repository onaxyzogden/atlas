# 2026-05-09 — Plan rail: per-item module-jump chips on project-type bullets


Closed the third and final follow-up listed under "Out of scope" in the
[2026-05-09 project-type checklist ADR](decisions/2026-05-09-atlas-plan-project-type-checklist.md):
*"Per-item linking to the module that satisfies the prompt (so a click jumps
to that module's slide-up)."* The ADR is now in **Implemented (+ all three
same-day follow-ups landed)** state.

### What shipped

- `apps/web/src/v3/plan/data/planModulePalette.ts` (new) — extracted
  `PLAN_MODULE_DOT` from `PlanChecklistAside.tsx` so both the per-card dot
  and the new chip rendering single-source the same hex palette.
- `apps/web/src/v3/plan/PlanProjectTypeCard.tsx` — accepts `onSelectModule`
  + `onOpenSlideUp` props; for every `relatedWork` entry on a checklist
  item, renders a "→ {Module}" mini-chip with the module's dot colour set
  inline via `--module-dot`. Chip click calls
  `e.stopPropagation(); onSelectModule(rw.module); onOpenSlideUp();` so a
  chip click never also ticks the bullet.
- `apps/web/src/v3/plan/PlanProjectTypeCard.module.css` —
  `.relatedWorkChips` flex-wrap container (4px gap, indented 22px past the
  checkbox) + `.relatedWorkChip` pill (9.5px, `color-mix` 12% background /
  35% ring / 22% on hover; focus-visible outline).
- `apps/web/src/v3/plan/PlanChecklistAside.tsx` — drops the inline
  `PLAN_MODULE_DOT` map (now imported from the new palette file) and
  forwards `onSelectModule` + `onOpenSlideUp` to `<PlanProjectTypeCard>`.

### Why mini-chips, not a single primary jump target

`relatedWork` on most items declares 2–3 modules. A single "primary"
target would hide the multi-module dependency fan-out the cross-check
feature already surfaces from the other direction. Forward `→` chips
mirror the reciprocal backward `↗ N refs` chip on module cards.

### Verification

- DOM probes via `preview_eval` / `preview_snapshot` (screenshot tool
  unresponsive — same renderer-busy condition as the cross-check
  close-out earlier today):
  - Pick **Homestead**: 9 chips render across 6 items. Item 0
    ("Anchor Z0/Z1") shows `→ Zones`, `→ Structures`, `→ Cross-section`
    in the correct module dot colours (border alphas confirm).
  - Click `→ Zones` → slide-up aria-label flips to
    "Zone & Circulation — plan tools", Zone & Circulation card lights
    `groupActive` + `aria-pressed="true"`.
  - Click `→ Structures` → slide-up aria-label flips to
    "Structures & Subsystems — plan tools"; Zone clears, Structures
    activates.
  - Tick checkbox on item 1 after a chip click → checkedList
    `[true, true, false, false, false, false]`. `e.stopPropagation()`
    on the chip did not regress the existing checkbox-tick gesture.
