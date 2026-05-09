/**
 * Per-module dot colour palette for the Plan stage.
 *
 * Lifted from PlanChecklistAside so PlanProjectTypeCard can reuse the same
 * hues for its per-item module-jump chips. Both consumers set the colour
 * inline via a CSS custom property (`--group-dot` on the GuidanceCard,
 * `--module-dot` on the project-type chip) and the module-key → hex map
 * is single-sourced here.
 */

import type { PlanModule } from '../types.js';

export const PLAN_MODULE_DOT: Record<PlanModule, string> = {
  'dynamic-layering': '#7aabca',
  'water-management': '#5fc7d4',
  'zone-circulation': '#d68bd0',
  'structures-subsystems': '#a06b48',
  livestock: '#c9a05a',
  'plant-systems': '#5dd39e',
  'soil-fertility': '#8bd16a',
  'cross-section-solar': '#e6c34a',
  'phasing-budgeting': '#c4a265',
  'principle-verification': '#e88aa4',
};
