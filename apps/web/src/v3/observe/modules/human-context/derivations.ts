/**
 * derivations — pure helpers turning visionStore state into the numbers,
 * labels, and counts the Human Context dashboard / detail pages display.
 *
 * Kept dependency-free so it tests fast and can be reused by future
 * synthesis features.
 */

import type {
  RegionalContext,
  SharedVision,
  StewardProfile,
  StewardTeam,
  VisionData,
} from '../../../../store/visionStore.js';

/* --------------------------- steward ---------------------------------- */

/**
 * The eleven profile-overlay fields counted toward per-steward completeness.
 * Identity (name) lives on the member record, not the profile, so it is not
 * counted here. `needs` joined the set 2026-06-14 (steward data audit Option 3).
 * The residency fields (`residentStatus`, `roleAllocation`) joined 2026-06-16
 * with the Tier-0 Steward/Team Object restructure -- captured on the Plan
 * Declaration surface (StewardTeamCapture), not the Observe survey, so the
 * completeness ring spans both surfaces by design (one canonical StewardProfile
 * referenced everywhere). Both are string-valued, so `isFilled` treats them
 * correctly without change.
 *
 * The free-text `teamRole` field was DROPPED here on 2026-06-28 (Phase-4
 * team-role consolidation): the "what they do" concept was folded into the
 * standardized operational-role pills, which live on the *membership*
 * (`project_members.operational_roles`), not on this profile overlay -- and
 * operational roles are intentionally non-gating (ADR 2026-06-24), so they are
 * NOT added here in their place. The `teamRole` field stays on `StewardProfile`
 * for legacy display only; it simply no longer counts toward completeness.
 */
const STEWARD_FIELDS: Array<keyof StewardProfile> = [
  'relationship',
  'age',
  'occupation',
  'lifestyle',
  'maintenanceHrsInitial',
  'maintenanceHrsOngoing',
  'budget',
  'skills',
  'needs',
  'residentStatus',
  'roleAllocation',
];

export interface Completeness {
  filled: number;
  total: number;
  pct: number;
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function stewardCompleteness(steward: StewardProfile | undefined): Completeness {
  const total = STEWARD_FIELDS.length;
  if (!steward) return { filled: 0, total, pct: 0 };
  const filled = STEWARD_FIELDS.reduce(
    (acc, key) => acc + (isFilled(steward[key]) ? 1 : 0),
    0,
  );
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

export type StewardArchetype =
  | 'Practical Builder'
  | 'Cartographer-Steward'
  | 'Hands-Off Caretaker'
  | 'Observer-In-Residence';

export interface ArchetypeDescriptor {
  name: StewardArchetype;
  blurb: string;
}

export function archetypeFor(steward: StewardProfile | undefined): ArchetypeDescriptor {
  const skills = steward?.skills ?? [];
  const hasMappingSkill = skills.some((s) => /cad|gis|map/i.test(s));
  const initialHrs = steward?.maintenanceHrsInitial ?? 0;

  if (hasMappingSkill && skills.length >= 3) {
    return {
      name: 'Cartographer-Steward',
      blurb: 'Mapping & analytic skills support detailed spatial design.',
    };
  }
  if (skills.length >= 3 && initialHrs >= 15) {
    return {
      name: 'Practical Builder',
      blurb: 'Hands-on, skilled, and ready to implement.',
    };
  }
  if (initialHrs > 0 && initialHrs < 5) {
    return {
      name: 'Hands-Off Caretaker',
      blurb: 'Light-touch presence — favour low-maintenance systems.',
    };
  }
  return {
    name: 'Observer-In-Residence',
    blurb: 'Still capturing capacity — design starts with observation.',
  };
}

export function totalHoursPerWeek(steward: StewardProfile | undefined): number {
  return (steward?.maintenanceHrsInitial ?? 0) + (steward?.maintenanceHrsOngoing ?? 0);
}

/* --------------------------- roster rollups --------------------------- */

/** Combined weekly hours pledged across the whole steward roster. */
export function rosterCapacityHours(profiles: StewardProfile[]): number {
  return profiles.reduce((acc, p) => acc + totalHoursPerWeek(p), 0);
}

/**
 * Roster completeness — the mean per-steward completeness. An empty roster
 * reads 0%. `filled`/`total` are summed across stewards for the caption.
 */
export function rosterCompleteness(profiles: StewardProfile[]): Completeness {
  if (profiles.length === 0) {
    return { filled: 0, total: STEWARD_FIELDS.length, pct: 0 };
  }
  const each = profiles.map((p) => stewardCompleteness(p));
  const filled = each.reduce((acc, c) => acc + c.filled, 0);
  const total = each.reduce((acc, c) => acc + c.total, 0);
  const pct = Math.round(each.reduce((acc, c) => acc + c.pct, 0) / each.length);
  return { filled, total, pct };
}

/* --------------------------- supply baseline -------------------------- */

/**
 * Read-only Steward/Team Object supply baseline (Tier-0 restructure 2026-06-16).
 * Rolls the structured Team Object up into the team-capacity numbers a future
 * Tier-6 demand-vs-supply read compares plan-derived demand against. This is a
 * pure read seam only -- no consumer is rewired here (settlement-plan capacityFit
 * and the work-plan generators are intentionally left untouched).
 *
 * NOTE: per-person seasonal labour (s1-steward-c5) lives in the LabourInventory
 * capture's FormValue, not on StewardProfile, so it is NOT summed here; a Tier-6
 * consumer that wants the seasonal curve reads the labour record separately.
 * `weeklyHours` reflects the legacy maintenance-hours pledge (reused as-is).
 */
export interface StewardSupplyBaseline {
  rosterSize: number;
  liveInCount: number;
  weeklyHours: number;
  /** Distinct domains with at least one capable steward across the roster. */
  domainsCovered: string[];
  domainCoverageCount: number;
  /** Stewards carrying at least one explicit decision-right assignment. */
  rightsHolders: number;
  skillGaps: number;
  fundingSources: number;
}

export function stewardSupplyBaseline(
  profiles: StewardProfile[],
  team: StewardTeam,
): StewardSupplyBaseline {
  const covered = new Set<string>();
  let rightsHolders = 0;
  let liveInCount = 0;
  for (const p of profiles) {
    for (const key of Object.keys(p.capabilityByDomain ?? {})) {
      covered.add(key);
    }
    if (Object.keys(p.decisionRights ?? {}).length > 0) rightsHolders += 1;
    if (p.residentStatus === 'live-in') liveInCount += 1;
  }
  const domainsCovered = [...covered];
  return {
    rosterSize: profiles.length,
    liveInCount,
    weeklyHours: rosterCapacityHours(profiles),
    domainsCovered,
    domainCoverageCount: domainsCovered.length,
    rightsHolders,
    skillGaps: team.skillGaps?.length ?? 0,
    fundingSources: team.fundingSources?.length ?? 0,
  };
}

/* --------------------------- regional --------------------------------- */

export interface RegionalCounts {
  placeNames: number;
  challenges: number;
  strengths: number;
  contacts: number;
  total: number;
}

export function regionalCounts(regional: RegionalContext | undefined): RegionalCounts {
  const placeNames = regional?.indigenousNames?.length ?? 0;
  const challenges = regional?.culturalChallenges?.length ?? 0;
  const strengths = regional?.culturalStrengths?.length ?? 0;
  const contacts = regional?.localNetwork?.length ?? 0;
  return {
    placeNames,
    challenges,
    strengths,
    contacts,
    total: placeNames + challenges + strengths + contacts,
  };
}

export function regionalCompleteness(regional: RegionalContext | undefined): Completeness {
  const groups = [
    regional?.indigenousNames,
    regional?.culturalChallenges,
    regional?.culturalStrengths,
    regional?.localNetwork,
  ];
  const total = groups.length;
  const filled = groups.reduce(
    (acc, g) => acc + (g && g.length > 0 ? 1 : 0),
    0,
  );
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

/* --------------------------- vision ----------------------------------- */

export interface VisionCounts {
  coreFunctions: number;
  successMetrics: number;
  moodboardImages: number;
  experienceGoals: number;
  principles: number;
  guidingValues: number;
  constraints: number;
}

export function visionCounts(vision: SharedVision | undefined): VisionCounts {
  return {
    coreFunctions: vision?.coreFunctions?.length ?? 0,
    successMetrics: vision?.successMetrics?.length ?? 0,
    moodboardImages: vision?.moodboardImages?.length ?? 0,
    experienceGoals: vision?.experienceGoals?.length ?? 0,
    principles: vision?.principles?.length ?? 0,
    guidingValues: vision?.guidingValues?.length ?? 0,
    constraints: vision?.constraints?.length ?? 0,
  };
}

export function visionCompleteness(vision: VisionData | undefined): Completeness {
  const sv = vision?.sharedVision;
  const checks: boolean[] = [
    isFilled(sv?.statement),
    (sv?.coreFunctions?.length ?? 0) > 0,
    (sv?.successMetrics?.length ?? 0) > 0,
    (sv?.experienceGoals?.length ?? 0) > 0,
    (sv?.moodboardImages?.length ?? 0) > 0,
    (vision?.phaseNotes ?? []).some((p) => p.notes.trim().length > 0),
  ];
  const total = checks.length;
  const filled = checks.filter(Boolean).length;
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

/* --------------------------- module rollup ---------------------------- */

/**
 * Module completeness over the steward roster. `profiles` is the roster's
 * profile overlays (one per member); when empty the people axis reads 0%.
 * Weighted: roster 40%, regional 35%, vision 25%.
 */
export function moduleCompleteness(
  vision: VisionData | undefined,
  profiles: StewardProfile[],
): Completeness {
  const sw = rosterCompleteness(profiles);
  const rg = regionalCompleteness(vision?.regional);
  const vs = visionCompleteness(vision);
  const pct = Math.round(sw.pct * 0.4 + rg.pct * 0.35 + vs.pct * 0.25);
  // Synthetic filled/total for the "X of Y areas captured" caption.
  const total = sw.total + rg.total + vs.total;
  const filled = sw.filled + rg.filled + vs.filled;
  return { filled, total, pct };
}

export function healthLabel(pct: number): 'Strong' | 'Forming' | 'Sparse' {
  if (pct >= 70) return 'Strong';
  if (pct >= 30) return 'Forming';
  return 'Sparse';
}

export function phaseNotesCaptured(vision: VisionData | undefined): {
  filled: number;
  total: number;
} {
  const notes = vision?.phaseNotes ?? [];
  return {
    filled: notes.filter((p) => p.notes.trim().length > 0).length,
    total: notes.length || 3,
  };
}
