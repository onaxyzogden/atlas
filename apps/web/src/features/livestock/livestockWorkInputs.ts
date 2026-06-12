/**
 * livestockWorkInputs — adapter from the project's Plan-decision state to
 * the pure `generateLivestockWorkPlan` engine input (packages/shared), plus
 * the regeneration seam `generateAndApplyLivestockWork`.
 *
 * Mirrors the `pushRotationSequenceToSpine` seam shape — with one critical
 * difference: this seam NEVER writes the WorkItem spine. It only refreshes
 * the proposal layer (`livestockWorkPlanStore.applyGeneration`); the
 * operator's `confirmProposal` is the sole spine writer (sovereign-steward
 * covenant). Trigger sites: entering the Act work surface + an explicit
 * "Refresh proposals" action (rolling horizon — no scheduler).
 *
 * Inputs read (all read-only):
 *   - actEvidenceStore.visionFormData — Tier-0 capture FormValues, decoded
 *     through the captures' own pure decoders (decodeHusbandry /
 *     decodeGrazing / decodeLivestockIntent), keyed by checklist itemId.
 *   - livestockStore.paddocks — species actually placed on the map (joined
 *     with the intent capture's species so either source counts as
 *     "present").
 *   - projectStore — metadata.projectTypeRecord (→ resolveProjectProtocols) and
 *     parcel boundary (→ hemisphere for seasonal windows).
 *
 * Protocol curation: the engine receives only livestock-relevant standing
 * protocols — those feeding the 'Animals' module or carrying an explicit
 * cadence in PROTOCOL_CADENCES. `scopeNotes` pass through VERBATIM.
 */

import {
  generateLivestockWorkPlan,
  resolveProjectProtocols,
  PROTOCOL_CADENCES,
} from '@ogden/shared';
import type {
  LivestockWorkGenerationInput,
  LivestockWorkGrazingInput,
  LivestockWorkHusbandryInput,
  LivestockWorkProtocolInput,
} from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useActEvidenceStore } from '../../store/actEvidenceStore.js';
import { useLivestockWorkPlanStore } from '../../store/livestockWorkPlanStore.js';
import { isSouthernHemisphere } from './forageSeasonMath.js';
import {
  HUSBANDRY_PREFIX,
  decodeHusbandry,
  husbandryModeFor,
  type BreedingModel,
  type HalalModel,
  type HealthModel,
  type RecordsModel,
  type WelfareModel,
} from '../../v3/act/tier-shell/HusbandryCapture.js';
import {
  GRAZING_PREFIX,
  decodeGrazing,
  grazingModeFor,
  type ContingencyModel,
  type GrazeRestModel,
  type TreeProtectionModel,
} from '../../v3/act/tier-shell/GrazingSystemCapture.js';
import {
  decodeLivestockIntent,
  livestockIntentModeFor,
  type CapacityModel,
  type SpeciesModel,
} from '../../v3/act/tier-shell/LivestockIntentCapture.js';

/**
 * Build the pure engine input from current store state, or null when the
 * project does not exist. An existing project with no livestock signal
 * still builds (speciesPresent: []) — the engine returns an empty plan,
 * which `applyGeneration` uses to retire any now-stale proposals.
 */
export function buildLivestockWorkGenerationInput(
  projectId: string,
  todayISO: string,
): LivestockWorkGenerationInput | null {
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  if (!project) return null;

  // --- Tier-0 capture decode (presence = a form entry exists) -------------
  const forms = useActEvidenceStore.getState().visionFormData[projectId] ?? {};

  let health: HealthModel | null = null;
  let breeding: BreedingModel | null = null;
  let welfare: WelfareModel | null = null;
  let halal: HalalModel | null = null;
  let records: RecordsModel | null = null;
  let grazeRest: GrazeRestModel | null = null;
  let treeProtection: TreeProtectionModel | null = null;
  let contingency: ContingencyModel | null = null;
  let intentSpecies: SpeciesModel | null = null;
  let capacity: CapacityModel | null = null;

  for (const [itemId, value] of Object.entries(forms)) {
    const hMode = husbandryModeFor(itemId);
    if (hMode) {
      const model = decodeHusbandry(hMode, value);
      switch (model.kind) {
        case 'health':
          health = model;
          break;
        case 'breeding':
          breeding = model;
          break;
        case 'welfare':
          welfare = model;
          break;
        case 'halal':
          halal = model;
          break;
        case 'records':
          records = model;
          break;
        default:
          break; // labour — read via the intent capacity roster instead
      }
      continue;
    }
    const gMode = grazingModeFor(itemId);
    if (gMode) {
      const model = decodeGrazing(gMode, value);
      switch (model.kind) {
        case 'grazeRest':
          grazeRest = model;
          break;
        case 'treeProtection':
          treeProtection = model;
          break;
        case 'contingency':
          contingency = model;
          break;
        default:
          break; // method/layout/density carry no standing-work cadence
      }
      continue;
    }
    const iMode = livestockIntentModeFor(itemId);
    if (iMode) {
      const model = decodeLivestockIntent(iMode, value);
      if (model.kind === 'species') intentSpecies = model;
      else if (model.kind === 'capacity') capacity = model;
    }
  }

  const husbandry: LivestockWorkHusbandryInput = {
    health: health ? { vetNotes: health.vetNotes } : null,
    breeding: breeding
      ? { strategy: breeding.strategy, notes: breeding.notes }
      : null,
    welfare: welfare ? { notes: welfare.notes } : null,
    halal: halal
      ? { pathwayAcknowledged: halal.pathwayAcknowledged, notes: halal.notes }
      : null,
    records: records ? { notes: records.notes } : null,
  };

  const grazing: LivestockWorkGrazingInput = {
    grazeRest: grazeRest ? { seasons: grazeRest.seasons } : null,
    treeProtection: treeProtection
      ? { stageNotes: treeProtection.stageNotes }
      : null,
    contingency: contingency ? { tiers: contingency.tiers } : null,
  };

  // --- Species present: intent capture ∪ paddock assignments --------------
  // Either signal counts: a livestock_operation project may have paddocks
  // with species but no silv intent capture, and a fresh silvopasture
  // project may have declared species before drawing paddocks.
  const speciesPresent = new Set<string>(intentSpecies?.species ?? []);
  const paddocks = useLivestockStore
    .getState()
    .paddocks.filter((p) => p.projectId === projectId);
  for (const paddock of paddocks) {
    for (const sp of paddock.species) speciesPresent.add(sp);
  }

  // --- Standing protocols, curated to livestock relevance -----------------
  const typeRecord = project.metadata?.projectTypeRecord;
  const protocols: LivestockWorkProtocolInput[] = [];
  if (typeRecord) {
    const resolved = resolveProjectProtocols({
      primaryTypeId: typeRecord.primaryTypeId,
      secondaryTypeIds: typeRecord.secondaryTypeIds,
    });
    for (const p of resolved.protocols) {
      const livestockRelevant =
        p.feeds.includes('Animals') || p.id in PROTOCOL_CADENCES;
      if (!livestockRelevant) continue;
      protocols.push({
        id: p.id,
        name: p.name,
        type: p.type,
        response: p.response,
        ...(p.scopeNotes !== undefined ? { scopeNotes: p.scopeNotes } : {}),
        ...(p.objectiveId !== undefined ? { objectiveId: p.objectiveId } : {}),
      });
    }
  }

  return {
    todayISO,
    isSouthernHemisphere: isSouthernHemisphere(project.parcelBoundaryGeojson),
    speciesPresent: [...speciesPresent],
    protocols,
    husbandry,
    grazing,
    carers: {
      primaryCarer: capacity?.primaryCarer ?? '',
      reliefCarers: capacity?.reliefCarers ?? [],
    },
    husbandryObjectiveId: HUSBANDRY_PREFIX,
    grazingObjectiveId: GRAZING_PREFIX,
  };
}

/**
 * Regenerate the project's livestock work plan and refresh the PROPOSAL
 * layer. Never writes the WorkItem spine — `diffWorkPlan` semantics inside
 * `applyGeneration` guarantee dismissed-stays-dismissed and
 * confirmed-never-mutated (changes surface as needsReview).
 */
export function generateAndApplyLivestockWork(projectId: string): void {
  const todayISO = new Date().toISOString().slice(0, 10);
  const input = buildLivestockWorkGenerationInput(projectId, todayISO);
  if (!input) return;
  const plan = generateLivestockWorkPlan(input);
  useLivestockWorkPlanStore.getState().applyGeneration(projectId, plan);
}
