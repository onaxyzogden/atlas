/**
 * Fit Gate engine — Stage 0 / True North.
 *
 * Pure, deterministic. No AI, no side effects (mirrors the `visionFit.ts`
 * idiom). Given the steward's goal archetype, the True North questionnaire,
 * the Site Profile property facets, and the GIS vision-fit results, it grades
 * each dimension on a Green→Black severity scale and aggregates to an overall
 * Proceed / Caution / Pause / Reject verdict.
 *
 * The gate is ADVISORY: the worst severity drives the verdict, but nothing
 * here blocks the steward — the UI always offers "proceed anyway". The steward
 * is sovereign; the engine only surfaces what to weigh.
 */

import type {
  ProjectArchetype,
  SiteProfile,
} from '../../../plan/data/goalCompassTypes.js';
import type { TrueNorthProfile } from '../../data/trueNorthTypes.js';
import type { FitResult } from '../../../../lib/visionFit.js';

export type Severity = 'green' | 'yellow' | 'orange' | 'red' | 'black';
export type Verdict = 'proceed' | 'caution' | 'pause' | 'reject';

export interface SegmentFinding {
  /** Which Fit Gate dimension this finding belongs to. */
  dimension: string;
  label: string;
  severity: Severity;
  rationale: string;
}

export interface FitGateResult {
  findings: SegmentFinding[];
  /** Human-readable items the steward should confirm (the `unknown` answers). */
  unknowns: string[];
  worstSeverity: Severity;
  verdict: Verdict;
}

export interface FitGateInput {
  archetype: ProjectArchetype | null;
  trueNorth: TrueNorthProfile;
  siteProfile: SiteProfile;
  /** GIS vision-fit results from `computeVisionFit`. Empty if scores absent. */
  gisFit: FitResult[];
}

/* ------------------------------------------------------------------ */
/*  Severity ordering                                                  */
/* ------------------------------------------------------------------ */

const SEVERITY_RANK: Record<Severity, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
  black: 4,
};

function worse(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/** Worst severity ⇒ verdict. Monotonic, one step per severity tier. */
function severityToVerdict(s: Severity): Verdict {
  switch (s) {
    case 'green':
    case 'yellow':
      return 'proceed';
    case 'orange':
      return 'caution';
    case 'red':
      return 'pause';
    case 'black':
      return 'reject';
  }
}

/* ------------------------------------------------------------------ */
/*  Human-readable label catalogs                                      */
/* ------------------------------------------------------------------ */

const DEAL_BREAKER_LABELS: Record<string, string> = {
  'no-legal-access': 'No legal access',
  'zoning-prohibits-core-use': 'Zoning prohibits the core use',
  'no-water-path': 'No lawful path to water',
  'floodplain-covers-build': 'Floodplain covers the required build area',
  'conservation-blocks-infrastructure': 'Conservation rules block required infrastructure',
  'extreme-neighbour-conflict': 'Extreme neighbour conflict risk',
  'tenure-too-short': 'Land tenure too short for the investment',
  'soil-contamination': 'Soil contamination risk',
  'unsafe-access-road': 'Unsafe access road',
  'no-winter-access': 'No winter access',
  'capital-exceeds-threshold': 'Capital requirement exceeds threshold',
  'no-lawful-public-activity': 'No lawful path for public-facing activity',
};

/* ------------------------------------------------------------------ */
/*  Per-dimension grading                                              */
/* ------------------------------------------------------------------ */

function gradeDealBreakers(tn: TrueNorthProfile): SegmentFinding | null {
  if (tn.dealBreakers.length === 0) return null;
  const names = tn.dealBreakers
    .map((d) => DEAL_BREAKER_LABELS[d] ?? d)
    .join('; ');
  return {
    dimension: 'deal-breakers',
    label: 'Deal Breakers & Red Flags',
    severity: 'black',
    rationale: `Hard-stop condition(s) declared: ${names}. Resolve before committing.`,
  };
}

function gradeLegalZoning(
  tn: TrueNorthProfile,
  sp: SiteProfile,
  unknowns: string[],
): SegmentFinding {
  let severity: Severity = 'green';
  const notes: string[] = [];

  const permits = tn.legalZoning.zoningPermitsUse;
  if (permits === 'no') {
    severity = worse(severity, 'red');
    notes.push('current zoning does not permit the core use');
  } else if (permits === 'unknown') {
    severity = worse(severity, 'yellow');
    unknowns.push('Confirm whether zoning permits your core use');
  }

  const outstanding = tn.legalZoning.permitsRequired.filter(
    (p) => !tn.legalZoning.permitsConfirmed.includes(p),
  );
  if (outstanding.length > 0) {
    severity = worse(severity, 'orange');
    notes.push(`${outstanding.length} required permit(s) unconfirmed`);
  }

  const zf = sp.zoningFit.value;
  if (zf === 'prohibited') {
    severity = worse(severity, 'red');
    notes.push('parcel zoning fit: prohibited');
  } else if (zf === 'variance-needed') {
    severity = worse(severity, 'orange');
    notes.push('parcel zoning fit: variance needed');
  } else if (zf === 'conditional') {
    severity = worse(severity, 'yellow');
    notes.push('parcel zoning fit: conditional');
  } else if (zf === 'unknown' || zf === null) {
    severity = worse(severity, 'yellow');
    unknowns.push('Confirm parcel zoning designation');
  }

  const access = sp.legalAccess.value;
  if (access === 'none') {
    severity = worse(severity, 'black');
    notes.push('no legal access to the parcel');
  } else if (access === 'shared') {
    severity = worse(severity, 'orange');
    notes.push('access is shared/contingent');
  } else if (access === 'easement') {
    severity = worse(severity, 'yellow');
    notes.push('access by easement');
  } else if (access === 'unknown' || access === null) {
    severity = worse(severity, 'yellow');
    unknowns.push('Confirm legal access rights');
  }

  return {
    dimension: 'legal-zoning',
    label: 'Legal & Zoning Fit',
    severity,
    rationale:
      notes.length > 0 ? notes.join('; ') : 'No legal or zoning blockers declared.',
  };
}

function gradeFinancial(tn: TrueNorthProfile, unknowns: string[]): SegmentFinding {
  let severity: Severity = 'green';
  const notes: string[] = [];

  if (tn.financial.fundingSecured === 'no') {
    severity = worse(severity, 'orange');
    notes.push('funding not yet secured');
  } else if (tn.financial.fundingSecured === 'unknown') {
    severity = worse(severity, 'yellow');
    unknowns.push('Confirm whether funding is secured');
  }

  switch (tn.financial.carryingCostConfidence) {
    case 'low':
      severity = worse(severity, 'orange');
      notes.push('low confidence in carrying costs');
      break;
    case 'medium':
      severity = worse(severity, 'yellow');
      break;
    case 'unknown':
      severity = worse(severity, 'yellow');
      unknowns.push('Estimate carrying-cost sustainability');
      break;
    case 'high':
      break;
  }

  if (tn.financial.capitalChannels.length === 0) {
    severity = worse(severity, 'yellow');
    unknowns.push('Choose your capital channel(s)');
  }

  return {
    dimension: 'financial',
    label: 'Financial Fit',
    severity,
    rationale: notes.length > 0 ? notes.join('; ') : 'Financial posture looks workable.',
  };
}

function gradeAccessMarket(tn: TrueNorthProfile, unknowns: string[]): SegmentFinding {
  let severity: Severity = 'green';
  const notes: string[] = [];

  switch (tn.accessMarket.roadAccess) {
    case 'none':
      severity = worse(severity, 'red');
      notes.push('no road access');
      break;
    case 'poor':
      severity = worse(severity, 'orange');
      notes.push('poor road access');
      break;
    case 'adequate':
      severity = worse(severity, 'yellow');
      break;
    case 'unknown':
      severity = worse(severity, 'yellow');
      unknowns.push('Assess road access quality');
      break;
    case 'good':
      break;
  }

  if (tn.accessMarket.seasonalAccess === 'no') {
    severity = worse(severity, 'orange');
    notes.push('no year-round/winter access');
  } else if (tn.accessMarket.seasonalAccess === 'unknown') {
    severity = worse(severity, 'yellow');
    unknowns.push('Confirm winter / year-round access');
  }

  return {
    dimension: 'access-market',
    label: 'Access & Market Fit',
    severity,
    rationale: notes.length > 0 ? notes.join('; ') : 'Access looks workable.',
  };
}

function gradeEcological(tn: TrueNorthProfile, unknowns: string[]): SegmentFinding {
  let severity: Severity = 'green';
  const notes: string[] = [];

  if (tn.ecological.protectedFeatures.length > 0) {
    if (tn.ecological.respectCommitment === 'no') {
      severity = worse(severity, 'red');
      notes.push('sensitive features present but not committed to respect them');
    } else if (tn.ecological.respectCommitment === 'unknown') {
      severity = worse(severity, 'yellow');
      unknowns.push('Commit to respecting the sensitive ecological features');
    } else {
      notes.push(
        `${tn.ecological.protectedFeatures.length} sensitive feature(s) acknowledged & protected`,
      );
    }
  }

  return {
    dimension: 'ecological',
    label: 'Ecological Non-Negotiables',
    severity,
    rationale: notes.length > 0 ? notes.join('; ') : 'No ecological non-negotiables flagged.',
  };
}

function gradeHumanNeighbour(tn: TrueNorthProfile, unknowns: string[]): SegmentFinding {
  let severity: Severity = 'green';
  const notes: string[] = [];

  switch (tn.humanNeighbour.conflictRisk) {
    case 'high':
      severity = worse(severity, 'orange');
      notes.push('high neighbour-conflict risk');
      break;
    case 'medium':
      severity = worse(severity, 'yellow');
      break;
    case 'unknown':
      severity = worse(severity, 'yellow');
      unknowns.push('Assess neighbour-conflict risk');
      break;
    case 'low':
      break;
  }

  switch (tn.humanNeighbour.municipalAttitude) {
    case 'resistant':
      severity = worse(severity, 'orange');
      notes.push('municipality appears resistant');
      break;
    case 'neutral':
      severity = worse(severity, 'yellow');
      break;
    case 'unknown':
      severity = worse(severity, 'yellow');
      unknowns.push('Gauge municipal attitude');
      break;
    case 'supportive':
      break;
  }

  return {
    dimension: 'human-neighbour',
    label: 'Human & Neighbour Fit',
    severity,
    rationale: notes.length > 0 ? notes.join('; ') : 'Human context looks supportive.',
  };
}

function gradeEcologyHazards(sp: SiteProfile, unknowns: string[]): SegmentFinding | null {
  let severity: Severity = 'green';
  const notes: string[] = [];

  const co = sp.conservationOverlay.value;
  if (co === 'extensive') {
    severity = worse(severity, 'red');
    notes.push('extensive conservation overlay');
  } else if (co === 'partial') {
    severity = worse(severity, 'orange');
    notes.push('partial conservation overlay');
  } else if (co === 'buffer-only') {
    severity = worse(severity, 'yellow');
    notes.push('buffer-only conservation overlay');
  } else if (co === 'unknown' || co === null) {
    severity = worse(severity, 'yellow');
    unknowns.push('Confirm conservation overlays');
  }

  const fp = sp.floodplainExtent.value;
  if (fp === 'extensive') {
    severity = worse(severity, 'red');
    notes.push('extensive floodplain');
  } else if (fp === 'partial') {
    severity = worse(severity, 'orange');
    notes.push('partial floodplain');
  } else if (fp === 'fringe') {
    severity = worse(severity, 'yellow');
    notes.push('floodplain fringe');
  } else if (fp === 'unknown' || fp === null) {
    severity = worse(severity, 'yellow');
    unknowns.push('Confirm floodplain extent');
  }

  if (notes.length === 0 && severity === 'green') return null;
  return {
    dimension: 'site-overlays',
    label: 'Conservation & Floodplain',
    severity,
    rationale: notes.length > 0 ? notes.join('; ') : 'No regulated-land constraints flagged.',
  };
}

/** Fold GIS vision-fit results into one finding (worst-weighted). */
function gradeGis(gisFit: FitResult[]): SegmentFinding | null {
  if (gisFit.length === 0) return null;
  let severity: Severity = 'green';
  const challenged: string[] = [];

  for (const r of gisFit) {
    let s: Severity = 'green';
    if (r.status === 'strong') s = 'green';
    else if (r.status === 'moderate') s = 'yellow';
    else if (r.status === 'challenge') {
      s = r.weight === 'critical' ? 'red' : r.weight === 'important' ? 'orange' : 'yellow';
      challenged.push(`${r.scoreName} (${r.weight})`);
    }
    severity = worse(severity, s);
  }

  return {
    dimension: 'gis',
    label: 'Land Suitability (GIS)',
    severity,
    rationale:
      challenged.length > 0
        ? `Below target: ${challenged.join('; ')}`
        : 'Computed land scores meet the goal thresholds.',
  };
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

export function computeFitGate(input: FitGateInput): FitGateResult {
  const { trueNorth, siteProfile, gisFit } = input;
  const unknowns: string[] = [];

  const findings: SegmentFinding[] = [
    gradeDealBreakers(trueNorth),
    gradeLegalZoning(trueNorth, siteProfile, unknowns),
    gradeFinancial(trueNorth, unknowns),
    gradeAccessMarket(trueNorth, unknowns),
    gradeEcological(trueNorth, unknowns),
    gradeHumanNeighbour(trueNorth, unknowns),
    gradeEcologyHazards(siteProfile, unknowns),
    gradeGis(gisFit),
  ].filter((f): f is SegmentFinding => f !== null);

  const worstSeverity = findings.reduce<Severity>(
    (acc, f) => worse(acc, f.severity),
    'green',
  );

  return {
    findings,
    unknowns,
    worstSeverity,
    verdict: severityToVerdict(worstSeverity),
  };
}

/** Human-readable label for a verdict. */
export function verdictLabel(v: Verdict): string {
  switch (v) {
    case 'proceed':
      return 'Proceed to Observe';
    case 'caution':
      return 'Proceed with Caution';
    case 'pause':
      return 'Pause & Verify';
    case 'reject':
      return 'Not Recommended';
  }
}

/** Human-readable label for a severity. */
export function severityLabel(s: Severity): string {
  switch (s) {
    case 'green':
      return 'Compatible';
    case 'yellow':
      return 'Investigate';
    case 'orange':
      return 'Serious Constraint';
    case 'red':
      return 'Potential Disqualifier';
    case 'black':
      return 'Hard Stop';
  }
}
