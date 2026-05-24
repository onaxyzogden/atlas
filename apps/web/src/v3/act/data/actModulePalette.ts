/**
 * actModulePalette — per-module accent dots for the Act stage, mirroring
 * PLAN_MODULE_DOT / OBSERVE_MODULE_DOT. Hues lean warm/operational and are
 * chosen to stay distinct from the Observe and Plan palettes so the three
 * stages read as different registers at a glance.
 *
 * Net-new copy for the Act Stage Compass (2026-05-24, Goal 6, Phase 4).
 */

import type { ActModule } from '../types.js';

export const ACT_MODULE_DOT: Record<ActModule, string> = {
  tracker: '#c98a3c', // amber ochre — execution tracking
  build: '#b5651d', // terracotta — construction
  maintain: '#7d8a99', // slate — tools / upkeep
  livestock: '#c0843f', // tan / leather — grazing
  harvest: '#6fae54', // muted leaf green — yield
  review: '#9a6fb0', // muted violet — risk / reflection
  network: '#4f9aa8', // deep teal — community
  schedule: '#d4a24a', // gold — calendar / season
};
