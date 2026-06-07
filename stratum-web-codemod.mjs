// stratum-web-codemod.mjs — Slice 2.7 (apps/web) Tier -> Stratum consumer cascade.
//
// SCRATCH / NOT COMMITTED (like the repo's _dump_*.py scratch files and the
// sibling stratum-codemod.mjs for packages/shared). Scoped, allowlist-bound,
// word-boundary symbol rename + slug/ref renumber. Verified by `tsc --noEmit` +
// `git diff` review. Run from repo root:
//
//   node stratum-web-codemod.mjs
//
// Allowlist = exactly the apps/web files that tsc flagged after the shared
// Slice-1 rename (plus the .tierId-field-access files). Deliberately EXCLUDES
// store/planTierStore.ts (kept `tierId` positional params, already green) and
// every denylisted "tier" surface (showcase/subscription/pipeline). Routes
// (`/plan/tier/` -> `/plan/stratum/`) are hand-edited afterward — SYMBOLS only
// rewrites the `$tierId` param token, not the `/tier/` path segment.
import { readFileSync, writeFileSync } from 'node:fs';

const W = 'apps/web/src';
const FILES = [
  // tests (block tsc now; also extended in Slice 4)
  `${W}/store/__tests__/fieldActionStore.migrate.test.ts`,
  `${W}/store/__tests__/fieldActionStore.observeWiring.test.ts`,
  // act / field-action
  `${W}/v3/act/field-action/ActMapView.tsx`,
  `${W}/v3/act/field-action/ActObjectiveHeader.tsx`,
  `${W}/v3/act/field-action/FieldActionFilter.tsx`,
  `${W}/v3/act/field-action/NextUpCard.tsx`,
  `${W}/v3/act/field-action/objectiveLookup.ts`,
  `${W}/v3/act/field-action/seedDemoActions.ts`,
  `${W}/v3/act/field-action/useFieldActions.ts`,
  `${W}/v3/act/field-action/ViewAObjectiveExecution.tsx`,
  // act / tier-prototype
  `${W}/v3/act/tier-prototype/ActProtoExecutionPanel.tsx`,
  `${W}/v3/act/tier-prototype/ActProtoMapMarkers.tsx`,
  `${W}/v3/act/tier-prototype/actProtoMock.ts`,
  `${W}/v3/act/tier-prototype/ActProtoObjectiveCard.tsx`,
  `${W}/v3/act/tier-prototype/ActProtoObjectiveRail.tsx`,
  `${W}/v3/act/tier-prototype/ActProtoSpine.tsx`,
  `${W}/v3/act/tier-prototype/ActProtoTierShell.tsx`,
  // home
  `${W}/v3/home/NextUpCard.tsx`,
  // observe
  `${W}/v3/observe/dashboard/revision/PlanRevisionBanner.tsx`,
  `${W}/v3/observe/dashboard/revision/resolveDomainForObjective.ts`,
  // plan
  `${W}/v3/plan/objectiveCatalog.ts`,
  `${W}/v3/plan/tiers/CyclicalReviewModal.tsx`,
  `${W}/v3/plan/tiers/DecisionChecklist.tsx`,
  `${W}/v3/plan/tiers/LaunchActButton.tsx`,
  `${W}/v3/plan/tiers/MapActivationStrip.tsx`,
  `${W}/v3/plan/tiers/NextUpCard.tsx`,
  `${W}/v3/plan/tiers/ObjectiveCard.tsx`,
  `${W}/v3/plan/tiers/ObjectiveColumn.tsx`,
  `${W}/v3/plan/tiers/ObjectiveDetailPanel.tsx`,
  `${W}/v3/plan/tiers/ObjectiveHeader.tsx`,
  `${W}/v3/plan/tiers/ParallelCallout.tsx`,
  `${W}/v3/plan/tiers/PlanTierShell.tsx`,
  `${W}/v3/plan/tiers/TierLockedPopover.tsx`,
  `${W}/v3/plan/tiers/TierRow.tsx`,
  `${W}/v3/plan/tiers/TierSpine.tsx`,
  `${W}/v3/plan/tiers/TierUnlockCelebration.tsx`,
  `${W}/v3/plan/tiers/useProjectObjectives.ts`,
  // wizard
  `${W}/v3/project-wizard/WizardCompletionScreen.tsx`,
  `${W}/v3/project-wizard/WizardTensionPanel.tsx`,
];

// Ordered longest-first; word-boundary anchored. [from, to].
// NOTE: \b ensures kept component/route identifiers are untouched:
//   PlanTierShell, usePlanTierProgressStore, v3PlanTierRoute, planTierStore
//   all have word-chars adjacent to "PlanTier", so \bPlanTier\b never matches.
const SYMBOLS = [
  ['PlanTierObjectiveOutputKind', 'PlanStratumObjectiveOutputKind'],
  ['PlanTierObjectiveStatusMap', 'PlanStratumObjectiveStatusMap'],
  ['PlanTierObjectiveStatus', 'PlanStratumObjectiveStatus'],
  ['PlanTierObjectiveSchema', 'PlanStratumObjectiveSchema'],
  ['PlanTierObjective', 'PlanStratumObjective'],
  ['PlanTierStateMap', 'PlanStratumStateMap'],
  ['PlanTierState', 'PlanStratumState'],
  ['PlanTierSchema', 'PlanStratumSchema'],
  ['PlanTierId', 'PlanStratumId'],
  ['PlanTier', 'PlanStratum'],
  ['PLAN_TIER_OBJECTIVES', 'PLAN_STRATUM_OBJECTIVES'],
  ['PLAN_TIERS', 'PLAN_STRATA'],
  ['findPlanTierObjectiveIn', 'findPlanStratumObjectiveIn'],
  ['findPlanTierObjective', 'findPlanStratumObjective'],
  ['findPlanTier', 'findPlanStratum'],
  ['getObjectivesForTier', 'getObjectivesForStratum'],
  ['computeAllTierStates', 'computeAllStratumStates'],
  ['computeTierState', 'computeStratumState'],
  ['resolutionTierLabel', 'resolutionStratumLabel'],
  ['resolutionTierId', 'resolutionStratumId'],
  ['tierOrdinal', 'stratumOrdinal'],
  ['TIER_OBSERVE_DOMAINS_DEFAULT', 'STRATUM_OBSERVE_DOMAINS_DEFAULT'],
  ['TIER_ORDER', 'STRATUM_ORDER'],
  ['tierObjectives', 'stratumObjectives'],
  ['tierIds', 'stratumIds'],
  ['tierId', 'stratumId'],
];

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applySymbols(src) {
  let out = src;
  let total = 0;
  for (const [from, to] of SYMBOLS) {
    const re = new RegExp(`\\b${esc(from)}\\b`, 'g');
    out = out.replace(re, () => {
      total++;
      return to;
    });
  }
  return [out, total];
}

// slug: <boundary>t{0-6} -> <boundary>s{n+1}; lookahead keeps the token
// separator (hyphen / quote / end) so 't0-vision' -> 's1-vision' and 't0' ->
// 's1'. Boundary-before-t prevents matching mid-identifier.
const SLUG_RE = /(^|[^A-Za-z0-9_])t([0-6])(?=-|['"`\s,)\]};]|$)/g;
// uppercase ref: -T{0-6}. -> -S{n+1}.
const REF_RE = /-T([0-6])\./g;

function applySlugs(src) {
  let n = 0;
  let out = src.replace(SLUG_RE, (_m, pre, d) => {
    n++;
    return `${pre}s${Number(d) + 1}`;
  });
  out = out.replace(REF_RE, (_m, d) => {
    n++;
    return `-S${Number(d) + 1}.`;
  });
  return [out, n];
}

let grand = 0;
for (const f of FILES) {
  let src;
  try {
    src = readFileSync(f, 'utf8');
  } catch {
    console.error(`SKIP (missing): ${f}`);
    continue;
  }
  const [s1, symN] = applySymbols(src);
  const [s2, slugN] = applySlugs(s1);
  if (s2 !== src) writeFileSync(f, s2, 'utf8');
  const changed = symN + slugN;
  grand += changed;
  console.log(
    `${changed === 0 ? '  --  ' : 'EDIT  '} ${f}  (sym=${symN} slug/ref=${slugN})`,
  );
}
console.log(`TOTAL replacements: ${grand}`);
