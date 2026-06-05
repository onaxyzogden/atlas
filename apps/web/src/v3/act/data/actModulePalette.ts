/**
 * Per-domain dot colour palette for the Act stage (slice 3b+3c — rebased
 * onto UniversalDomain). First-wins from the legacy ActModule palette
 * via ACT_MODULE_TO_DOMAIN; unauthored domains fall back to a neutral
 * grey (`#9CA3AF`). See ADR
 * 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import type { UniversalDomain } from '@ogden/shared';

const FALLBACK_DOT = '#9CA3AF';

export const ACT_MODULE_DOT: Record<UniversalDomain, string> = {
  'vision-intent':        FALLBACK_DOT,
  'land-base':            FALLBACK_DOT,
  'climate':              FALLBACK_DOT,
  'topography':           FALLBACK_DOT,
  'hydrology':            FALLBACK_DOT,
  'soil':                 FALLBACK_DOT,
  'ecology':              FALLBACK_DOT,
  'plants-food':          '#6fae54', // ← harvest
  'animals-livestock':    '#c0843f', // ← livestock
  'built-infrastructure': '#b5651d', // ← build (first), maintain
  'access-circulation':   FALLBACK_DOT,
  'energy-resources':     FALLBACK_DOT,
  'people-governance':    '#4f9aa8', // ← network
  'economics-capacity':   '#d4a24a', // ← schedule
  'risk-compliance':      FALLBACK_DOT,
  'monitoring-records':   '#c98a3c', // ← tracker (first), review
};
