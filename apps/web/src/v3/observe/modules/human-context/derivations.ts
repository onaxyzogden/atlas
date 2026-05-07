/**
 * derivations — pure helpers turning visionStore state into the numbers,
 * labels, and counts the Human Context dashboard / detail pages display.
 *
 * Kept dependency-free so it tests fast and can be reused by future
 * synthesis features.
 */

import type {
  RegionalContext,
  StewardProfile,
  VisionData,
} from '../../../../store/visionStore.js';

/* --------------------------- steward ---------------------------------- */

/** The eight fields counted toward steward completeness. */
const STEWARD_FIELDS: Array<keyof StewardProfile> = [
  'name',
  'age',
  'occupation',
  'lifestyle',
  'maintenanceHrsInitial',
  'maintenanceHrsOngoing',
  'budget',
  'skills',
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

export function visionCounts(steward: StewardProfile | undefined): VisionCounts {
  return {
    coreFunctions: steward?.coreFunctions?.length ?? 0,
    successMetrics: steward?.successMetrics?.length ?? 0,
    moodboardImages: steward?.moodboardImages?.length ?? 0,
    experienceGoals: steward?.experienceGoals?.length ?? 0,
    principles: steward?.principles?.length ?? 0,
    guidingValues: steward?.guidingValues?.length ?? 0,
    constraints: steward?.constraints?.length ?? 0,
  };
}

export function visionCompleteness(vision: VisionData | undefined): Completeness {
  const steward = vision?.steward;
  const checks: boolean[] = [
    isFilled(steward?.vision),
    (steward?.coreFunctions?.length ?? 0) > 0,
    (steward?.successMetrics?.length ?? 0) > 0,
    (steward?.experienceGoals?.length ?? 0) > 0,
    (steward?.moodboardImages?.length ?? 0) > 0,
    (vision?.phaseNotes ?? []).some((p) => p.notes.trim().length > 0),
  ];
  const total = checks.length;
  const filled = checks.filter(Boolean).length;
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

/* --------------------------- module rollup ---------------------------- */

export function moduleCompleteness(vision: VisionData | undefined): Completeness {
  const sw = stewardCompleteness(vision?.steward);
  const rg = regionalCompleteness(vision?.regional);
  const vs = visionCompleteness(vision);
  // Weighted: steward 40%, regional 35%, vision 25%.
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
