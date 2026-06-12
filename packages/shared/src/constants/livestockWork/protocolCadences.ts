/**
 * protocolCadences.ts — machine-readable cadences for standing protocols.
 *
 * The protocol catalogues (constants/protocol/catalogues/) carry prose
 * conditions with [bracketed window] placeholders and no machine cadence.
 * This catalogue supplies the explicit cadence the livestock work-plan
 * generator needs: protocol id → { recurrence, kind }. Entries are CURATED
 * for the livestock-bearing catalogues (homestead, silvopasture,
 * livestock_operation primary + secondary, regen-farm rotation rest).
 *
 * Protocols NOT listed here are cadenced only when their `type` is
 * 'cyclical' — `generateLivestockWorkPlan` falls back to quarterly
 * 'custom' for those, so a cyclical protocol surfaces on the schedule
 * rather than silently vanishing. Threshold/judgment protocols without an
 * entry are event-driven and generate no standing work.
 *
 * The cadence values are DRAFTED defaults under the 2026-06-03 "I draft
 * full content" ruling — the operator can reschedule any generated
 * instance before or after confirming it; the protocol prose remains the
 * authority on intent.
 */

import type { WorkItemRecurrence } from '../../schemas/workItem.schema.js';
import type { LivestockWorkKind } from '../../schemas/livestockWork/livestockWork.schema.js';

export interface ProtocolCadenceSpec {
  recurrence: WorkItemRecurrence;
  kind: LivestockWorkKind;
}

export const PROTOCOL_CADENCES: Readonly<Record<string, ProtocolCadenceSpec>> =
  {
    // --- homestead -------------------------------------------------------
    /** "IF no welfare check ... recorded in [window]" → weekly standing check. */
    'hs-small-livestock-welfare': { recurrence: 'weekly', kind: 'welfare-check' },

    // --- silvopasture (primary) -----------------------------------------
    /** Cyclical pre-entry check; monthly approximates the rotation rhythm. */
    'silv-rotational-fencing-integrity': {
      recurrence: 'monthly',
      kind: 'fence-integrity-check',
    },
    'silv-tree-browse-damage': {
      recurrence: 'monthly',
      kind: 'tree-protection-check',
    },
    'silv-establishment-protection': {
      recurrence: 'monthly',
      kind: 'tree-protection-check',
    },

    // --- silvopasture (secondary, layered onto a host primary) ----------
    'silv2-integrated-browse-window': {
      recurrence: 'monthly',
      kind: 'tree-protection-check',
    },
    'silv2-nutrient-distribution': { recurrence: 'quarterly', kind: 'custom' },

    // --- livestock_operation (primary) -----------------------------------
    /** "[health monitoring cadence]" → weekly herd inspection. */
    'lvo-herd-health-surveillance': {
      recurrence: 'weekly',
      kind: 'welfare-check',
    },
    /** Reserve-floor thresholds become standing reserve checks. */
    'lvo-feed-reserve': { recurrence: 'monthly', kind: 'feed-water-check' },
    /** Same-day welfare imperative → weekly proactive access check. */
    'lvo-water-access': { recurrence: 'weekly', kind: 'feed-water-check' },
    'lvo-stocking-rate-carrying-capacity': {
      recurrence: 'quarterly',
      kind: 'graze-rest-review',
    },

    // --- livestock_operation (secondary) ---------------------------------
    'lvo2-integration-grazing-pressure': {
      recurrence: 'monthly',
      kind: 'graze-rest-review',
    },
    'lvo2-manure-nutrient-load': { recurrence: 'quarterly', kind: 'custom' },

    // --- regenerative farm ------------------------------------------------
    /** Rest-period discipline check alongside the rotation. */
    'rf-rotation-rest-period': {
      recurrence: 'monthly',
      kind: 'graze-rest-review',
    },
  };

/** Fallback for cyclical protocols absent from PROTOCOL_CADENCES. */
export const CYCLICAL_FALLBACK_CADENCE: ProtocolCadenceSpec = {
  recurrence: 'quarterly',
  kind: 'custom',
};
