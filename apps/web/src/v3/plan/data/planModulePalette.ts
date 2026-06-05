/**
 * Per-domain dot colour palette for the Plan stage (slice 3b+3c — rebased
 * onto UniversalDomain). First-wins from the legacy PlanModule palette
 * via PLAN_MODULE_TO_DOMAIN; unauthored domains fall back to a neutral
 * grey (`#9CA3AF`). See ADR
 * 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import type { UniversalDomain } from '@ogden/shared';

const FALLBACK_DOT = '#9CA3AF';

export const PLAN_MODULE_DOT: Record<UniversalDomain, string> = {
  'vision-intent':        '#e2c075', // ← goal-compass
  'land-base':            FALLBACK_DOT,
  'climate':              '#e6c34a', // ← cross-section-solar
  'topography':           FALLBACK_DOT,
  'hydrology':            '#5fc7d4', // ← water-management
  'soil':                 '#8bd16a', // ← soil-fertility
  'ecology':              '#79c98a', // ← regeneration-monitor (first)
  'plants-food':          '#5dd39e', // ← plant-systems
  'animals-livestock':    '#c9a05a', // ← livestock
  'built-infrastructure': '#a06b48', // ← structures-subsystems (first)
  'access-circulation':   '#7aabca', // ← dynamic-layering (first)
  'energy-resources':     FALLBACK_DOT,
  'people-governance':    FALLBACK_DOT,
  'economics-capacity':   '#c4a265', // ← phasing-budgeting
  'risk-compliance':      '#e88aa4', // ← principle-verification
  'monitoring-records':   FALLBACK_DOT,
};
