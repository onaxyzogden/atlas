/**
 * SitingRules — rule definitions for structure placement,
 * zone conflicts, and design intelligence.
 *
 * Each rule checks a condition and returns violations with
 * severity, explanation, and suggested fix.
 */

export type RuleSeverity = 'error' | 'warning' | 'info';
export type RuleCategory = 'setback' | 'slope' | 'solar' | 'privacy' | 'buffer' | 'water' | 'conflict' | 'access';

export interface RuleViolation {
  ruleId: string;
  severity: RuleSeverity;
  category: RuleCategory;
  title: string;
  description: string;
  suggestion: string;
  affectedElementId: string;
  affectedElementName: string;
  needsSiteVisit: boolean;
}

// Setback distances in meters
export const SETBACK_RULES = {
  front: 15,
  side: 6,
  rear: 10,
  riparian: 30,
  wetland: 120,
  well_septic: 30,
  livestock_spiritual: 50,
  guest_privacy: 25,
};

// Slope thresholds in degrees
export const SLOPE_RULES = {
  structure_max: 25,
  structure_warn: 15,
  road_max: 15,
  road_warn: 10,
};

// Solar orientation
export const SOLAR_RULES = {
  preferred_aspects: ['S', 'SE', 'SW'],
  dwelling_types: ['cabin', 'earthship', 'yurt', 'greenhouse'],
};
