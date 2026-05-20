# 2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration

**Status.** Implemented and **pushed**
(`origin/feat/atlas-permaculture`, commits `0e5c9cb2` → `67b26296` →
`61b37795` + this ADR `856efec8`; verified 2026-05-20 from a parallel
session that found all four commits already on origin). The earlier
"Not pushed" claim was stale — the parallel session pushed the slice
out-of-band before this ADR's first save propagated.

**Follow-ups (queued).**
- 2026-05-20 — canopy overlap dedup via host-envelope clip
  ([wiki/log/2026-05-20-b4-canopy-dedup-host-envelope-cap.md](../log/2026-05-20-b4-canopy-dedup-host-envelope-cap.md)).
  Closes the "multiple guilds on one host claim more canopy than
  physically fits" gap by clipping `rawCanopyM2` at
  `turf.area(host.geometry)` before division; surfaces the discount
  on the card as `canopyClampedM2`. Denominator unchanged (still
  total paddock area — coverage is over the grazed surface, not the
  full silvopasture polygon).
- 2026-05-20 — poultry/waterfowl expansion of
  `LIVESTOCK_BROWSE_TOXICITY`
  ([wiki/log/2026-05-20-b4-poultry-browse-toxicity.md](../log/2026-05-20-b4-poultry-browse-toxicity.md)).
  Seven avian rows added (black_locust avoid for poultry;
  cherry/peach/garlic/garlic_chive caution for poultry+ducks_geese;
  borage caution for poultry; white_oak caution for ducks_geese).
  Each is a separate row from the existing ruminant entry so the
  steward sees per-species rationale and citation inline. No
  infrastructure change — `toxicityForGuild`'s `affects.some` already
  handles the narrowing.
- 2026-05-21 — per-member spatial positions + real `turf.union`
  canopy dedup
  ([wiki/decisions/2026-05-21-atlas-b4-canopy-union-dedup.md](2026-05-21-atlas-b4-canopy-union-dedup.md)).
  `GuildMember` gains optional `position?: [number, number]`
  (guild-local metres); a deterministic ring positioner fills
  positions when undefined; the canopy block now `turf.union`s
  per-member disks resolved through `Guild.center` + position;
  envelope clip preserved as fallback.

## Context

The Bd decomposition ADR
([2026-05-18-atlas-bd-subproject-decomposition](2026-05-18-atlas-bd-subproject-decomposition.md))
defined B4 verbatim as the **integration slice** — not a fourth
biological axis:

> Which guilds shade/shelter/fodder which herds; guild→livestock
> browse/fodder matrix; plant-diversity engineering | the existing
> `silvopastureId` pointer on both Guild and Paddock; B1 + B3 outputs |
> plant-systems / livestock (cross)

The pieces were already in place before this slice:
- `Guild.members[]` / `Guild.silvopastureId?` / `Guild.center?`
  ([polycultureStore.ts:33–92](../../apps/web/src/store/polycultureStore.ts:33)).
- `Paddock.silvopastureId?` / `Paddock.species[]` / `Paddock.areaM2`
  ([livestockStore.ts:28–77](../../apps/web/src/store/livestockStore.ts:28)).
- Host + member resolver `resolveSilvopastureHosts` / `resolveMembers`
  ([silvopastureHosts.ts:79,196](../../apps/web/src/features/agroforestry/silvopastureHosts.ts:79)).
- Plant catalog with `ecologicalFunction[]` (incl. `'fodder'`) and
  `canopySpreadM` ([plantCatalog.ts](../../apps/web/src/data/plantCatalog.ts)).
- AU factors + species data ([speciesData.ts](../../apps/web/src/features/livestock/speciesData.ts)).

What was missing — and what B4 adds — is the cross-read math
(fodder match, browse toxicity, canopy coverage, integration score)
and a single audit card surfacing it.

## User-ratified posture (this session)

Via `AskUserQuestion` in plan mode (verbatim choices):

1. **Card mount:** *cross-registered* in `livestock` and
   `plant-systems` `MODULE_CARDS` (one card, one sectionId, two
   surfacing tabs).
2. **Toxicity catalog scope:** *expanded* (~20–30 entries). Coverage
   was bounded by which plants actually exist in `plantCatalog.ts`
   today; catalog-id misses are **omitted, not stubbed**. 12 honest
   cited entries seeded; the plan's "omitted, not stubbed" clause was
   honoured.
3. **Goal-tree:** *add* new criterion `silvopasture-integration-pct`
   (target 70 %, Y5 deadline) as a sibling of
   `livestock-rotation-rest-compliance-pct` under the existing
   `livestock` sub-goal in `REGENERATIVE_FARM`.

## Decision

Three template-mirrored parts, four commits, strictly additive +
non-covenant:

### Part 1 — Static cited browse-toxicity catalog (commit `0e5c9cb2`)

[livestockBrowseToxicity.ts](../../apps/web/src/features/agroforestry/livestockBrowseToxicity.ts)
exports `ToxicityTier` (`'avoid' | 'caution'`), `BrowseToxicityEntry`,
`LIVESTOCK_BROWSE_TOXICITY: BrowseToxicityEntry[]`, and
`toxicityForGuild(members, herd) → BrowseToxicityEntry[]`. 12 cited
entries (Cornell CALS, Merck Vet Manual, ASPCA APCC, USDA Plant Guide):
`black_walnut` (juglone → horses), `cherry`/`peach` (Prunus wilted-leaf
cyanide → ruminants + horses), `pecan` (Carya juglone caution → horses),
`black_locust` (robin/phasin → horses + cattle), `elderberry` (cyanogenic
glycosides caution → ruminants + horses), `comfrey`/`borage`
(pyrrolizidine alkaloids → horses + ruminants), `garlic`/`garlic_chive`
(Allium Heinz-body anemia → ruminants + horses), `persimmon` (phytobezoar
caution → cattle + horses), `white_oak` (gallotannins caution →
ruminants). Doc-comment explicitly disclaims vet-grade and financial
framing.

Colocated test
[livestockBrowseToxicity.test.ts](../../apps/web/src/features/agroforestry/__tests__/livestockBrowseToxicity.test.ts)
— 15 cases: every `speciesId` resolves in `PLANT_CATALOG`; every
`affects` member is in `LIVESTOCK_SPECIES`; non-empty
rationale + citation; tier domain; no duplicate (species,affects);
`toxicityForGuild` exact-id match (no partial-name false positives);
herd narrowing; empty-input handling; covenant
`not.toMatch(/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i)`
over `readFileSync` of the module text (with doc-comment stripped).

### Part 2 — Pure tri-axis integration math (commit `67b26296`)

[guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts)
exports `HostIntegrationRow`, `SilvopastureIntegrationReport`,
`computeSilvopastureIntegration(args)`, and
`computeSilvopastureIntegrationPct(args)` (thin wrapper returning
`overallPct` for the goal-tree).

Per host (silvopasture polygon):
- **fodderMatches**: distinct `plantCatalog` ids whose
  `ecologicalFunction.includes('fodder')`, surfaced as
  `{speciesId, commonName}`.
- **toxicityFindings**: `LIVESTOCK_BROWSE_TOXICITY` narrowed to (guild
  member ids ∩ catalog) **and** the herd species actually paddocked at
  this host (so a Taxus + cattle-only herd never flags a horse entry).
- **canopyCoveragePct**: Σ π·(`canopySpreadM`/2)²·n across guild members
  ÷ Σ host paddock area (m²) × 100, capped at 100; members missing
  `canopySpreadM` are skipped (not zeroed).
- **integrationScore (0..100)**: `scoreFodder(matchCount)` (min(60,
  matches × 12), monotone) + `scoreCanopy(pct)` (min(40, pct × 0.4),
  linear) − `toxicityPenalty` (avoid 15, caution 5), clamped 0..100.
- **overallPct**: mean integrationScore across hosts that actually
  carry at least one paddock or guild (zero-member hosts do not drag
  the parcel mean down); 0 when no non-empty hosts.

**Reuses, does not fork:** `resolveSilvopastureHosts` + `resolveMembers`
(host + pin/overlap resolution), `PLANT_CATALOG`,
`LIVESTOCK_BROWSE_TOXICITY`, `toxicityForGuild`.

Colocated test
[guildLivestockMath.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts)
— 13 cases covering empty/no-host, host with no members excluded from
mean, distinct + named fodder list, scoring monotone in fodder count,
toxicity narrowed by paddocked herd, toxicity reduces score, canopy
cap at 100, missing `canopySpreadM` skipped (not zeroed), `overallPct`
non-empty-mean rule, criterion-wrapper parity, pin vs spatial overlap
parity, covenant lock.

### Part 3 — Card + cross-registration + criterion (commit `61b37795`)

Render-only audit card
[SilvopastureIntegrationCard.tsx](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
(+ colocated `.module.css`), livestock-module house style
(`{ projectId }` prop, no save gate). Reads `useLivestockStore`,
`usePolycultureStore`, `useCropStore`, `useDesignElementsForProject`
filtered by `projectId`, calls `computeSilvopastureIntegration` in a
single `useMemo`. Renders per host: name + integration score, paddock
/ guild counts + canopy %, fodder species chips (cap 8 + "+N more"),
avoid/caution toxicity pills with rationale + citation. Empty state
directs steward to draw a silvopasture polygon in the plant-systems
module.

**Cross-registration** — one new sectionId
`plan-silvopasture-integration` pushed into **both** `MODULE_CARDS`
arrays in [types.ts](../../apps/web/src/v3/plan/types.ts) (livestock +
plant-systems); centralised render in
[PlanModuleSlideUp.tsx](../../apps/web/src/v3/plan/PlanModuleSlideUp.tsx)
(lazy import + one switch arm). Cross-registration does **not** trigger
the never-guarded 6-touchpoint contract because no `PlanModule` union
member is added.

**Goal-tree criterion** — `silvopasture-integration-pct` (target 70 %,
deadlineYear 5) appended as sibling of
`livestock-rotation-rest-compliance-pct` in
[goalTreeTemplates.ts](../../apps/web/src/v3/plan/data/goalTreeTemplates.ts);
wired in
[CriteriaForecastTab.tsx](../../apps/web/src/v3/plan/cards/goal-compass/CriteriaForecastTab.tsx)
via `computeSilvopastureIntegrationPct`, mirroring the
`computeRestCompliancePct` pattern exactly.

## A-series additive covenant (held)

No DB migration · no API endpoint · no schema change · no
`Record<PlanModule,_>` change · no new `PlanModule` member · no
`syncManifest` entry · no spine mutation · no persist version bump ·
no new store.

## Covenant (non-financial / ecological only)

"Integration" here is strictly ecological: fodder × canopy × toxicity.
Never a financial or yield-as-return notion. Doc-comments include
explicit negative declarations; both new test files contain a
`not.toMatch(/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i)`
lock over `readFileSync` of the module text (with doc-comments
stripped first). Release-gate covenant grep over all 6 new + 4 edited
B4 surfaces: only negative declarations + the test-file lock patterns
matched.

## Verification

- **Typecheck:** `apps/web` tsc exit 0 clean over the B4 surfaces;
  `packages/shared` untouched.
- **Tests:** targeted vitest
  `livestockBrowseToxicity` (15) + `guildLivestockMath` (13) all green;
  full web suite **1326/1326 passed (125 files)** in 59.37 s — no
  regression vs the 1282 post-B3.1 baseline (the +44 delta covers
  the 28 new B4 tests plus the out-of-band B3 plan-vs-actual slice
  that landed between B3.1 and B4).
- **Build:** `vite build` exit 0 (37.00 s, `--max-old-space-size=8192`).
- **Covenant grep:** clean over all 6 new + 4 edited B4 files.
- **Additive-isolation audit:** per-commit `git diff-tree --no-commit-id
  --name-only -r <sha>` confirms each B4 commit touches only its
  planned files; zero DB / API / schema / `Record<PlanModule,_>` /
  `syncManifest` / `PlanModule` union / spine / persist-key churn.
- **Citation audit (Part 1):** every entry has a non-empty `citation`
  + `rationale`; every `speciesId` resolves in `PLANT_CATALOG`;
  asserted by the colocated test.
- **Live preview:** card sits behind the `livestock` / `plant-systems`
  Plan slide-up; per the screenshot-honesty rule, the MapLibre/WebGL
  hang behind the Plan slide-up persists — **screenshot disclosed
  not faked**. Pure-math tests + tsc + criterion-forecast wiring are
  the authoritative proof (B-series precedent).

## Out of scope / deferred

- **Toxicity catalog expansion beyond catalog-id coverage.** The user
  ratified 20–30 entries, but only ~12 well-documented livestock-toxic
  plants currently exist as ids in `plantCatalog.ts`. The plan's
  "omitted, not stubbed" clause was honoured — when the catalog grows
  to include Nerium, Taxus, Rhododendron, red maple, Cestrum etc.,
  add the cited entries then.
- **Editable affordances on the card.** Strictly an audit surface; any
  later editable companion (pinning a guild from the card, etc.) is a
  separate slice.
- **B5 (beneficial-organism habitat spec).** Now unblocked — its own
  brainstorm → spec → plan cycle.

## Files

**New (6):**
- [apps/web/src/features/agroforestry/livestockBrowseToxicity.ts](../../apps/web/src/features/agroforestry/livestockBrowseToxicity.ts)
- [apps/web/src/features/agroforestry/__tests__/livestockBrowseToxicity.test.ts](../../apps/web/src/features/agroforestry/__tests__/livestockBrowseToxicity.test.ts)
- [apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts)
- [apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts)
- [apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
- [apps/web/src/features/agroforestry/SilvopastureIntegrationCard.module.css](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.module.css)

**Edited (4, additive-only hunks):**
- [apps/web/src/v3/plan/types.ts](../../apps/web/src/v3/plan/types.ts) — 2 `MODULE_CARDS` push lines
- [apps/web/src/v3/plan/PlanModuleSlideUp.tsx](../../apps/web/src/v3/plan/PlanModuleSlideUp.tsx) — lazy import + switch arm
- [apps/web/src/v3/plan/data/goalTreeTemplates.ts](../../apps/web/src/v3/plan/data/goalTreeTemplates.ts) — 1 criterion entry
- [apps/web/src/v3/plan/cards/goal-compass/CriteriaForecastTab.tsx](../../apps/web/src/v3/plan/cards/goal-compass/CriteriaForecastTab.tsx) — store imports + map entry

## References

- [2026-05-18 Bd — Sub-project decomposition](2026-05-18-atlas-bd-subproject-decomposition.md) (B4 verbatim scope, line 64)
- [2026-05-18 B1 — plant-system design integrity](2026-05-18-atlas-b1-plant-system-design-integrity.md)
- [2026-05-18 B2 — soil food-web](2026-05-18-atlas-b2-soil-food-web.md)
- [2026-05-19 B2.1 — soil food-web / compost hardening](2026-05-19-atlas-b2-1-soil-compost-hardening.md)
- [2026-05-18 B3 — rotational-grazing sequencer](2026-05-18-atlas-b3-rotational-grazing-sequencer.md)
- [2026-05-19 B3.1 — rotational-grazing sequencer hardening](2026-05-19-atlas-b3-1-rotational-grazing-hardening.md)
