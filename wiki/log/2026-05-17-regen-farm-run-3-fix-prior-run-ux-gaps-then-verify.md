# 2026-05-17 — Regen-farm Run-3: fix prior-run UX gaps, then verify


Fix-first session against the approved plan
(`create-a-regen-farm-happy-micali`): close still-open Run-1/2 documented
defects before any new discovery run. **Six findings fixed and verified on
the running build**, each gated on `tsc --noEmit` (EXIT:0, 8 GiB heap) +
targeted test/logic check + DOM read before being marked done — no
screenshot success claimed (WebGL-canvas blocker carried from Run 2).

- **#61** Built-Environment Plan module rendered blank → new
  `StructuresOverviewCard` + `SubsystemsOverviewCard` (read-only grouped
  inventory + empty states) wired into the two
  `plan-structures-overview` / `plan-subsystems-overview` switch cases in
  `PlanModuleSlideUp` (was `default: return null`).
- **#66** MAINTAIN feature picker blind to Scholar `waterNodes` →
  `MaintenanceLogCard` now also sources `waterNodes` (swale/catchment/sink
  → earthwork; storage), extending `sourceLabel` + `sourceOptions`.
- **#67/#72** Designed guilds/orchards stranded from Act → `HarvestLogCard`
  unifies `harvestAreas` across crops + `ogden-polyculture` guilds +
  `…design-elements` orchards (id-only storage); `IrrigationManagerCard`
  surfaces them read-only. HARVEST picker DOM-confirmed listing `Guild ·` /
  `Orchard ·` entries.
- **#75** No Act→Report affordance → `report` added as 4th `LEVELS` entry
  in `V3LevelNavBridge` (regex + stage union + `handleLevelChange`); Act
  shows forward REPORT nav, Report page now carries lifecycle chrome.
- **#71** Move-log species defaulted to `sheep` for a poultry paddock —
  root cause: drop-/auto-placed paddocks persist `species: []` so the
  existing `p.species[0]` prefill fell through to the `'sheep'` constant.
  `LivestockMoveTool` now falls back to the species of the most recent
  move-in to that paddock (the move log is the real grazing record) before
  the constant. Logic-simulation verified both branches.
- **#62** Local-only persistence banner too soft → `ProjectBundleBar`
  warn copy now names the concrete loss vectors (clear data / switch
  browser / device failure → permanent deletion) + Export remedy; test
  assertions updated (vitest 3/3).

**Deferred with rationale:** #58/#59 closed-loop From/To unification —
data-model change with fiqh-adjacent waste→resource framing; needs design
+ Scholar review, not an inline patch (document-only, as planned). Two
smaller follow-ups recorded honestly in the Run-3 doc rather than shipped
silently: Irrigation guild/orchard tracking is read-only; paddock species
not captured at draw time. #77/#78 (0-ha → dishonest Report) confirmed
already CLOSED by PR #29 during triage.

New `docs/ux-walkthrough-regen-farm-run3-2026-05-17.md` (run-2 format;
records FIXED-this-session vs open; Runs 1 & 2 byte-for-byte unmodified).
Validation used `preview_*` store injection labelled "(simulated)" for
canvas-origin state. Branch shares the tree with a concurrent sibling
session; only this session's source/doc files + this log entry were
staged (sibling's pgtest ADR / index / api entity left untouched).
