# 2026-04-29 — Manitoba Schedule A subcategory picker (per-species AU)


### Done

Replaces the single representative AU factor per species (`AU_FACTORS[species]`) with an opt-in per-paddock-per-species Manitoba Schedule A subcategory picker, the last deferred item from the 2026-04-29 popup-fixes plan. AU rollups now compute against the precise subcategory factor when a paddock records a choice, falling back to the legacy single number when it does not — so existing data is unchanged.

**Data layer**
- New [`apps/web/src/features/livestock/scheduleA.ts`](../apps/web/src/features/livestock/scheduleA.ts) — typed `ScheduleASubcategory[]` catalog with 28 entries spanning the Manitoba Schedule A taxonomy plus four approximation rows for goats / ducks-geese / rabbits / bees (flagged `inScheduleA: false`). Exposes:
  - `MANITOBA_SCHEDULE_A` — the catalog
  - `getScheduleAOptions(species)` — filtered options for the picker
  - `getSubcategoryById(id)` — reverse lookup
  - `auFactorFor(species, subcategoryId?)` — resolves to the subcategory factor when valid, else the legacy `AU_FACTORS[species]`
  - `DEFAULT_SUBCATEGORY_BY_SPECIES` — chosen so the resolved factor matches the legacy single-number table to within rounding
- Coefficients to 3 decimals, sourced from Manitoba's Livestock Manure and Mortalities Management Regulation, Schedule A. Anchor: 1 AU = 73 kg N excreted/yr.

**Store**
- [`livestockStore.ts`](../apps/web/src/store/livestockStore.ts) — `Paddock.scheduleASubcategoryBySpecies?: Partial<Record<LivestockSpecies, string>>`. Optional, undefined for legacy paddocks.

**Math**
- [`speciesData.ts`](../apps/web/src/features/livestock/speciesData.ts) — `computeAnimalUnits` accepts an optional `subcategoryId` per row and routes through `auFactorFor`. Backward-compatible default.
- [`livestockAnalysis.ts`](../apps/web/src/features/livestock/livestockAnalysis.ts) — `InventoryEntry` gained optional `bySubcategory[]`. `computeInventorySummary` reads `paddock.scheduleASubcategoryBySpecies[species]` and bins head counts per subcategory id when set.
- [`HerdRotationDashboard.tsx`](../apps/web/src/features/dashboard/pages/HerdRotationDashboard.tsx) — `totalAU` useMemo now expands each species line into one row per subcategory (plus an "untagged" remainder when paddocks don't all record one) before calling `computeAnimalUnits`. Existing dashboard UI unchanged; AU number simply sharpens.

**UI**
- [`LivestockPanel.tsx`](../apps/web/src/features/livestock/LivestockPanel.tsx) — new `scheduleA` form state, seeded with `DEFAULT_SUBCATEGORY_BY_SPECIES[sp]` whenever a species is checked. The stocking-info hint box gains a small `<select>` per species (only when ≥2 options exist) showing `label — N.NNN AU/head` plus an "(approx.)" suffix for non-Schedule-A approximations. Save handler persists `scheduleASubcategoryBySpecies` only when at least one species has a non-empty pick.

### Verified

- `tsc --noEmit` clean across the entire web app.
- Hand-checked: 100 head of `cattle` with no subcategory → 100 × 1.250 = 125 AU (legacy path). Same 100 head as `cattle:backgrounder` → 100 × 0.625 = 62.5 AU. Mixed paddock with explicit choice + a paddock without one bins correctly in the dashboard rollup (`bySubcategory` accounts for tagged head, "untagged" remainder uses default factor).

### Files

- `apps/web/src/features/livestock/scheduleA.ts` (new)
- `apps/web/src/features/livestock/speciesData.ts`
- `apps/web/src/features/livestock/livestockAnalysis.ts`
- `apps/web/src/features/livestock/LivestockPanel.tsx`
- `apps/web/src/features/dashboard/pages/HerdRotationDashboard.tsx`
- `apps/web/src/store/livestockStore.ts`
