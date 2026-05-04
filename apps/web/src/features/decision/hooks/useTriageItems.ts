/**
 * useTriageItems — shared triage derivation for the §21 "what must be
 * solved first" rollup. Extracted from WhatMustBeSolvedFirstCard so the
 * Feasibility Command Center hero, blockers strip, and decision rail can
 * consume the same shape without duplicating the derivation logic.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';

export type TriageTier = 'first' | 'then' | 'eventually';

export interface TriageItem {
  tier: TriageTier;
  label: string;
  detail: string;
  rationale: string;
  resolved: boolean;
}

export const TRIAGE_TIER_LABEL: Record<TriageTier, string> = {
  first: 'First',
  then: 'Then',
  eventually: 'Eventually',
};

export const TRIAGE_TIER_BLURB: Record<TriageTier, string> = {
  first: 'Without these, nothing downstream computes.',
  then: 'Blocks the next phase of design and feasibility.',
  eventually: 'Soft preferences and nice-to-haves — can wait.',
};

export interface TriageRollup {
  items: TriageItem[];
  open: TriageItem[];
  resolvedCount: number;
  openCounts: Record<TriageTier, number>;
  grouped: Record<TriageTier, TriageItem[]>;
  verdict: { tone: 'block' | 'work' | 'easy' | 'done'; label: string };
}

export function useTriageItems(project: LocalProject): TriageRollup {
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const siteData = useSiteData(project.id);

  return useMemo<TriageRollup>(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const zones = allZones.filter((z) => z.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);

    const climate = siteData ? getLayerSummary(siteData, 'climate') : null;
    const elevation = siteData ? getLayerSummary(siteData, 'elevation') : null;
    const soils = siteData ? getLayerSummary(siteData, 'soils') : null;
    const wetFlood = siteData ? getLayerSummary(siteData, 'wetlands_flood') : null;
    const watershed = siteData ? getLayerSummary(siteData, 'watershed') : null;

    const items: TriageItem[] = [];

    // ── First — site can't compute without these ───────────────────────
    items.push({
      tier: 'first',
      label: 'Parcel boundary',
      detail: project.hasParcelBoundary ? 'Boundary geometry on file.' : 'No boundary drawn or imported.',
      rationale: 'Every area, setback, and per-acre rollup keys off the parcel polygon.',
      resolved: !!project.hasParcelBoundary,
    });
    items.push({
      tier: 'first',
      label: 'Project type & intent',
      detail: project.projectType ? `Type: ${project.projectType}.` : 'Not selected.',
      rationale: 'Vision-fit thresholds and rule weights are project-type-specific.',
      resolved: !!project.projectType,
    });
    items.push({
      tier: 'first',
      label: 'Property acreage',
      detail: project.acreage ? `${project.acreage} ha on file.` : 'Not set.',
      rationale: 'Drives carrying capacity, biomass, and per-acre cost rollups.',
      resolved: !!project.acreage && project.acreage > 0,
    });
    items.push({
      tier: 'first',
      label: 'Tier-1 elevation layer',
      detail: elevation ? 'Elevation / slope tile loaded.' : 'Elevation not yet fetched.',
      rationale: 'Slope / aspect derives from the elevation tile; nothing terrain-aware works without it.',
      resolved: !!elevation,
    });

    // ── Then — blocks the next design phase ────────────────────────────
    items.push({
      tier: 'then',
      label: 'Tier-1 climate layer',
      detail: climate ? 'Climate tile loaded.' : 'Climate not yet fetched.',
      rationale: 'Hardiness zone and Köppen drive crop and structure suitability.',
      resolved: !!climate,
    });
    items.push({
      tier: 'then',
      label: 'Tier-1 soils layer',
      detail: soils ? 'Soil survey loaded.' : 'Soils not yet fetched.',
      rationale: 'Drainage and texture gate orchard, septic, and pad placement.',
      resolved: !!soils,
    });
    items.push({
      tier: 'then',
      label: 'Land zones',
      detail: zones.length >= 3 ? `${zones.length} zones placed.` : `${zones.length} zone${zones.length === 1 ? '' : 's'} — needs at least 3.`,
      rationale: 'Without ≥3 zones the land-use mix is ambiguous; vision fit cannot resolve.',
      resolved: zones.length >= 3,
    });
    items.push({
      tier: 'then',
      label: 'Main vehicle access',
      detail: paths.some((p) => p.type === 'main_road')
        ? 'Main road path drawn.'
        : paths.length > 0
          ? `${paths.length} secondary path${paths.length === 1 ? '' : 's'} — no main road designated.`
          : 'No paths drawn.',
      rationale: 'Phase-1 prerequisite — emergency, delivery, and farm access all hang off the main road.',
      resolved: paths.some((p) => p.type === 'main_road'),
    });
    items.push({
      tier: 'then',
      label: 'At least one structure',
      detail: structures.length > 0 ? `${structures.length} placed.` : 'None placed.',
      rationale: 'Habitable structures anchor septic, water, and shadow rules.',
      resolved: structures.length > 0,
    });

    // ── Eventually — soft preferences ──────────────────────────────────
    items.push({
      tier: 'eventually',
      label: 'Wetland / flood overlay',
      detail: wetFlood ? 'Loaded.' : 'Not fetched.',
      rationale: 'Refines siting risk near water; not blocking unless wet zones intersect placements.',
      resolved: !!wetFlood,
    });
    items.push({
      tier: 'eventually',
      label: 'Watershed layer',
      detail: watershed ? 'Loaded.' : 'Not fetched.',
      rationale: 'Drainage context — useful for water strategy refinement.',
      resolved: !!watershed,
    });
    items.push({
      tier: 'eventually',
      label: 'Utility coverage (≥3)',
      detail: utilities.length >= 3 ? `${utilities.length} placed.` : `${utilities.length} placed — ${3 - utilities.length} short of off-grid scoring threshold.`,
      rationale: 'Off-grid readiness needs water + energy + waste at minimum; defer until structures locked.',
      resolved: utilities.length >= 3,
    });

    const open = items.filter((i) => !i.resolved);
    const resolvedCount = items.length - open.length;

    const openCounts: Record<TriageTier, number> = { first: 0, then: 0, eventually: 0 };
    for (const it of open) openCounts[it.tier] += 1;

    const grouped: Record<TriageTier, TriageItem[]> = { first: [], then: [], eventually: [] };
    for (const it of open) grouped[it.tier].push(it);

    const verdict: TriageRollup['verdict'] =
      openCounts.first > 0
        ? { tone: 'block', label: `${openCounts.first} blocker${openCounts.first === 1 ? '' : 's'} — start here` }
        : openCounts.then > 0
          ? { tone: 'work', label: `Foundations clear — ${openCounts.then} item${openCounts.then === 1 ? '' : 's'} to land next` }
          : openCounts.eventually > 0
            ? { tone: 'easy', label: 'Solid base — only soft items remain' }
            : { tone: 'done', label: 'Everything tracked is in place.' };

    return { items, open, resolvedCount, openCounts, grouped, verdict };
  }, [allStructures, allZones, allPaths, allUtilities, siteData, project]);
}
