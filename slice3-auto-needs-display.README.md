# §5c Slice 3 — auto-needs display layer (recovery note)

**Status:** uncommitted on purpose. Entangled with the in-flight Observe
dashboard-shell rework (foreign WIP) across 3 command files, so it cannot be
committed in isolation without bundling that incomplete shell + its 3 untracked
deps (`ObserveMapSidebar.tsx`, `ObserveModuleTabs.tsx`, `ObserveMapLegend.tsx`).

Functional §5c core is already shipped:
- Slice 1 `1dde1936` — detect auto needs from gaps + stale data
- Slice 2 `0e1a7a5d` — merge auto needs into the observation-needs catalog

`slice3-auto-needs-display.patch` captures the **full** working-tree diff of the
three command files (foreign shell + my display edits together — they are
functionally inseparable: the Dismiss button lives inside the shell's
`objCardActions`, and `displayViews` filters the shell's `filteredViews`).

## My (§5c) hunks within that patch — re-apply these on top of the landed shell

**ObserveCommandCentrePage.tsx**
- `import { isDismissedAutoNeed } from '../observation-needs/autoObservationNeeds.js';`
- `const displayViews = needViews.filter((v) => !isDismissedAutoNeed(v));`
- `filteredViews` derives from `displayViews` (not `needViews`)

**OpenObservationNeedsPanel.tsx**
- `ORIGIN_LABEL.auto = 'Auto'`
- `const setStatus = useObservationNeedStore((s) => s.setStatus);`
- The `Dismiss` button (only when `objective.origin === 'auto'`) →
  `setStatus(projectId, objective.id, 'resolved')`

**ObserveCommandCentrePage.module.css**
- `.origin_auto` (dashed warning rim)
- `.objCardActions` (flex row) + `.dismissBtn` (+ `:hover`)

## Recovery
If an external rebase wipes the working tree, restore with:
`git apply slice3-auto-needs-display.patch`
(or cherry-pick just the §5c hunks above onto the committed shell).
