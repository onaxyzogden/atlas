// @vitest-environment happy-dom
/**
 * Guard for the stratum → legacy-card reference bridge.
 *
 * A stratum objective surfaces a legacy module card in the spine when it
 * carries a `legacyCardSectionId` (rendered by DetailsExpander's
 * `renderLegacyCard` switch). This test ratchets two invariants so a typo or
 * a half-wired mapping can't ship a silent "No legacy card registered"
 * placeholder:
 *
 *  1. every `legacyCardSectionId` in PLAN_STRATUM_OBJECTIVES is a REAL
 *     sectionId present in MODULE_CARDS (the legacy module-bar registry); and
 *  2. every such sectionId has a `case` in DetailsExpander.renderLegacyCard
 *     (proxied here by the RENDERED_LEGACY_CARD_SECTION_IDS allow-list the
 *     switch is built from).
 */

import { describe, expect, it } from 'vitest';
import { PLAN_STRATUM_OBJECTIVES } from '@ogden/shared';
import { MODULE_CARDS } from '../../types';

// sectionIds DetailsExpander.renderLegacyCard knows how to render. Keep in
// lockstep with the switch in DetailsExpander.tsx.
const RENDERED_LEGACY_CARD_SECTION_IDS = new Set([
  'plan-develop-plan',
  'plan-social-nodes',
  'plan-soil-baseline',
  'plan-zone-overview',
  'plan-sector-overlay',
  'plan-water-network',
  'plan-closed-loop-graph',
  'plan-phasing-matrix',
]);

const ALL_SECTION_IDS = new Set(
  Object.values(MODULE_CARDS).flatMap((cards) => cards.map((c) => c.sectionId)),
);

const mappings = PLAN_STRATUM_OBJECTIVES.flatMap((o) =>
  o.legacyCardSectionId
    ? [{ objectiveId: o.id, sectionId: o.legacyCardSectionId }]
    : [],
);

describe('stratum legacyCardSectionId bridge', () => {
  it('maps at least the widened 8 reference cards', () => {
    expect(mappings.length).toBeGreaterThanOrEqual(8);
  });

  it.each(mappings)(
    '$objectiveId → $sectionId is a real MODULE_CARDS sectionId',
    ({ sectionId }) => {
      expect(ALL_SECTION_IDS.has(sectionId)).toBe(true);
    },
  );

  it.each(mappings)(
    '$objectiveId → $sectionId is renderable by DetailsExpander',
    ({ sectionId }) => {
      expect(RENDERED_LEGACY_CARD_SECTION_IDS.has(sectionId)).toBe(true);
    },
  );
});
