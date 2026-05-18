# 2026-05-18 — B2: Soil food-web layer (Sub-project B, second slice)

## Context

Sub-project B was decomposed into B1–B5
(`atlas/wiki/decisions/2026-05-18-atlas-bd-subproject-decomposition.md`).
**B1 (plant-system design integrity) is built, verified, committed
(`c83f18ed`) and pushed** — it provides the valid-guild assumption B2
depends on. B2 is the second B slice.

Scope from the B1–B5 ADR: *root-exudate / mycorrhizal profile mapping
per species feeding a soil-biology design view; compost / vermicompost
/ compost-tea cycle planning*. Lives in the already-registered
`soil-fertility` plan module. Additive, non-covenant (no riba/gharar),
A-series additive covenant (no DB migration, no API endpoint,
client-side first, isolated persist slice).

Confirmed decisions (this session):
- **Separate B2 lookup module** `soilBiologyProfiles.ts` — `plantCatalog`
  has no mycorrhizal/exudate fields and is not extended; B2 owns its
  static profile table (speciesId → mycorrhizal type + exudate class).
  Mirrors B1's "own pure module, read catalog only for labels" stance.
- **New persisted cycle designer** in a *separate* additive Zustand
  persist slice (`ogden-compost-cycle`, `version:1`, no `temporal`, no
  `migrate`). The existing read-only `compostInventoryStore` /
  `closedLoopStore` are untouched; the new store reads inventory volumes
  for a display-only C:N hint, no cross-store writes.
- **No goal-tree criterion** — mirrors the B1 / `EdgeConnectivityCard`
  / `TemporalCoherenceCard` precedent. B2 has no observation stream to
  score, so it is not added to `goalTreeTemplates.ts` and never blocks
  a save. (Refines the ADR's generic "B adds criteria" line — a
  per-part call the ADR explicitly deferred to build time.)

## Architecture

Two cards, mirroring the proven B1 template (pure math module +
colocated tests + read-only audit card + net-new additive persist
store + editable designer card + 2-file registration).

### Card A — Soil food-web audit (read-only)

**Pure module** `apps/web/src/v3/plan/cards/soil-fertility/soilFoodWebMath.ts`
(mirrors `guildIntegrityMath.ts`; no React, no store import —
deterministic, takes `Guild[]`):

- Reads a static B2-owned lookup
  `apps/web/src/v3/plan/cards/soil-fertility/soilBiologyProfiles.ts`:
  `Record<speciesId, { mycorrhiza: 'arbuscular' | 'ecto' | 'ericoid' |
  'none'; exudateClass: 'sugar' | 'organic_acid' | 'phenolic' |
  'mixed'; note?: string }>`.
- `resolveProfile(speciesId)` — two-tier fallback (speciesId →
  normalized common-name probe), returns `{ matched, profile }`.
- Per-guild checks → flat `SoilWebFinding[]`:
  1. *Mycorrhizal-network coherence*: warn when a guild mixes
     incompatible mycorrhizal types around its anchor (e.g. an
     ecto-dominant anchor with arbuscular-only understory — no shared
     hyphal network).
  2. *Dominant-exudate rollup*: info-level per-guild dominant exudate
     class (rhizosphere character signal; no false precision).
  3. *Unmatched*: explicit `unmatched` **info** finding when a species
     has no profile — never a false all-clear (B1 covenant).
- `SoilWebFinding { guildId, guildName, kind:
  'mycorrhiza' | 'exudate' | 'unmatched', severity:
  'error' | 'warning' | 'info', speciesA, speciesB?, labelA,
  labelB?, rationale }`; `checkGuild(guild)` / `checkGuilds(guilds)`.

**Card** `SoilFoodWebCard.tsx` — clones `GuildIntegrityCard.tsx`
scaffold (`Props { project: LocalProject; onSwitchToMap: () => void }`,
`stageCard.module.css`), reads guilds via `usePolycultureStore`
filtered by `project.id`, `useMemo(checkGuilds)`, renders severity
rollup + per-guild findings + matrix-blind info rows. No store writes,
no save gate, no goal-tree criterion.

### Card B — Compost cycle designer (editable, persisted)

**New store** `apps/web/src/store/compostCycleStore.ts` — standalone
`create()(persist(...))`, key **`'ogden-compost-cycle'`**, `version:1`,
**no `temporal`, no `migrate`** (separate slice → zero risk to
`ogden-compost-inventory` / `ogden-closed-loop`). Shape:
`byProject: Record<projectId, CompostBatch[]>` where
`CompostBatch = { id, method: 'hot' | 'cold' | 'vermicompost' |
'compost_tea', startDateISO, turnEveryDays?, readyDateISO?,
feedstockNote?, status: 'planned' | 'active' | 'cured' }`; actions
`addBatch / updateBatch / removeBatch / clearProject`.

**Card** `CompostCycleCard.tsx` — `stageCard.module.css`; editable
batch rows auto-persist (no save gate, matches existing
auto-persist designer cards); method-driven cadence hint (hot ≈ weekly
turn / ≈ 8-week cure, cold ≈ 6–12 months, vermicompost ≈ 12 weeks,
compost-tea ≈ 24–48 h brew); reads `compostInventoryStore` feedstock
volumes for a **display-only** C:N context line (no cross-store
writes); inline non-blocking warnings (ready-before-start date,
negative/zero turn cadence, batch with no feedstock note). Lede notes
the closed-loop graph remains the read-only system projection.

### Registration (exactly 2 files — module already registered)

- `apps/web/src/v3/plan/types.ts` — append to
  `MODULE_CARDS['soil-fertility']`:
  `{ label: 'Soil food-web', sectionId: 'plan-soil-foodweb' }`,
  `{ label: 'Compost cycle', sectionId: 'plan-compost-cycle' }`.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — 2 `lazy()` imports + 2
  `renderPlanCard` switch cases; bump the card-count comment.

`soil-fertility` is already a registered module → no `PlanModule`
union member added, so every `Record<PlanModule, _>` map and the
`never`-guarded switch stay inert (confirmed by `tsc`, not edited).

## Data flow

- *Card A:* `usePolycultureStore(s => s.guilds)` → filter by
  `project.id` → `useMemo(() => checkGuilds(guilds))`. Pure module
  reads only `soilBiologyProfiles.ts` + `findEntry` for labels. Zero
  writes. Same reactive shape as `GuildIntegrityCard`.
- *Card B:* `useCompostCycleStore` keyed by `project.id`; every row
  edit calls a store action → auto-persists to `ogden-compost-cycle`.
  Read-only context line pulls `compostInventoryStore` volumes for a
  C:N hint (display only — no cross-store writes, no coupling).

## Error handling / edge cases

- `resolveProfile` two-tier fallback; unmatched species → explicit
  `unmatched` **info** finding (never a false all-clear — B1 covenant).
- Empty guild / no guilds → `checkGuilds` returns `[]`; card shows the
  empty state (B1 pattern).
- Cycle designer: non-blocking inline warnings only (ready-before-start,
  negative/zero cadence, missing feedstock note). No save gate; nothing
  blocks persistence.
- `noUncheckedIndexedAccess` is on — guard all member/array index
  access (`const mi = members[i]; if (!mi) continue;`) as in B1.

## Testing / verification

- `soilFoodWebMath.test.ts` (colocated): matched profile resolves;
  unmatched → info finding; mycorrhizal-incoherence warning;
  dominant-exudate info rollup; empty guild → `[]`; `checkGuilds`
  flattens across guilds.
- `compostCycleStore.test.ts` (`// @vitest-environment happy-dom`):
  add/update/remove idempotency, per-project isolation, clearProject.
- `tsc -p apps/web` + `tsc -p packages/shared` (shared untouched —
  confirm no transitive break). Pre-existing out-of-band D0 errors
  (`useFlowEndpointOptions`, `workItemStore*`) expected and ignored —
  not B2.
- Cards are plain React behind module nav → DOM/unit tests are the
  authoritative gate; no browser screenshot claimed (screenshot-honesty
  rule).

## Risk / blast radius

- **Primary risk — profile coverage:** the static `soilBiologyProfiles`
  table will not cover every catalog species. Mitigated by mandatory
  two-tier resolution + explicit `unmatched` info finding (never a
  false all-clear), same shape as B1's crop-name bridge.
- Mycorrhizal-coherence and cadence hints are documented heuristics —
  no false precision, info/warning severity only, never error-blocking.
- **Additive only:** no existing card/store/schema/API/goal-tree/
  `Record<PlanModule, _>` modified; only 2 append-only wiring edits.
  New persist key isolated from `ogden-compost-inventory` /
  `ogden-closed-loop` (no `migrate`, no `temporal`).

## References

- `2026-05-18-atlas-bd-subproject-decomposition.md` — B1–B5 scope.
- `2026-05-18-atlas-b1-plant-system-design-integrity.md` — the proven
  template B2 mirrors exactly.
- `EdgeConnectivityCard` / `TemporalCoherenceCard` — design-validator
  (no goal-tree criterion) precedent.
