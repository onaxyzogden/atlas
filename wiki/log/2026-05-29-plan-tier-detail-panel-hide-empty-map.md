# 2026-05-29 -- Plan Tier detail-panel: hide the MAP ACTIVATION section when no overlays are bound

Steward flagged a screenshot of the Plan Tier Shell's `ObjectiveDetailPanel`
showing the "MAP ACTIVATION" strip in its empty state ("No overlays bound to
this objective.") with a 260px satellite map still rendering underneath it:
*"why is the map view here? It should not be."* JSX-only follow-up to
[[decisions/2026-05-27-atlas-plan-tier-shell-phase1]] Slice 1.6, sibling to the
same session's [[log/2026-05-29-plan-tier-shell-detail-panel-1-1-2]]
column-width tweak.

## Root cause

In `apps/web/src/v3/plan/tiers/ObjectiveDetailPanel.tsx` the `MapActivationStrip`
and the `<div className={css.mapBody}><ObjectiveMap/></div>` both rendered
**unconditionally**. The strip's empty-state message is driven by
`objective.defaultOverlayBundle.length === 0` inside the OLOS
`OverlayBundleStrip`, but nothing gated the map on that same condition. Every
objective in the current seed (`packages/shared/src/constants/plan/tierObjectives.ts`,
all 8) has `defaultOverlayBundle: []` (bundles are seeded empty, slated for a
later slice), so an empty strip + a pointless map showed on every objective.

## Change

Single file: `apps/web/src/v3/plan/tiers/ObjectiveDetailPanel.tsx`. Derive
`const hasOverlays = objective.defaultOverlayBundle.length > 0;` near the
existing render-prep and wrap the strip + map block in `{hasOverlays && (<>...</>)}`.
When the bundle is empty the **entire** MAP ACTIVATION region unmounts (steward
confirmed scope via AskUserQuestion: hide the eyebrow, the empty-state message,
AND the map); the region reappears automatically once an objective gets a
non-empty bundle.

Gated on `defaultOverlayBundle`, not `activeOverlayIds`: the former is the exact
inverse of the OverlayBundleStrip empty-state (`bundle.length === 0`), so the
section shows iff overlays are available to bind and stays visible while the
steward toggles individual overlays on/off (gating on `activeOverlayIds` would
flicker the map in/out as overlays toggle). The field is a required array on
`PlanTierObjective`, so `.length` is safe.

## Out of scope (intentional)

- `MapActivationStrip.tsx` and OLOS `OverlayBundleStrip.tsx` untouched -- the
  empty-state message stays correct for the strip's other consumer,
  `ObjectiveWorkspace.tsx` ([[feedback-no-deletion]]).
- No seed change (populating bundles is a separate future slice).
- No CSS change -- `.panel` is `display: flex; flex-direction: column` with **no
  `gap`**, so removing the block leaves no vertical gap; `.mapBody` simply does
  not mount.

## Verification

`cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` exit 0
with empty output (a clean run emits nothing) -- zero type errors, no new errors
from the conditional wrap. Live `preview_eval` against project `d2708c91` (the
one in the steward's screenshot) on two objectives spanning both panel states:

- `t0-project-foundation/objective/t0-vision` (status COMPLETE, cyclical-review
  banner due) -- `_mapBody` absent, no map canvas, "Map activation" eyebrow
  absent, "No overlays bound" message absent; panel flows header -> review
  banner -> YOUR DECISIONS.
- `t1-land-reading/objective/t1-land-baseline` (status READY, no banner) --
  same four absences; panel flows header -> YOUR DECISIONS directly, no gap.

Screenshot **captured** this session (tab was visible: `document.hidden === false`,
unlike the sibling column-width task where the hidden tab paused paint) --
confirms the t1 panel goes straight from the header to YOUR DECISIONS -> REFERENCE
with no map region. Reappearance case (non-empty bundle re-shows strip + map) is
sound by construction rather than runtime-executed: the seed const is
bundled/frozen so it cannot be cleanly mutated via the preview, but the steward's
pre-fix screenshot already proved the strip + map render when mounted, and the
guard is the literal boolean inverse of the empty-state the strip already keys
off the same data.

## Branch state

`feat/atlas-permaculture`. Explicit-path commit of exactly 3 files (the
`.tsx` + this log file + the `log.md` pointer), mirroring the Task-1 commit
`63459f5f` file set; heavy foreign WIP from parallel sessions
(capitalPartnerSummary, EconomicsPanel, financialStore, DesignMap, DiagnoseMap,
OperateMap, MaterialSubstitutionsCard, substitutionCatalog, ZoneSomSidebar,
graphify-out/*, evidence/selectors/capitalPartner, WizardStep1Site,
project.schema, projectTypes) left out per [[feedback-no-deletion]].
`git diff --cached --name-only` pre-flight + `git fetch origin
feat/atlas-permaculture` divergence probe before push per
[[feedback-commit-immediately-on-rebased-branches]]. No ADR -- proportion/visibility
tweak too narrow for a standalone record; precedent is the sibling
column-width entry and `1bc907d4` / `a6ee7ae8`, all CSS/JSX-only follow-ups to
the same shell that shipped without their own ADRs; the Phase 1 ADR remains
canonical for Slice 1.6 rationale. CSRA model untouched; ASCII-only copy.
