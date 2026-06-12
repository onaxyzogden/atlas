/**
 * generateLivestockWorkPlan — pure composer: Plan livestock decisions →
 * recurring care RULES → dated INSTANCES over a rolling horizon.
 *
 * PURE AND ADVISORY. `todayISO` is injected (no Date.now()); the output
 * never touches the WorkItem spine — it feeds `livestockWorkPlanStore`
 * proposals, and only the operator's `confirmProposal` writes spine rows
 * (sovereign-steward covenant).
 *
 * Sources composed (each null input contributes nothing):
 *   protocols   cadenced via PROTOCOL_CADENCES; unmapped 'cyclical'
 *               protocols fall back to quarterly 'custom' so they surface
 *               rather than vanish. The CALLER curates the protocol list
 *               (typically the project's resolved protocols filtered to
 *               livestock relevance). `scopeNotes` carried VERBATIM.
 *   husbandry   welfare → daily feed/water + weekly welfare checks;
 *               health → annual vaccination (window anchored to the
 *               breeding strategy) + quarterly parasite monitoring;
 *               breeding → seasonal joining window; records → quarterly
 *               stock-register reconciliation; halal → see gate below.
 *   grazing     graze/rest → per-season review at each window; tree
 *               protection → monthly browse/guard check; contingency →
 *               quarterly tier review.
 *
 * Covenant gates (binding, unit-tested):
 *   - `slaughter-prep` is emitted ONLY when the husbandry halal capture
 *     recorded `pathwayAcknowledged === true`. The engine reads the gate;
 *     it never writes it.
 *   - Pigs (khinzir) NEVER yield slaughter/consumption work under ANY
 *     input — working/functional roles only (operator fiqh ruling,
 *     2026-06; see HusbandryCapture delta B). The pig exclusion is checked
 *     BEFORE the halal gate so no input combination can bypass it.
 *   - NO move generation: rotation moves belong to
 *     `rotationSequenceSpineSync`. No rule kind or field here encodes a
 *     paddock-to-paddock movement.
 *
 * Empty input → empty output: with no species present there is no herd to
 * care for, so no rules are generated regardless of other inputs.
 */

import type { ProtocolType } from '../schemas/protocol/protocol.schema.js';
import type {
  LivestockWorkInstance,
  LivestockWorkKind,
  LivestockWorkRule,
  LivestockWorkSourceKind,
  SeasonalWindow,
} from '../schemas/livestockWork/livestockWork.schema.js';
import type { WorkItemRecurrence } from '../schemas/workItem.schema.js';
import {
  CYCLICAL_FALLBACK_CADENCE,
  PROTOCOL_CADENCES,
} from '../constants/livestockWork/protocolCadences.js';
import { stableStringify } from '../evidence/hashInputs.js';
import { addDaysISO, expandRecurrence } from './expandRecurrence.js';

// ---------------------------------------------------------------------------
// Input types (structural — the web adapter maps capture decoders onto these;
// shared never imports web code)
// ---------------------------------------------------------------------------

/** Structural subset of StandardProtocolTemplate the engine reads. */
export interface LivestockWorkProtocolInput {
  id: string;
  name: string;
  type: ProtocolType;
  /** THEN response prose — becomes the instance detail. */
  response: string;
  /** VERBATIM Amanah caution; carried unreworded. */
  scopeNotes?: string;
  /** Objective-level anchor when the catalogue sets one. */
  objectiveId?: string;
}

/** Mirrors decodeHusbandry models (null = capture not recorded). */
export interface LivestockWorkHusbandryInput {
  health: { vetNotes: string } | null;
  breeding: { strategy: string | null; notes: string } | null;
  welfare: { notes: string } | null;
  halal: { pathwayAcknowledged: boolean; notes: string } | null;
  records: { notes: string } | null;
}

/** Mirrors decodeGrazing models (null = capture not recorded). */
export interface LivestockWorkGrazingInput {
  grazeRest: {
    seasons: ReadonlyArray<{
      grazePeriod: string;
      restPeriod: string;
      indicator: string;
    }>;
  } | null;
  treeProtection: { stageNotes: ReadonlyArray<string> } | null;
  contingency: {
    tiers: ReadonlyArray<{ trigger: string; action: string }>;
  } | null;
}

export interface LivestockWorkGenerationInput {
  /** YYYY-MM-DD — injected, never derived (purity). */
  todayISO: string;
  /** Rolling horizon length; default 90 days. */
  horizonDays?: number;
  isSouthernHemisphere: boolean;
  /** LivestockSpecies keys on the project. Empty → empty output. */
  speciesPresent: ReadonlyArray<string>;
  protocols: ReadonlyArray<LivestockWorkProtocolInput>;
  husbandry: LivestockWorkHusbandryInput;
  grazing: LivestockWorkGrazingInput;
  /** From the livestock-intent capacity capture's carer roster. */
  carers: { primaryCarer: string; reliefCarers: ReadonlyArray<string> };
  /** Objective ids for provenance (differ per project type). */
  husbandryObjectiveId?: string;
  grazingObjectiveId?: string;
}

export interface LivestockWorkPlan {
  rules: LivestockWorkRule[];
  instances: LivestockWorkInstance[];
}

export const DEFAULT_HORIZON_DAYS = 90;

/**
 * Species keys categorically excluded from slaughter/consumption-pathway
 * work (operator fiqh ruling: pigs working-role only, never human meat).
 */
const PIG_SPECIES = new Set(['pigs', 'pig']);

// ---------------------------------------------------------------------------
// Rule construction
// ---------------------------------------------------------------------------

/** Sync FNV-1a (32-bit) hex hash — change detection only, not crypto. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

interface RuleDraft {
  kind: LivestockWorkKind;
  title: string;
  detail?: string;
  scopeNotes?: string;
  sourceKind: LivestockWorkSourceKind;
  sourceId: string;
  sourceProtocolId?: string;
  sourceObjectiveId?: string;
  captureMode?: string;
  species?: string;
  paddockId?: string;
  suggestedCarer?: string;
  recurrence: WorkItemRecurrence;
  seasonalWindow?: SeasonalWindow;
}

function buildRule(draft: RuleDraft): LivestockWorkRule {
  const keyParts = ['lvp', draft.sourceKind, draft.sourceId];
  if (draft.species !== undefined) keyParts.push(draft.species);
  if (draft.paddockId !== undefined) keyParts.push(draft.paddockId);
  // Hash everything content-bearing; the key identifies, the hash detects change.
  const inputsHash = fnv1a(
    stableStringify({
      kind: draft.kind,
      title: draft.title,
      detail: draft.detail ?? '',
      scopeNotes: draft.scopeNotes ?? '',
      recurrence: draft.recurrence,
      seasonalWindow: draft.seasonalWindow ?? null,
      suggestedCarer: draft.suggestedCarer ?? '',
      sourceProtocolId: draft.sourceProtocolId ?? '',
      sourceObjectiveId: draft.sourceObjectiveId ?? '',
    }),
  );
  return { ...draft, key: keyParts.join('__'), inputsHash };
}

// ---------------------------------------------------------------------------
// Source composers
// ---------------------------------------------------------------------------

function protocolRules(
  protocols: ReadonlyArray<LivestockWorkProtocolInput>,
): LivestockWorkRule[] {
  const out: LivestockWorkRule[] = [];
  for (const p of protocols) {
    const cadence =
      PROTOCOL_CADENCES[p.id] ??
      (p.type === 'cyclical' ? CYCLICAL_FALLBACK_CADENCE : null);
    if (!cadence) continue; // event-driven threshold/judgment — no standing work
    out.push(
      buildRule({
        kind: cadence.kind,
        title: p.name,
        detail: p.response,
        ...(p.scopeNotes !== undefined ? { scopeNotes: p.scopeNotes } : {}),
        sourceKind: 'protocol',
        sourceId: p.id,
        sourceProtocolId: p.id,
        ...(p.objectiveId !== undefined
          ? { sourceObjectiveId: p.objectiveId }
          : {}),
        recurrence: cadence.recurrence,
      }),
    );
  }
  return out;
}

/** Pre-lambing vaccination window per breeding strategy (drafted defaults). */
function vaccinationWindow(
  strategy: string | null | undefined,
): SeasonalWindow | undefined {
  // Autumn joining → Aug-Sep lambing → winter-quarter pre-lambing booster;
  // spring joining → autumn lambing → summer-quarter booster. AI/ET or no
  // strategy → plain annual (no window).
  if (strategy === 'autumn') return { season: 'winter' };
  if (strategy === 'spring') return { season: 'summer' };
  return undefined;
}

function husbandryRules(
  husbandry: LivestockWorkHusbandryInput,
  speciesPresent: ReadonlyArray<string>,
  primaryCarer: string,
  objectiveId: string | undefined,
): LivestockWorkRule[] {
  const out: LivestockWorkRule[] = [];
  const carer = primaryCarer.trim() !== '' ? primaryCarer : undefined;
  const objective =
    objectiveId !== undefined ? { sourceObjectiveId: objectiveId } : {};

  if (husbandry.welfare) {
    out.push(
      buildRule({
        kind: 'feed-water-check',
        title: 'Daily feed & water check',
        detail:
          'Confirm feed access and clean water in every occupied paddock; note any animal off feed or water.',
        sourceKind: 'husbandry',
        sourceId: 'welfare-daily',
        captureMode: 'welfare',
        ...(carer !== undefined ? { suggestedCarer: carer } : {}),
        ...objective,
        recurrence: 'daily',
      }),
      buildRule({
        kind: 'welfare-check',
        title: 'Weekly welfare & condition check',
        detail:
          'Condition-score the mob; check for lameness, flystrike, and shade/shelter access; treat or escalate promptly.',
        sourceKind: 'husbandry',
        sourceId: 'welfare-weekly',
        captureMode: 'welfare',
        ...(carer !== undefined ? { suggestedCarer: carer } : {}),
        ...objective,
        recurrence: 'weekly',
      }),
    );
  }

  if (husbandry.health) {
    const window = vaccinationWindow(husbandry.breeding?.strategy);
    out.push(
      buildRule({
        kind: 'vaccination',
        title: 'Annual vaccination booster',
        detail:
          'Clostridial (5-in-1 / 6-in-1) booster; record batch, date, and withholding periods.' +
          (husbandry.health.vetNotes.trim() !== ''
            ? ` Vet program: ${husbandry.health.vetNotes.trim()}`
            : ''),
        sourceKind: 'husbandry',
        sourceId: 'health-vaccination',
        captureMode: 'health',
        ...(carer !== undefined ? { suggestedCarer: carer } : {}),
        ...objective,
        recurrence: 'annual',
        ...(window !== undefined ? { seasonalWindow: window } : {}),
      }),
      buildRule({
        kind: 'parasite-monitoring',
        title: 'Worm egg count monitoring',
        detail:
          'Worm-egg-count before any drench decision; drench strategically, not by calendar alone.',
        sourceKind: 'husbandry',
        sourceId: 'health-parasite',
        captureMode: 'health',
        ...(carer !== undefined ? { suggestedCarer: carer } : {}),
        ...objective,
        recurrence: 'quarterly',
      }),
    );
  }

  const strategy = husbandry.breeding?.strategy ?? null;
  if (strategy !== null) {
    const seasonal: SeasonalWindow | undefined =
      strategy === 'autumn' || strategy === 'spring'
        ? { season: strategy }
        : undefined;
    out.push(
      buildRule({
        kind: 'breeding-event',
        title:
          strategy === 'autumn'
            ? 'Autumn joining — rams in'
            : strategy === 'spring'
              ? 'Spring joining — rams in'
              : 'AI / ET program planning',
        detail:
          husbandry.breeding?.notes.trim() !== ''
            ? husbandry.breeding!.notes.trim()
            : 'Prepare and run the joining program recorded in the breeding strategy.',
        sourceKind: 'husbandry',
        sourceId: 'breeding',
        captureMode: 'breeding',
        ...(carer !== undefined ? { suggestedCarer: carer } : {}),
        ...objective,
        recurrence: 'annual',
        ...(seasonal !== undefined ? { seasonalWindow: seasonal } : {}),
      }),
    );
  }

  if (husbandry.records) {
    out.push(
      buildRule({
        kind: 'records-reconciliation',
        title: 'Stock register reconciliation',
        detail:
          'Reconcile opening numbers, births, deaths, purchases, and transfers by mob and class; bring the health event log up to date.',
        sourceKind: 'husbandry',
        sourceId: 'records',
        captureMode: 'records',
        ...objective,
        recurrence: 'quarterly',
      }),
    );
  }

  // Halal gate THEN pig exclusion — slaughter-prep only for acknowledged
  // pathways, and never for pigs regardless of any input combination.
  if (husbandry.halal?.pathwayAcknowledged === true) {
    for (const species of speciesPresent) {
      if (PIG_SPECIES.has(species)) continue; // working-role only — no meat pathway
      out.push(
        buildRule({
          kind: 'slaughter-prep',
          title: `Halal slaughter pathway preparation — ${species}`,
          detail:
            'Confirm dhakah readiness before any stock are taken for meat: sharp blade prepared out of sight, Tasmiyah, calm handling, full blood drainage, and the slaughter record kept with the stock register.',
          sourceKind: 'husbandry',
          sourceId: 'halal',
          captureMode: 'halal',
          species,
          ...objective,
          recurrence: 'annual',
        }),
      );
    }
  }

  return out;
}

/** Season order matches GRAZING_SEASONS (autumn, winter, spring, summer). */
const GRAZE_SEASON_KEYS = ['autumn', 'winter', 'spring', 'summer'] as const;

function grazingRules(
  grazing: LivestockWorkGrazingInput,
  objectiveId: string | undefined,
): LivestockWorkRule[] {
  const out: LivestockWorkRule[] = [];
  const objective =
    objectiveId !== undefined ? { sourceObjectiveId: objectiveId } : {};

  if (grazing.grazeRest) {
    for (let i = 0; i < GRAZE_SEASON_KEYS.length; i++) {
      const season = GRAZE_SEASON_KEYS[i]!;
      const target = grazing.grazeRest.seasons[i];
      const parts: string[] = [];
      if (target?.grazePeriod.trim()) parts.push(`graze ${target.grazePeriod.trim()}`);
      if (target?.restPeriod.trim()) parts.push(`rest ${target.restPeriod.trim()}`);
      if (target?.indicator.trim()) parts.push(`move on: ${target.indicator.trim()}`);
      out.push(
        buildRule({
          kind: 'graze-rest-review',
          title: `Graze/rest review — ${season}`,
          detail:
            parts.length > 0
              ? `Review the rotation against the ${season} targets (${parts.join(' · ')}).`
              : `Review the rotation against the ${season} graze/rest targets.`,
          sourceKind: 'grazing',
          sourceId: `grazeRest-${season}`,
          captureMode: 'grazeRest',
          ...objective,
          recurrence: 'annual',
          seasonalWindow: { season },
        }),
      );
    }
  }

  if (grazing.treeProtection) {
    out.push(
      buildRule({
        kind: 'tree-protection-check',
        title: 'Tree protection & browse check',
        detail:
          'Inspect guards, bark condition, browse pressure, and root-zone compaction across the tree stages.',
        sourceKind: 'grazing',
        sourceId: 'treeProtection',
        captureMode: 'treeProtection',
        ...objective,
        recurrence: 'monthly',
      }),
    );
  }

  if (grazing.contingency) {
    out.push(
      buildRule({
        kind: 'contingency-review',
        title: 'Feed-gap contingency tier review',
        detail:
          'Check the recorded contingency triggers (pasture condition, water storage, condition scores) against the current tier and escalate or stand down accordingly.',
        sourceKind: 'grazing',
        sourceId: 'contingency',
        captureMode: 'contingency',
        ...objective,
        recurrence: 'quarterly',
      }),
    );
  }

  return out;
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

export function generateLivestockWorkPlan(
  input: LivestockWorkGenerationInput,
): LivestockWorkPlan {
  if (input.speciesPresent.length === 0) {
    return { rules: [], instances: [] };
  }

  const rules: LivestockWorkRule[] = [
    ...protocolRules(input.protocols),
    ...husbandryRules(
      input.husbandry,
      input.speciesPresent,
      input.carers.primaryCarer,
      input.husbandryObjectiveId,
    ),
    ...grazingRules(input.grazing, input.grazingObjectiveId),
  ];

  const horizonDays = input.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const toISO = addDaysISO(input.todayISO, horizonDays);
  const instances: LivestockWorkInstance[] = [];
  for (const rule of rules) {
    instances.push(
      ...expandRecurrence(rule, input.todayISO, toISO, {
        isSouthernHemisphere: input.isSouthernHemisphere,
      }),
    );
  }

  return { rules, instances };
}
