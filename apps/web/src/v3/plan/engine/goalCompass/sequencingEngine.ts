/**
 * Deterministic sequencing engine for Goal Compass.
 *
 * Inputs: a GoalTree, a SiteProfile, the intervention catalog.
 * Output: an ordered list of selected interventions plus generated
 * BuildPhase / PhaseTask rows ready to merge into phaseStore.
 *
 * Algorithm:
 *   1. Filter catalog by site requirements
 *   2. Topologically order the filtered set by prerequisites + Yeomans phase
 *   3. Greedily select interventions to close criteria gaps, respecting:
 *      - already-selected acreage budget vs SiteProfile.acres
 *      - already-selected labor budget per phase
 *      - season constraints
 *   4. Emit BuildPhase per Yeomans phase + PhaseTask per intervention
 */

import { phase as phaseTokens } from '../../../../lib/tokens.js';
import { PHASE_ORDER, phaseIndex } from '../../types.js';
import type { PhaseKey } from '../../types.js';
import type {
  CriterionContribution,
  GoalTree,
  Intervention,
  SiteProfile,
  SuccessCriterion,
} from '../../data/goalCompassTypes.js';
import { CATALOG_VERSION } from '../../data/goalCompassTypes.js';
import { INTERVENTION_CATALOG } from '../../data/interventionCatalog.js';
import { passesAllRequirements } from './siteRequirementPredicates.js';
import type { BuildPhase, PhaseTask, DesignLayer } from '../../../../store/phaseStore.js';

export interface SelectedIntervention {
  intervention: Intervention;
  acresAllocated: number;
  startYearOffset: number;
  laborHrsTotal: number;
  costMidUSD: number;
}

export interface SequencingResult {
  selected: SelectedIntervention[];
  generatedPhases: BuildPhase[];
  generatedTasks: { phaseId: string; task: PhaseTask }[];
  skipped: { intervention: Intervention; reason: string }[];
  catalogVersion: string;
}

const PHASE_LABEL: Record<PhaseKey, string> = {
  climate: 'Climate & assessment',
  landshape: 'Landshape',
  water: 'Water',
  access: 'Access',
  trees: 'Trees & plantings',
  buildings: 'Buildings',
  subdivision: 'Subdivision & livestock',
  soil: 'Soil',
};

const PHASE_TIMEFRAME: Record<PhaseKey, string> = {
  climate: 'Year 0',
  landshape: 'Year 0-1',
  water: 'Year 0-2',
  access: 'Year 0-1',
  trees: 'Year 1-5',
  buildings: 'Year 1-3',
  subdivision: 'Year 2-4',
  soil: 'Year 0-3',
};

const PHASE_START_YEAR: Record<PhaseKey, number> = {
  climate: 0,
  landshape: 0,
  water: 0,
  access: 0,
  trees: 1,
  buildings: 1,
  subdivision: 2,
  soil: 0,
};

const SEASON_BY_PHASE: Record<PhaseKey, PhaseTask['season']> = {
  climate: 'spring',
  landshape: 'summer',
  water: 'summer',
  access: 'summer',
  trees: 'spring',
  buildings: 'summer',
  subdivision: 'spring',
  soil: 'fall',
};

function resolveAcreage(
  intervention: Intervention,
  parcelAcres: number,
  household: { adults: number; children: number } | null,
): number {
  const fp = intervention.spatialFootprintAcres;
  if (!fp) {
    return 1;
  }
  const ppl = household ? household.adults + household.children : 4;
  const fromPerson = fp.perPerson ? fp.perPerson * ppl : 0;
  const fromFraction = fp.fractionOfParcel ? fp.fractionOfParcel * parcelAcres : 0;
  const candidate = Math.max(fromPerson, fromFraction, fp.minimum ?? 0);
  return Math.max(candidate, fp.minimum ?? 0);
}

function calcLabor(intervention: Intervention, acres: number): number {
  const perAcre = (intervention.laborHrsPerAcre ?? 0) * acres;
  const fixed = intervention.laborFixedHrs ?? 0;
  return perAcre + fixed;
}

function calcCost(intervention: Intervention, acres: number): number {
  const { mid, perAcre } = intervention.costRangeUSD;
  return perAcre ? mid * acres : mid;
}

function topoOrder(catalog: Intervention[]): Intervention[] {
  const byId = new Map(catalog.map((i) => [i.id, i]));
  const visited = new Set<string>();
  const result: Intervention[] = [];
  function visit(node: Intervention) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    for (const dep of node.prerequisites) {
      const next = byId.get(dep);
      if (next) visit(next);
    }
    result.push(node);
  }
  const sorted = [...catalog].sort(
    (a, b) => phaseIndex(a.yeomansPhase) - phaseIndex(b.yeomansPhase),
  );
  for (const node of sorted) visit(node);
  return result;
}

function flatCriteria(goalTree: GoalTree): SuccessCriterion[] {
  return goalTree.subGoals.flatMap((sg) => sg.criteria);
}

function contributionValue(
  c: CriterionContribution,
  acres: number,
): number {
  const perAcre = (c.contributionPerAcre ?? 0) * acres;
  const fixed = c.contributionFixed ?? 0;
  return perAcre + fixed;
}

function criterionGapExists(
  criterion: SuccessCriterion,
  contributionsSoFar: Map<string, number>,
): boolean {
  const cur = contributionsSoFar.get(criterion.id) ?? 0;
  return cur < criterion.target;
}

function interventionAdvancesGoals(
  intervention: Intervention,
  criteria: SuccessCriterion[],
  contributionsSoFar: Map<string, number>,
): boolean {
  if (intervention.criterionContributions.length === 0) return false;
  return intervention.criterionContributions.some((cc) => {
    const c = criteria.find((cr) => cr.id === cc.criterionId);
    return c ? criterionGapExists(c, contributionsSoFar) : false;
  });
}

export function runSequencingEngine(
  goalTree: GoalTree,
  siteProfile: SiteProfile,
  projectId: string,
  catalog: Intervention[] = INTERVENTION_CATALOG,
): SequencingResult {
  const parcelAcres = siteProfile.acres.value ?? 10;
  const household = siteProfile.household.value;
  const criteria = flatCriteria(goalTree);

  const skipped: SequencingResult['skipped'] = [];
  const eligible: Intervention[] = [];
  for (const i of catalog) {
    if (!passesAllRequirements(siteProfile, i.siteRequirements)) {
      skipped.push({ intervention: i, reason: 'Site requirements not met' });
      continue;
    }
    if (
      i.projectTypes &&
      i.projectTypes.length > 0 &&
      !i.projectTypes.includes(goalTree.archetype)
    ) {
      skipped.push({
        intervention: i,
        reason: `Not authored for project type "${goalTree.archetype}"`,
      });
      continue;
    }
    eligible.push(i);
  }

  const ordered = topoOrder(eligible);
  const selected: SelectedIntervention[] = [];
  const selectedIds = new Set<string>();
  const contributionsSoFar = new Map<string, number>();
  let acresUsed = 0;

  for (const intervention of ordered) {
    const prereqMet = intervention.prerequisites.every((p) => {
      if (!catalog.find((c) => c.id === p)) return true;
      return selectedIds.has(p);
    });
    if (!prereqMet) {
      skipped.push({ intervention, reason: 'Prerequisite not selected' });
      continue;
    }

    const isFoundation =
      intervention.criterionContributions.length === 0 &&
      (intervention.prerequisites.length === 0 ||
        intervention.id === 'keyline-access-track' ||
        intervention.id === 'compost-system' ||
        intervention.id === 'roof-catchment-tanks');

    const advances = interventionAdvancesGoals(intervention, criteria, contributionsSoFar);

    if (!isFoundation && !advances) {
      skipped.push({ intervention, reason: 'All target criteria already met' });
      continue;
    }

    const acresNeeded = resolveAcreage(intervention, parcelAcres, household);
    if (acresUsed + acresNeeded > parcelAcres * 1.05) {
      skipped.push({ intervention, reason: 'Exceeds available acreage budget' });
      continue;
    }

    const laborHrsTotal = calcLabor(intervention, acresNeeded);
    const costMidUSD = calcCost(intervention, acresNeeded);
    const startYearOffset = PHASE_START_YEAR[intervention.yeomansPhase];

    selected.push({
      intervention,
      acresAllocated: acresNeeded,
      startYearOffset,
      laborHrsTotal,
      costMidUSD,
    });
    selectedIds.add(intervention.id);
    acresUsed += acresNeeded;

    for (const cc of intervention.criterionContributions) {
      const v = contributionValue(cc, acresNeeded);
      contributionsSoFar.set(cc.criterionId, (contributionsSoFar.get(cc.criterionId) ?? 0) + v);
    }
  }

  const usedPhases: PhaseKey[] = [];
  for (const pk of PHASE_ORDER) {
    if (selected.some((s) => s.intervention.yeomansPhase === pk)) usedPhases.push(pk);
  }

  const generatedPhases: BuildPhase[] = usedPhases.map((pk, idx) => ({
    id: `gc-phase-${projectId}-${pk}`,
    projectId,
    name: PHASE_LABEL[pk],
    timeframe: PHASE_TIMEFRAME[pk],
    order: idx + 1,
    description: `Goal-Compass-generated phase for ${PHASE_LABEL[pk]}.`,
    color: phaseTokens[((idx % 4) + 1) as 1 | 2 | 3 | 4],
    completed: false,
    notes: '',
    completedAt: null,
    yeomansCap: pk,
    generatedFromGoalCompass: true,
    catalogVersion: CATALOG_VERSION,
  }));

  const phaseIdByKey = new Map<PhaseKey, string>();
  for (const p of generatedPhases) {
    if (p.yeomansCap) phaseIdByKey.set(p.yeomansCap, p.id);
  }

  const generatedTasks: SequencingResult['generatedTasks'] = selected.map((s) => {
    const phaseId = phaseIdByKey.get(s.intervention.yeomansPhase);
    if (!phaseId) {
      return { phaseId: '', task: createTask(s) };
    }
    return { phaseId, task: createTask(s) };
  });

  return {
    selected,
    generatedPhases,
    generatedTasks,
    skipped,
    catalogVersion: CATALOG_VERSION,
  };
}

function createTask(s: SelectedIntervention): PhaseTask {
  const i = s.intervention;
  return {
    id: `gc-task-${i.id}`,
    season: i.seasonConstraints?.[0] ?? SEASON_BY_PHASE[i.yeomansPhase],
    title: i.name,
    laborHrs: Math.round(s.laborHrsTotal),
    costUSD: Math.round(s.costMidUSD),
    notes: i.description,
    designLayer: (i.designLayer ?? undefined) as DesignLayer | undefined,
    generatedFromIntervention: i.id,
    catalogVersion: CATALOG_VERSION,
    status: 'generated',
  };
}
