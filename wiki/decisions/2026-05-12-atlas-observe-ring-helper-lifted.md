# Observe `Ring` helper lifted to shared component

**Date:** 2026-05-12
**Scope:** `apps/web/src/v3/_shared/stageCard/Ring.tsx` (new) + 14 Observe
module files (Ring inline copies → shared import)
**Status:** Closed. Closes deferred follow-up 3 from
[2026-05-11-atlas-observe-human-context-reskin](2026-05-11-atlas-observe-human-context-reskin.md).

## Problem

Every Observe dashboard / detail page declared its own local `Ring`
helper for the gold conic-gradient progress ring used in module-health
KPI blocks. Fourteen copies, byte-identical except for an unused
`obsx` vs `hc` import alias — both pointing to the same
`_shared/stageCard/observeExtras.module.css` and the same `.ring`
rule. Any future change to the ring (size, gradient stops, text
weight) would have to be applied to all 14 files in lockstep.

## Decision

Lift `Ring({ value })` into `apps/web/src/v3/_shared/stageCard/Ring.tsx`
as a default export. The component reads `styles.ring` from
`observeExtras.module.css` directly — same CSS class the 14 inline
copies were already pulling, so output is identical:

```tsx
import type { CSSProperties } from 'react';
import styles from './observeExtras.module.css';

export default function Ring({ value }: { value: number }) {
  const style = { '--progress': `${value}%` } as CSSProperties;
  return (
    <div className={styles.ring} style={style}>
      <span>{value}%</span>
    </div>
  );
}
```

Each of the 14 consumers drops:
- the local `function Ring(...)` block,
- the now-unused `type CSSProperties` import,

and adds:
- `import Ring from '../../../_shared/stageCard/Ring.js';`

The `obsx` / `hc` CSS-module aliases were retained where the file
still references other classes from `observeExtras.module.css` —
those imports were never Ring-specific.

## Files

**Created**
- `apps/web/src/v3/_shared/stageCard/Ring.tsx` (12 lines)

**Modified (14, all Observe modules)**
- `modules/built-environment/BuiltEnvironmentDashboard.tsx`
- `modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx`
- `modules/earth-water-ecology/EcologicalDetail.tsx`
- `modules/earth-water-ecology/HydrologyDetail.tsx`
- `modules/earth-water-ecology/JarPercRoofDetail.tsx`
- `modules/human-context/HumanContextDashboard.tsx`
- `modules/human-context/StewardSurveyDetail.tsx`
- `modules/macroclimate-hazards/MacroclimateDashboard.tsx`
- `modules/sectors-zones/SectorCompassDetail.tsx`
- `modules/sectors-zones/SectorsDashboard.tsx`
- `modules/swot-synthesis/SwotDashboard.tsx`
- `modules/swot-synthesis/SwotDiagnosisReport.tsx`
- `modules/swot-synthesis/SwotJournal.tsx`
- `modules/topography/TopographyDashboard.tsx`

Net delta: −126 lines of duplicated JSX/type-cast boilerplate,
+12 lines in the shared component, +14 import lines.

## Verification

- `pnpm --filter @ogden/web typecheck` clean (exit 0).
- No Ring/import errors in Vite console after HMR.
- Visual confirmation of the rendered `<Ring>` was not possible in
  this session: the `demo` project's Observe dashboards are
  data-gated ("Site Intelligence is available for real projects.
  The MTC sample ships with mock data only.") and the slide-up
  panel that hosts them did not mount the lazy Dashboard component
  in the preview. The lift is mechanically a pure refactor —
  byte-identical JSX, same CSS-module rule, same DOM output — so the
  typecheck pass is the meaningful gate. First real-project session
  to open an Observe dashboard will exercise the shared component
  end-to-end.

## Follow-ups

- Consider exporting `Ring` from `_shared/stageCard/index.ts` once
  more shared primitives accumulate (currently `index.ts` only
  re-exports the `stageCard` CSS module).
