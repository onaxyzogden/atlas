# 2026-06-09 -- Tier-0 capture adoption Phase 3a: Land reading (S2) -- four multi-mode captures

**Branch.** `main` (canonical; `feat/structured-capture-forms` is an ancestor,
merged out-of-band `763415ee`). **Nothing pushed**
([[project-structured-capture-on-main]], [[project-branch-rebase]]).

First Phase-3 sub-phase of the OLOS-UI mockup-adoption plan (third-column
`DecisionWorkingPanel` captures). The four S2 "land reading" objectives each
gained a bespoke multi-mode capture, all cloning the established EcologyCapture
controlled contract. Built via superpowers:subagent-driven-development (fresh
implementer per capture + two-stage review: spec-compliance then code-quality).

## The four captures

| Capture | Objective | Items / modes | Commit |
|---|---|---|---|
| `TerrainCapture` | `s2-terrain` | 5: mapSource / slope / elevation / landform / erosion | `246cd649` (+`b4fe6832` ASCII fix) |
| `ClimateCapture` | `s2-climate` | 6: rainfall / temperature / wind / solar / fire / microclimate | `f50cd022` |
| `EcologyCapture` | `s2-ecology` | 5: vegetation / species / corridors / connectivity / waterHabitat | `2643e828` |
| `LandscapeContextCapture` | `ev-s2-landscape-vectors` | 6: landUse / sprayRisk / planning / community / disputes / catchment | `8db07f18` |

## Shared contract (EcologyCapture template)

CONTROLLED/pure: `model = decode<X>(mode, value)` each render; full next model via
`onChange(encode<X>(...))`. A pure TOTAL `<x>ModeFor(itemId)` mapper returns one
of N mode strings or null (TOTAL switch, null default). Per-mode
discriminated-union models keyed on `kind`. Each mode persists its own keys in a
flat per-item `FormValue` (`Record<string, string | string[]>`). `decode` is
TOTAL/defensive (non-array -> empty via asArr/asStr, per-entry try/catch
JSON.parse, allow-list `Set`s reject unknown enums -> defaults, **never fabricates
seeds**, mints deterministic `legacy-<x>-<i>` ids for legacy rows missing id
outside crypto, ends with a `never`-typed throwing default); `encode` is a
lossless exported inverse; plus `is<X>Valid` / `summarise<X>`. Stable per-row ids
via a module-scoped `makeRowId()` (crypto.randomUUID + fallback) in EVENT HANDLERS
only, used as React keys (not index). Each capture renders ONLY the `.rb` body
blocks; the panel owns all chrome.

## Wiring (5 sites per capture)

(1) `DecisionWorkingPanel.tsx` -- import + `is<X>?` flag on `DecisionPanelTarget`
+ decode-once block + validity / gate-note / record-summary / body-router arms;
(2) `ActTierZeroWorkbench.tsx` `buildDecisionTarget` -- `is<X> =
item.id.startsWith('<prefix>-')`; (3) `workbenchAffordances.ts` -- import the
mapper + a `MAP` entry (`showGroups:true`, empty strips, prefix-guarded
`modeFor`); (4) `DecisionList.tsx` `MODE_LABELS` entries; (5) `ActTierShell.tsx`
-- objective id into `TIER_ZERO_OBJECTIVE_IDS`. The Phase-2 affordance descriptor
([[decisions/2026-06-08-atlas-workbench-affordance-descriptor]]) pays off here:
each new S2 objective is one descriptor entry + the id, no `ActTierZeroWorkbench`
special-casing.

## LandscapeContextCapture specifics (this session's build)

Ports `olos_landscape_context.html` for the ecovillage objective
`ev-s2-landscape-vectors` (EV-S2.7, 6 items c1..c6, 3 decision groups; catalogue
owned by a concurrent session, read-only). Four growable registers (`landUse`,
`sprayRisk`, `community`, `disputes`) via `makeRowId()`; `planning` = 4 fixed
single-select environment cards (selected starts null; action block only when
selected); `catchment` = **FIXED 4-vector contamination scaffold** (keys
`agRunoff` / `roadRunoff` / `wildfireAsh` / `industrialLegacy`, GENERIC
non-site-specific titles+descs, severity single-select + editable monitoring
textarea; decode reconstructs all 4 in fixed order). The fixed-scaffold-with-
generic-content choice mirrors ProvisionBalance c5 and honours "decode never
fabricates seeds" -- **NO site-specific mockup demo prose seeded** (no Ridgeline
Road / Commonground / Castlemaine / VCAT / 20,000 L). Validity per mode (landUse
>=1 named; sprayRisk >=1 named WITH severity; planning selected != null; community
>=1 named; disputes >=1 named OR non-empty lessons; catchment >=1 vector with
severity). `encode` / `isLandscapeValid` / `summariseLandscape` carry an unused
`mode` param (`void mode;`) for call-site symmetry -- a deliberate minor
divergence from the EcologyCapture template.

## Amanah

All four are pure landscape / climate / ecology / planning / contamination survey
surfaces -- no finance, riba, gharar, or `bay' ma laysa 'indak`; cleared without
Scholar-Council routing ([[fiqh-csra-erased-2026-05-04]]).

## Verified

Four isolated bounded `--pool=forks` suites ([[feedback-vitest-bounded-runs]]) --
Terrain 31, Climate 35, Ecology 28, Landscape 33 = **127 tests green**; web `tsc`
EXIT 0 (8GB heap); ASCII-only. Each capture passed both review stages
(spec-compliance then code-quality).

## Surgical staging around a concurrent session

A second Claude Code session was committing an `ACT_COPY` / `copy/index.js`
copy-refactor to the SAME three contended wiring files (`DecisionWorkingPanel` /
`ActTierZeroWorkbench` / `DecisionList`) during the landscape build. A whole-file
`git add` would have captured their untracked, uncommitted `copy/` WIP into my
commit (broken build -- the WIP depends on an uncommitted module). Resolved by
hunk-level staging: `git diff -U0 --no-color -- <file> | <filter> | git apply
--cached --unidiff-zero --recount`, where the filter drops any hunk containing a
foreign marker (`ACT_COPY` / `copy/index` / `feedsFallback`). `-U0` splits the
mixed import hunk so only my landscape import stages; `--recount` makes git apply
recompute line counts. Verified pre-commit: **0 foreign markers staged, 214
landscape markers staged**, foreign hunks preserved unstaged + byte-identical in
the working tree. Landscape committed `8db07f18` (8 files, +2990) on `main`,
explicit pathspec, not pushed. Temp filter script removed post-commit.

## Screenshot gate DEFERRED (not skipped)

The Phase-3a sub-phase gate requires screenshot verification, but the four S2
captures are **not** registered in the map-free `/v3/components` gallery harness,
and the only other visual path is the live workbench (dead dev API + WebGL map
canvas, [[project-screenshot-hang]]). A clean full-suite gate is additionally
blocked while the concurrent session's uncommitted `ACT_COPY` WIP sits in the
working tree (running it would test their incomplete work, not my committed code).
Per CLAUDE.md no visual pass is claimed without a screenshot.

## Next

- **Phase-3a close (follow-up):** register the four captures in the
  `/v3/components` gallery, batch-screenshot all four vs their mockups; run the
  clean full bounded `vitest` suite once the concurrent session's `ACT_COPY` WIP
  has landed (so the tree is clean).
- **Phase 3b-3f:** ~22 remaining S2-S7 captures per the MOCKUP_REGISTRY (3b
  Capacity, 3c Livestock/silvopasture, 3d Soil & food, 3e Water/energy/settlement,
  3f Communal infra & finance -- `ev-s4-financial-model` Amanah-screened at
  kickoff).
- **Deferred (recorded):** SP1 Group 4 `EvConflictFrameworkCapture`
  (`ev-s1-conflict-framework`); `TIER_ZERO_OBJECTIVE_IDS` -> "workbench-routed"
  rename (cosmetic); 4 landscape code-quality Minors (all optional).

Entity [[entities/act-tier-shell]]; clones the EcologyCapture multi-mode pattern;
catchment fixed-scaffold + "decode never fabricates" mirror
[[decisions/2026-06-08-atlas-ev-provision-balance-capture]].
