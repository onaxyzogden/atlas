# 2026-04-25 — §11 PredatorRiskHotspotsCard shipped (commit `48025c5`)


Feature → per-paddock predator-pressure breakdown mounted on
`LivestockDashboard` between `PastureUtilizationCard` and the
existing one-line welfare summary. Graduates the dashboard's
predator coverage from "X high, Y moderate" count into an
actionable per-paddock view with drivers and mitigations.

**Files:**
- `apps/web/src/features/livestock/PredatorRiskHotspotsCard.tsx` (~320 lines)
- `apps/web/src/features/livestock/PredatorRiskHotspotsCard.module.css` (~175 lines)
- `apps/web/src/features/dashboard/pages/LivestockDashboard.tsx` —
  import + mount
- `packages/shared/src/featureManifest.ts` —
  `predator-risk-zone-map` (§11, P3) `partial` → `done`

**Layered analysis (composes existing `computePredatorRisk` baseline):**
- **Species vulnerability** — poultry / ducks-geese / rabbits / bees
  rank highest (bumps band +1); sheep / goats / pigs mid; cattle /
  horses lowest (neutral). Vulnerable species gate the
  "guardian animal" + "night shelter" mitigations.
- **Edge density** — `perimeter / sqrt(area)` > 6 (long thin shape vs.
  perfect square = 4) bumps band +1; surfaces "subdivide into more
  compact cells" mitigation.
- **Fencing type** — `electric` drops band −1; `none` / `temporary`
  bumps +1 with "upgrade to permanent electric or woven-wire"
  mitigation; `post_rail` adds an "add electric offset wire"
  mitigation when species are vulnerable.
- **Shelter proximity** — no `animal_shelter` / `barn` / `pavilion`
  placed (or nearest > 300 m) bumps band +1 for vulnerable species,
  surfaces "place shelter within 300 m" mitigation.

Output: tone-coded list (green low / gold moderate / coral high)
ranked highest-risk first, header badge `{H}H · {M}M · {L}L`. Each
paddock card shows drivers (one bullet per overlay that fired) and
up to three mitigations from the static library, deduplicated.

All overlays presentation-layer only — no shared-package math.
Geometry helpers (centroid, area, perimeter via equirectangular
approximation) live inline in the card.

**Verification:** `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` exits clean. Selective stage of 4 files only — used
`git checkout HEAD -- packages/shared/src/featureManifest.ts` to
quarantine an unrelated working-tree change at line 444 before
re-applying the §11 line for a single-purpose commit.
