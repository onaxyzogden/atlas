/**
 * receptionModel -- pure, React-free derivations for the Tier-2 / Stratum-3
 * "Reception (Systems Reading)" workbench chrome (2026-06-16 restructure).
 *
 * The Plan-stage Reception phase presents the five resolved Stratum-3 surveys
 * under a "Tier 2 / 2.1..2.5" numbering that is a PRESENTATION layer over the
 * real S3 objective ids (the strata model is NOT renamed) -- exactly as
 * declarationModel maps the S1 set onto "Tier 0 / 0.1..0.6". This module owns
 * that mapping plus the read-models the Reception center + reference panel
 * render:
 *
 *   - deriveReceptionSequencing -> the flat "2.1 | 2.2 | 2.3 | 2.4 | 2.5 ->
 *                                  Threshold 1" survey-sequencing strip with
 *                                  live status and a terminal Reality-Check node.
 *   - deriveReceptionProgress   -> the cross-tier (Tier 1 + Tier 2) completion
 *                                  fractions + evidence-base record count for the
 *                                  two gate cards and the reference panel.
 *   - readIntentLens / readObserveOutput / readBuildsOn -> thin adapters over the
 *                                  new schema fields the surveys carry.
 *
 * Unlike declarationModel there is NO canonical-object machinery -- Reception
 * renders one card per survey objective (in the DecisionList), not two
 * never-re-asked canonical cards.
 *
 * Kept dependency-free (types + the shared THRESHOLDS constant only) so it
 * unit-tests fast and has no React/store coupling. ASCII-only copy, transcribed
 * from the olos_tier2_systems mockup; em/en dashes are written as " -- " / "-"
 * per the project string-escaping rule.
 */

import type {
  IntentLensRow,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { THRESHOLDS } from './declarationModel.js';

// ---------------------------------------------------------------------------
// The two strata the Reception phase reports on (doc "Tier 1" = Stratum 2 Land
// Reading; doc "Tier 2" = Stratum 3 Systems Reading). Kept as named constants so
// the progress derivation and tests reference one source.
// ---------------------------------------------------------------------------

export const RECEPTION_TIER_ONE_STRATUM = 's2-land-reading';
export const RECEPTION_TIER_TWO_STRATUM = 's3-systems-reading';

// ---------------------------------------------------------------------------
// Display mapping: real S3 objective id -> "2.x" presentation + short sequencing
// label. Membership in this record IS the definition of the Reception set (the
// five resolved surveys for the regen + residential + silvopasture config); any
// other S3 objective renders without a "2.x".
// ---------------------------------------------------------------------------

export interface TierTwoDisplayEntry {
  /** Presentation number shown in the chrome, e.g. "2.1". */
  display: string;
  /** Short name used in the sequencing strip, e.g. "Water" -> "2.1 Water". */
  shortLabel: string;
  /** True for surveys introduced/added by the 2026-06-16 restructure. */
  isNew?: boolean;
}

export const TIER_TWO_DISPLAY: Readonly<Record<string, TierTwoDisplayEntry>> = {
  's3-hydrology': { display: '2.1', shortLabel: 'Water' },
  's3-soil': { display: '2.2', shortLabel: 'Soil' },
  'rf-s3-nutrient-cycling': { display: '2.3', shortLabel: 'Nutrients' },
  'rf-s3-pest-pressure': { display: '2.4', shortLabel: 'Pest & Disease' },
  'silv-sec-s3-stock-water': {
    display: '2.5',
    shortLabel: 'Livestock Water',
    isNew: true,
  },
};

/** The display entry for an objective id, or undefined when it is not in the set. */
export function tierTwoDisplayFor(
  objectiveId: string,
): TierTwoDisplayEntry | undefined {
  return TIER_TWO_DISPLAY[objectiveId];
}

// ---------------------------------------------------------------------------
// Reception membership -- a parallel set to TIER_ZERO_OBJECTIVE_IDS, derived from
// the display map so the two never drift. Used by the routing layer to decide
// when the workbench runs in `mode="reception"`.
// ---------------------------------------------------------------------------

export const RECEPTION_OBJECTIVE_IDS: ReadonlySet<string> = new Set(
  Object.keys(TIER_TWO_DISPLAY),
);

export function isReceptionObjectiveId(
  objectiveId: string | null | undefined,
): boolean {
  return objectiveId != null && RECEPTION_OBJECTIVE_IDS.has(objectiveId);
}

export function isReceptionObjective(
  objective: { id: string } | null | undefined,
): boolean {
  return objective != null && RECEPTION_OBJECTIVE_IDS.has(objective.id);
}

// ---------------------------------------------------------------------------
// Mode-header + callout + gate copy (centralized so the Amanah wording-pin test
// can assert over the rendered strings in one place). Transcribed verbatim from
// the mockup center column (olos_tier2_systems.html).
// ---------------------------------------------------------------------------

export const RECEPTION_MODE = {
  pill: 'Mode 2 -- Reception',
  tier: 'Tier 2',
  titleLead: 'Read what flows ',
  titleEm: 'beneath the surface',
  titleTail: '',
  desc:
    'Tier 1 mapped what can be seen. Tier 2 reads what is moving and cycling ' +
    'underneath -- water dynamics, soil biology, nutrient flows, biological ' +
    'pressure patterns. Every survey here builds on the Tier 1 evidence and ' +
    'contributes to the Threshold 1 evidence base.',
  sequencingLabel: 'Tier 2 -- Sequencing',
} as const;

/** The "reception rule continues" callout (Ear icon) above the sequencing strip. */
export const RECEPTION_RULE = {
  lead: 'Reception rule continues:',
  body:
    'Still no decisions. When the hydrological survey reveals a domestic water ' +
    'supply problem, record it. When soil compaction data shows recovery will ' +
    'take longer than planned, record it. Threshold 1 is where these findings ' +
    'meet intent. Not here.',
} as const;

/**
 * The reference-panel "Still listening" callout (Ear icon). Generalized from the
 * mockup's hydrology-specific wording so it reads for any of the five surveys --
 * the reception discipline (record evidence, defer solutions to Mode 4 Design) is
 * the same regardless of which system is being read.
 */
export const RECEPTION_STILL_LISTENING = {
  title: 'Still listening',
  body:
    'If a survey reveals a problem -- a domestic water supply gap, a soil ' +
    'recovery timeline longer than planned, a livestock water shortfall -- ' +
    'record it accurately. Do not try to solve it here. Solutions belong in ' +
    'Mode 4 Design. Evidence belongs here.',
} as const;

/** Static section labels for the reception reference panel (right pane). */
export const RECEPTION_REFERENCE = {
  modeSubtitle: 'Mode 2 -- Reception - Tier 2',
  receptionModeLabel: 'Reception mode',
  intentLensLabel: 'Intent lens -- what to look for',
  feedsLabel: 'Where this survey feeds',
  progressLabel: 'Reception progress across both tiers',
  tierOneRow: 'Tier 1 -- Land Reading',
  tierTwoRow: 'Tier 2 -- Systems Reading',
  observeFeed: 'Observe output -- Threshold 1',
  actFeed: 'Act handoff',
} as const;

/**
 * Caption beneath the two-tier progress bars. Mirrors the mockup's "11 survey
 * records" line, with the count derived so it is correct for any project shape.
 */
export function receptionRecordsCaption(totalRecords: number): string {
  return (
    `When both tiers are complete, ${totalRecords} survey records will be ` +
    'assembled into the Threshold 1 evidence base.'
  );
}

/** Human label for an objective status, used by the reception reference eyebrow. */
export function receptionStatusLabel(
  status: PlanStratumObjectiveStatus,
): string {
  switch (status) {
    case 'active':
      return 'In Progress';
    case 'available':
      return 'Available';
    case 'complete':
      return 'Complete';
    case 'deferred':
      return 'On Hold';
    default:
      return 'Locked';
  }
}

/** Static copy for the two bottom gate cards (counts are derived, not authored). */
export const RECEPTION_GATES = {
  tierTwo: {
    title: 'Tier 2 -- Systems Reading',
    desc:
      'All five objectives complete to close Mode 2 Reception and open ' +
      'Threshold 1.',
  },
  thresholdOne: {
    eyebrow: 'Threshold 1',
    title: 'The Reality Check',
    lockedLabel: 'Locked',
    openLabel: 'Open',
  },
} as const;

/**
 * The Threshold-1 gate description. The mockup hard-codes "(6/6)", "(5/5)" and
 * "eleven survey objectives" for the Hillock Farm config; we derive those totals
 * from the resolved set so the copy stays correct for any project shape while
 * matching the mockup for the canonical three-type config.
 */
export function receptionThresholdDesc(
  tierOneTotal: number,
  tierTwoTotal: number,
): string {
  const total = tierOneTotal + tierTwoTotal;
  return (
    `Opens when Tier 1 (${tierOneTotal}/${tierOneTotal}) and Tier 2 ` +
    `(${tierTwoTotal}/${tierTwoTotal}) are both complete. The full evidence ` +
    'base is assembled. Intent declared in Tier 0 now meets what the land has ' +
    `revealed across ${total} survey objectives.`
  );
}

// ---------------------------------------------------------------------------
// Survey-sequencing strip.
// ---------------------------------------------------------------------------

export interface ReceptionSeqNode {
  id: string;
  /** "2.x" presentation number. */
  display: string;
  /** Short name, e.g. "Water". The strip renders `${display} ${shortLabel}`. */
  shortLabel: string;
  status: PlanStratumObjectiveStatus;
}

export interface ReceptionSeqThreshold {
  /** Short node label shown inline in the strip, e.g. "Threshold 1". */
  label: string;
  /** Full checkpoint name from the shared THRESHOLDS source of truth. */
  name: string;
  /** 'available' once every present survey is complete; else 'locked'. */
  status: 'available' | 'locked';
}

export interface ReceptionSequencingModel {
  nodes: ReceptionSeqNode[];
  threshold: ReceptionSeqThreshold;
  /** A single soft-sequencing note (mockup shows the 2.5-benefits-from-2.1 one). */
  note?: string;
}

type StatusMap = Readonly<Record<string, PlanStratumObjectiveStatus>>;

/** Soft sequencing note surfaced beneath the strip (present only when 2.5 is). */
const STOCK_WATER_NOTE =
  'Note: 2.5 Livestock Water benefits from 2.1 being substantially complete ' +
  '-- stock water viability depends on water movement data';

/**
 * Build the survey-sequencing model: the resolved reception surveys laid out
 * flat in 2.1..2.5 order with live status overlaid, then a terminal Threshold-1
 * node. Surveys absent from the resolved `objectives` set drop out gracefully.
 * The terminal node unlocks only once every present survey is complete.
 */
export function deriveReceptionSequencing(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
): ReceptionSequencingModel {
  const present = new Set(objectives.map((o) => o.id));
  const nodes: ReceptionSeqNode[] = [];

  for (const [id, entry] of Object.entries(TIER_TWO_DISPLAY)) {
    if (!present.has(id)) continue;
    nodes.push({
      id,
      display: entry.display,
      shortLabel: entry.shortLabel,
      status: statuses[id] ?? 'locked',
    });
  }

  const allComplete =
    nodes.length > 0 && nodes.every((n) => n.status === 'complete');

  return {
    nodes,
    threshold: {
      label: 'Threshold 1',
      name: THRESHOLDS[0]?.name ?? 'Threshold 1 -- Reality Check',
      status: allComplete ? 'available' : 'locked',
    },
    note: present.has('silv-sec-s3-stock-water') ? STOCK_WATER_NOTE : undefined,
  };
}

// ---------------------------------------------------------------------------
// Cross-tier reception progress (the two gate cards + the reference panel bars).
// ---------------------------------------------------------------------------

export interface TierProgress {
  complete: number;
  total: number;
}

export interface ReceptionProgressModel {
  /** Stratum-2 (doc "Tier 1 -- Land Reading") completion. */
  tierOne: TierProgress;
  /** Stratum-3 (doc "Tier 2 -- Systems Reading") completion. */
  tierTwo: TierProgress;
  /**
   * Total survey objectives across both tiers (the mockup's "11 survey records"
   * assembled into the Threshold-1 evidence base when both tiers complete).
   */
  totalRecords: number;
  /**
   * Map-captured feature count, injected by Stage 3's
   * selectReceptionSurveyRecordCount. Defaults to 0 until the survey stores are
   * wired; kept on the model so Stage 3 needs no re-plumbing.
   */
  capturedRecords: number;
  /** True once both tiers are complete (Threshold 1 may open). */
  thresholdOpen: boolean;
}

function tierProgress(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
  stratumId: string,
): TierProgress {
  let complete = 0;
  let total = 0;
  for (const o of objectives) {
    if (o.stratumId !== stratumId) continue;
    total += 1;
    if ((statuses[o.id] ?? 'locked') === 'complete') complete += 1;
  }
  return { complete, total };
}

/**
 * Derive the reception progress model from the FULL resolved objective list (not
 * the current stratum slice) so both the Land-Reading and Systems-Reading totals
 * are visible. `capturedRecords` is the Stage-3 map-feature count (default 0).
 */
export function deriveReceptionProgress(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
  capturedRecords = 0,
): ReceptionProgressModel {
  const tierOne = tierProgress(objectives, statuses, RECEPTION_TIER_ONE_STRATUM);
  const tierTwo = tierProgress(objectives, statuses, RECEPTION_TIER_TWO_STRATUM);
  const thresholdOpen =
    tierOne.total > 0 &&
    tierTwo.total > 0 &&
    tierOne.complete === tierOne.total &&
    tierTwo.complete === tierTwo.total;
  return {
    tierOne,
    tierTwo,
    totalRecords: tierOne.total + tierTwo.total,
    capturedRecords,
    thresholdOpen,
  };
}

// ---------------------------------------------------------------------------
// Adapters over the new per-objective schema fields. Thin by design so the
// components never reach into the raw objective shape and the empty/missing
// cases are handled in one place (Act passes objectives without these fields).
// ---------------------------------------------------------------------------

type ReceptionFields = Pick<
  PlanStratumObjective,
  'intentLens' | 'observeOutput' | 'buildsOnDisplay'
>;

/** The per-type intent-lens rows for an objective (empty array when absent). */
export function readIntentLens(
  objective: ReceptionFields | null | undefined,
): readonly IntentLensRow[] {
  return objective?.intentLens ?? [];
}

/** The Observe-Output label for an objective, or undefined when not authored. */
export function readObserveOutput(
  objective: ReceptionFields | null | undefined,
): string | undefined {
  return objective?.observeOutput;
}

/** The display-only "builds on" dependency line, or undefined when not authored. */
export function readBuildsOn(
  objective: ReceptionFields | null | undefined,
): string | undefined {
  return objective?.buildsOnDisplay;
}
