// stratum-codemod.mjs — Slice 1 (packages/shared) Tier -> Stratum rename.
//
// SCRATCH / NOT COMMITTED (like the repo's _dump_*.py scratch files). Scoped,
// allowlist-bound, word-boundary symbol rename + slug/ref renumber. Verified by
// `tsc --noEmit` + vitest + `git diff` review. Run from repo root:
//
//   node stratum-codemod.mjs
//
// Excludes remapSlug.ts (authored with intentional t{n}->s{n+1} examples) and
// project.schema.ts (single comment hit, hand-edited). slug/ref limited to the
// valid [0-6] range so deliberately-invalid fixtures (tX-nonexistent,
// RES>U-T9.9) pass through untouched for the Slice 4 hand-fix.
import { readFileSync, writeFileSync } from 'node:fs';

const SHARED = 'packages/shared/src';
const FILES = [
  `${SHARED}/schemas/plan/planTierObjective.schema.ts`,
  `${SHARED}/schemas/fieldAction/fieldAction.schema.ts`,
  `${SHARED}/constants/plan/tierObjectives.ts`,
  `${SHARED}/constants/plan/relationshipMatrix.ts`,
  `${SHARED}/constants/plan/catalogues/authoring.ts`,
  `${SHARED}/constants/plan/catalogues/universal.ts`,
  `${SHARED}/constants/plan/catalogues/regenFarm.ts`,
  `${SHARED}/constants/plan/catalogues/ecovillage.ts`,
  `${SHARED}/constants/plan/catalogues/agritourism.ts`,
  `${SHARED}/constants/plan/catalogues/residential.ts`,
  `${SHARED}/constants/plan/catalogues/index.ts`,
  `${SHARED}/relationships/resolveProjectObjectives.ts`,
  `${SHARED}/relationships/tierState.ts`,
  `${SHARED}/relationships/tierObjectiveStatus.ts`,
  `${SHARED}/relationships/objectiveObserveDomains.ts`,
  `${SHARED}/relationships/urgencyScore.ts`,
  `${SHARED}/relationships/cyclicalReviewTrigger.ts`,
  `${SHARED}/index.ts`,
  `${SHARED}/tests/tierObjectiveStatus.test.ts`,
  `${SHARED}/tests/fieldAction.schema.test.ts`,
  `${SHARED}/relationships/__tests__/resolveProjectObjectives.test.ts`,
  `${SHARED}/relationships/__tests__/objectiveObserveDomains.test.ts`,
  `${SHARED}/constants/plan/__tests__/catalogues.test.ts`,
];

// Ordered longest-first; word-boundary anchored. [from, to].
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
// 's1'. Boundary-before-t prevents matching mid-identifier (e.g. 'last2').
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
