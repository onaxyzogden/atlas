/**
 * Rule engine executor — evaluates assessment rules against layer data
 * and returns sorted, typed AssessmentFlag arrays.
 */

import type { AssessmentFlag, AssessmentFlagCategory } from '@ogden/shared';
import type { MockLayerResult } from '../mockLayerData.js';
import { ASSESSMENT_RULES, type AssessmentRule } from './assessmentRules.js';

/* ------------------------------------------------------------------ */
/*  Rule context — pre-extracted layers + helpers                      */
/* ------------------------------------------------------------------ */

export interface RuleContext {
  layers: MockLayerResult[];
  country: string;
  elevation: MockLayerResult | undefined;
  soils: MockLayerResult | undefined;
  wetlands: MockLayerResult | undefined;
  landCover: MockLayerResult | undefined;
  climate: MockLayerResult | undefined;
  zoning: MockLayerResult | undefined;
  watershed: MockLayerResult | undefined;
  infrastructure: MockLayerResult | undefined;
  /** Number of distinct land cover classes */
  landClassCount: number;
  num: (layer: MockLayerResult | undefined, key: string) => number;
  str: (layer: MockLayerResult | undefined, key: string) => string;
}

function buildContext(
  layers: MockLayerResult[],
  country: string,
): RuleContext {
  const byType = (type: string) => layers.find((l) => l.layerType === type);

  const numHelper = (layer: MockLayerResult | undefined, key: string): number => {
    const v = layer?.summary?.[key];
    return typeof v === 'number' ? v : 0;
  };

  const strHelper = (layer: MockLayerResult | undefined, key: string): string => {
    const v = layer?.summary?.[key];
    return typeof v === 'string' ? v : '';
  };

  const landCover = byType('land_cover');
  const classes = landCover?.summary?.classes;
  const landClassCount =
    classes && typeof classes === 'object' ? Object.keys(classes).length : 0;

  return {
    layers,
    country,
    elevation: byType('elevation'),
    soils: byType('soils'),
    wetlands: byType('wetlands_flood'),
    landCover,
    climate: byType('climate'),
    zoning: byType('zoning'),
    watershed: byType('watershed'),
    infrastructure: byType('infrastructure'),
    landClassCount,
    num: numHelper,
    str: strHelper,
  };
}

/* ------------------------------------------------------------------ */
/*  Severity sort order                                                */
/* ------------------------------------------------------------------ */

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function compareFlags(a: AssessmentFlag, b: AssessmentFlag): number {
  const sevDiff = (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2);
  if (sevDiff !== 0) return sevDiff;
  return (a.priority ?? 50) - (b.priority ?? 50);
}

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

function evaluateRule(rule: AssessmentRule, ctx: RuleContext): AssessmentFlag | null {
  // Skip rules not matching the country
  if (rule.country !== 'all' && rule.country !== ctx.country) return null;

  try {
    if (!rule.condition(ctx)) return null;
  } catch {
    // Layer data missing or malformed — skip rule silently
    return null;
  }

  let message: string;
  try {
    message = rule.message(ctx);
  } catch {
    return null;
  }

  return {
    id: rule.id,
    type: rule.type,
    severity: rule.severity,
    category: rule.category as AssessmentFlagCategory,
    message,
    layerSource: rule.layerSource,
    priority: rule.priority,
    country: rule.country,
    needsSiteVisit: rule.needsSiteVisit ?? false,
  };
}

export interface RuleEngineResult {
  opportunities: AssessmentFlag[];
  risks: AssessmentFlag[];
}

export function evaluateAssessmentRules(
  layers: MockLayerResult[],
  country: string,
): RuleEngineResult {
  const ctx = buildContext(layers, country);

  const opportunities: AssessmentFlag[] = [];
  const risks: AssessmentFlag[] = [];

  for (const rule of ASSESSMENT_RULES) {
    const flag = evaluateRule(rule, ctx);
    if (!flag) continue;

    if (flag.type === 'opportunity') {
      opportunities.push(flag);
    } else {
      risks.push(flag);
    }
  }

  opportunities.sort(compareFlags);
  risks.sort(compareFlags);

  return { opportunities, risks };
}
