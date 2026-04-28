/**
 * lifecycle — 7-stage banner taxonomy shared between LifecycleSidebar and
 * AdaptiveDecisionRail. Distinct from the 5-stage `STAGE_ORDER` in
 * `features/navigation/taxonomy.ts`, which buckets NAV_ITEMS for the sidebar
 * groups; this module describes the project's macro lifecycle phase.
 */

import { DASHBOARD_ROUTE_INDEX, type StageKey } from '../navigation/taxonomy.js';

export type BannerId = 'discover' | 'diagnose' | 'design' | 'prove' | 'build' | 'operate' | 'report';

export interface BannerStage {
  id: BannerId;
  label: string;
  /** Representative dashboardSection id this stage opens when clicked. */
  section: string;
}

export const LIFECYCLE_STAGES: readonly BannerStage[] = [
  { id: 'discover', label: 'Discover', section: 'site-intelligence' },
  { id: 'diagnose', label: 'Diagnose', section: 'siting-rules' },
  { id: 'design',   label: 'Design',   section: 'paddock-design' },
  { id: 'prove',    label: 'Prove',    section: 'feasibility' },
  { id: 'build',    label: 'Build',    section: 'infrastructure-utilities' },
  { id: 'operate',  label: 'Operate',  section: 'herd-rotation' },
  { id: 'report',   label: 'Report',   section: 'reporting' },
] as const;

const STAGE_TO_BANNER: Record<StageKey, BannerId> = {
  S1: 'discover',
  S2: 'diagnose',
  S3: 'design',
  S4: 'prove',
  S5: 'report',
};

/** Sections that override the S1–S5 mapping to light up Build / Operate. */
const SECTION_TO_BANNER_OVERRIDE: Record<string, BannerId> = {
  'infrastructure-utilities': 'build',
  'herd-rotation': 'operate',
};

export function deriveActiveBanner(activeSection: string): BannerId | null {
  const override = SECTION_TO_BANNER_OVERRIDE[activeSection];
  if (override) return override;
  const navItem = DASHBOARD_ROUTE_INDEX.get(activeSection);
  if (!navItem || !navItem.stage) return null;
  return STAGE_TO_BANNER[navItem.stage] ?? null;
}
