# 2026-06-09 -- Tier-1+ per-decision mode badges (catalogue-data-driven), Plan + Act

**Objective:** Close the deferred "Tier-1+ per-decision mode-badge rendering" item from the 2026-06-08 HTML-prototype wiring audit ([[log/2026-06-08-html-prototype-wiring-audit-complete]]). The `.mb-*` capture-mode chips rendered in the Tier-0 Act workbench but never for Tier-1+ decisions.

## The gap

The Tier-0 workbench (`DecisionList.tsx`) shows a per-row capture-mode badge via a `modeFor` raw-key resolver + a central `MODE_LABELS` map, fed by hardcoded `*ModeFor(itemId)` switch functions in each bespoke `*Capture.tsx`. Those switches exist at Tier-0 because the mode ALSO routes a bespoke right-panel body. For Tier-1+ decisions no badge rendered at all -- and Tier-1+ has no bespoke capture components, so for them the badge is purely **decorative display metadata** (it routes nothing).

## Decisions confirmed with the operator (AskUserQuestion)

- **Surfaces = Plan + Act both** -- render on the read-only Plan `DecisionChecklist` AND the interactive Act `ActTierExecutionPanel`. Tier-0's `DecisionList` path left untouched (no regression).
- **Mode source = label string on item** -- store the verbatim badge LABEL directly on the catalogue checklist item (new optional `mode?: string`), rendered as-is. No raw-key->label map (Tier-1+ badges are bespoke-per-item, so a map would be ~1:1); no component-side switch functions.

## What shipped (8 files, commit `734282ea` on `main`)

- **schema** (`planStratumObjective.schema.ts`) -- optional `mode: z.string().min(1).optional()` on `PlanDecisionChecklistItemSchema`, after `formulaBinding`. Additive: every existing item validates unchanged. Doc comment marks it DISPLAY-ONLY and distinct from the Tier-0 `modeFor` mechanism.
- **authoring** (`catalogues/authoring.ts`) -- threaded `mode` through the `ck()` opts bag (same shape as `feedHint`/`feedNote`); `ckA`/`ckF` untouched (no badged item this pass also carries answerSpec/formulaBinding).
- **`ModeBadge.tsx`** (NEW, `v3/plan/strata/`) -- one shared presentational chip, inline-styled with the `--color-stage-act*` tokens (mirrors the Tier-0 `.dModeBadge`), reusing the SAME `data-testid={`mode-badge-${itemId}`}` contract; co-located with Plan, imported by Act so the markup + testid stay identical across surfaces.
- **`DecisionChecklist.tsx`** -- renders `{item.mode ? <ModeBadge .../> : null}` after the item-label span in `ReadOnlyItemRow`.
- **`ActTierExecutionPanel.tsx`** -- same render after the label/required marker in the checklist `.map` row (Tier-1+ path; Tier-0 uses the workbench/`DecisionList`).
- **`ecovillage.ts`** -- 35 badges authored across the 6 prototyped objectives, transcribed VERBATIM from the OLOS prototypes; count + order verified 1:1 against each prototype's decision rows before attaching. ev-s2-social-fabric (6), ev-s3-energy-potential (6), ev-s3-infra-condition (5), ev-s4-settlement-strategy (6), ev-s4-food-system (6), ev-s4-financial-model (6). ASCII-only; slashes (`Go/no-go gates`) + hyphen (`Buy-in`) kept verbatim.
- **tests** -- (catalogues.test.ts) schema accepts `mode` + absent-safe + rejects empty; 12 per-objective representative-mode assertions guarding re-order regressions. (DecisionChecklist.test.tsx) render test: a mode-bearing item shows `mode-badge-<id>` with verbatim text, an item without mode has none.

## Verification

- shared `tsc` EXIT 0; web `tsc` EXIT 0 (8GB heap, [[feedback-vitest-bounded-runs]]).
- Bounded `--pool=forks --no-file-parallelism --testTimeout=20000`: catalogues 106/107 (my 2 new tests pass), DecisionChecklist 15/15 (incl. new badge test), ActTierExecutionPanel formal+protocols 11/11 (Act-side import no regression).
- The lone red `catalogues.test.ts` failure (`s1-vision-c4` answerSpec recap) is **foreign-WIP-induced, not mine**: `HEAD:universal.ts` contains `s1-vision-c4`; an uncommitted parallel-session edit to `universal.ts` (NOT in my file set) deleted it, orphaning a pre-existing assertion. My change touches neither `universal.ts` nor that test.
- **Live-preview limitation:** the ecovillage objectives are OUT of the active Homestead+Silvopasture vertical slice, so no live screenshot; sign-off rests on the render unit test + verbatim prototype diff (consistent with prior audit notes, [[project-slice-rescope]], [[project-screenshot-hang]]).

## State

Explicit-pathspec commit of exactly the 8 files; all concurrent foreign WIP left unstaged (`universal.ts`, `DecisionWorkingPanel.tsx`, `ActTierObjectiveRail.tsx`, `LabourInventoryCapture.*`, `.claude/launch.json`, untracked mapsheet wiki log) -- [[feedback-no-deletion]], [[project-structured-capture-on-main]]. On `main` (canonical line).

**Amanah:** ev-s4-financial-model badge copy is member cost-sharing (Buy-in / Levy structure / Fund governance / Hardship protocol / Reserves / Member agreement) -- Amanah-reviewed CLEAN 2026-06-08 (co-owner cost-sharing, no riba / `bay' ma laysa 'indak` / CSRA / salam, [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). All other badges are ecological/social/infrastructural survey labels.

## Deferred (separate workstream, unchanged)

- Bespoke Tier-1+ right-panel work surfaces + a `DecisionWorkingPanel`-style router (the mode badge is decoration; no body routing wired for Tier-1+).
- Migrating Tier-0 to read `item.mode` (left on its `modeFor`/`MODE_LABELS` path).
- Mode icons for Tier-1+ (text-only this pass).
- Badges for Tier-1+ objectives with no prototype (no fabricated data).

ADR [[decisions/2026-06-09-atlas-tier1plus-mode-badges]]; entity [[entities/act-tier-shell]].
