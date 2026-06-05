/**
 * trueNorthConfig — static descriptors for the 8 True North (Stage 0) segments.
 *
 * Mirrors `observeCompassConfig` for the Observe compass: each segment becomes
 * one wheel wedge with an id, ordinal badge, label, lucide icon, accent colour,
 * and a short right-panel summary. The backing data for each segment lives in
 * the goal tree (Core Vision), the True North store (segments 2,3,4,5,6,7,8),
 * and the Site Profile (zoning/access/conservation/floodplain facets).
 */

import {
  Target,
  ListChecks,
  Scale,
  HandCoins,
  Route,
  Leaf,
  Users,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ProjectArchetype } from '../plan/data/goalCompassTypes.js';
import type { TrueNorthSegmentId } from './data/trueNorthTypes.js';

export interface TrueNorthSegment {
  id: TrueNorthSegmentId;
  /** 1-based position used for the ordinal badge + wheel order. */
  ordinal: number;
  label: string;
  icon: LucideIcon;
  accent: string;
  /** Short right-panel body shown above the intake form. */
  summary: string;
}

/** Wheel order matches the doc's Goal Compass segment sequence. */
export const TRUE_NORTH_SEGMENTS: readonly TrueNorthSegment[] = [
  {
    id: 'core-vision',
    ordinal: 1,
    label: 'Core Vision',
    icon: Target,
    accent: '#c2783f',
    summary:
      'Name the goal this land must serve. Your archetype and parent goal set what every later step is measured against — observation only matters in service of this.',
  },
  {
    id: 'required-functions',
    ordinal: 2,
    label: 'Required Land Functions',
    icon: ListChecks,
    accent: '#8a9a3f',
    summary:
      'What must the land physically support? Growing food, grazing, hosting visitors, water storage, housing — the non-negotiable functions your vision depends on.',
  },
  {
    id: 'legal-zoning',
    ordinal: 3,
    label: 'Legal & Zoning Fit',
    icon: Scale,
    accent: '#4f7c8a',
    summary:
      'Does the law allow your core use here? Zoning class, legal access, and the permits you will need — the disqualifiers that no design effort can overcome.',
  },
  {
    id: 'financial',
    ordinal: 4,
    label: 'Financial Fit',
    icon: HandCoins,
    accent: '#9c6f3f',
    summary:
      'Can the project be funded and carried? Covenant-permitted capital channels only — charitable donation, qard ḥasan, in-kind, sponsorship. No riba, no advance-purchase.',
  },
  {
    id: 'access-market',
    ordinal: 5,
    label: 'Access & Market Fit',
    icon: Route,
    accent: '#7a8a6f',
    summary:
      'Can you reach the land, and can it reach the people it serves? Road quality, year-round access, and distance to your audience or market.',
  },
  {
    id: 'ecological',
    ordinal: 6,
    label: 'Ecological Non-Negotiables',
    icon: Leaf,
    accent: '#5f8a4f',
    summary:
      'What must be protected no matter what? Wetlands, habitat, floodplains, conservation overlays — features you commit to respect before any earth is moved.',
  },
  {
    id: 'human-neighbour',
    ordinal: 7,
    label: 'Human & Neighbour Fit',
    icon: Users,
    accent: '#8a7a4f',
    summary:
      'Who shares this landscape? Neighbour proximity, conflict risk, and the attitude of the municipality — the human context that can quietly make or break a project.',
  },
  {
    id: 'deal-breakers',
    ordinal: 8,
    label: 'Deal Breakers & Red Flags',
    icon: ShieldAlert,
    accent: '#b04a3a',
    summary:
      'The hard stops. Flag any condition that would disqualify this property outright — no legal access, no water path, contamination. These drive the strongest verdicts.',
  },
];

export function segmentById(id: TrueNorthSegmentId): TrueNorthSegment {
  // TRUE_NORTH_SEGMENTS covers every TrueNorthSegmentId and is never empty.
  return TRUE_NORTH_SEGMENTS.find((s) => s.id === id) ?? TRUE_NORTH_SEGMENTS[0]!;
}

/**
 * Bridge the Plan goal-tree archetype vocabulary (6, hyphenated) to the
 * `visionFit` project-type vocabulary (7, underscored) so the Fit Gate can fold
 * GIS scores against the steward's chosen goal. `moontrance` has no archetype
 * counterpart, so it is unreachable here by design.
 */
export const ARCHETYPE_TO_PROJECT_TYPE: Record<ProjectArchetype, string> = {
  homestead: 'homestead',
  'regenerative-farm': 'regenerative_farm',
  retreat: 'retreat_center',
  education: 'educational_farm',
  conservation: 'conservation',
  'multi-enterprise': 'multi_enterprise',
};
