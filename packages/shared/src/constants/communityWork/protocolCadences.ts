/**
 * protocolCadences.ts — machine-readable cadences for ecovillage standing protocols.
 *
 * The protocol catalogues (constants/protocol/catalogues/ecovillage.ts) carry
 * prose conditions with [bracketed window] placeholders and no machine cadence.
 * This catalogue supplies the explicit cadence the community work-plan generator
 * needs: protocol id → { recurrence, kind }. Entries are CURATED for the
 * community-bearing catalogues (ecovillage primary; future secondary layers to
 * be appended here as they are defined).
 *
 * Protocols NOT listed here are either:
 *   - threshold / judgment protocols — event-driven and generate no standing
 *     calendar work (see exclusions below); or
 *   - cyclical protocols without a curated cadence — `generateCommunityWorkPlan`
 *     may fall back to a sensible default for those, but listing them here
 *     is preferred.
 *
 * The cadence values are DRAFTED defaults — the operator can reschedule any
 * generated instance before or after confirming it; the protocol prose remains
 * the authority on intent.
 *
 * DELIBERATELY ABSENT protocols:
 *   - 'eco-shared-resource-load'   (type: 'threshold') — fires when shared
 *     water/energy/waste load approaches a ceiling; it is triggered by a
 *     measured condition, not a calendar. There is no safe standing cadence
 *     that substitutes for the threshold check.
 *   - 'eco-member-capacity-balance' (type: 'judgment') — surfaces when
 *     contribution load becomes unevenly distributed; this is a relational
 *     observation requiring human judgment, not a schedulable cadence event.
 *
 * Both exclusions follow the same rationale as the livestock cadence catalogue's
 * exclusions: event-driven protocols are not calendar-generable. Forcing a
 * fixed cadence onto them would degrade the protocol's signal (false urgency on
 * calm periods; false silence in acute ones).
 */

import type { WorkItemRecurrence } from '../../schemas/workItem.schema.js';
import type { CommunityWorkKind } from '../../schemas/communityWork/communityWork.schema.js';

export interface CommunityProtocolCadenceSpec {
  recurrence: WorkItemRecurrence;
  kind: CommunityWorkKind;
}

export const COMMUNITY_PROTOCOL_CADENCES: Readonly<
  Record<string, CommunityProtocolCadenceSpec>
> = {
  // --- ecovillage (primary) -----------------------------------------------

  /**
   * Cyclical governance review cadence.
   * objectiveId: ev-s1-conflict-framework
   * "IF the [governance review cadence] arrives OR an unresolved dispute is
   *  open past [window]" — standing quarterly convening keeps the process alive
   * and ensures disputes don't outlast a season.
   */
  'eco-governance-decision-cadence': {
    recurrence: 'quarterly',
    kind: 'governance-meeting',
  },

  /**
   * Cyclical commons stewardship review.
   * No objectiveId; no scopeNotes on the protocol entry.
   * "IF the [commons review cadence] arrives" — quarterly review assigns
   * the diffuse care that shared-land ownership tends to drop.
   */
  'eco-common-land-stewardship': {
    recurrence: 'quarterly',
    kind: 'commons-review',
  },
};
