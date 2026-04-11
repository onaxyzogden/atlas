/**
 * zoneAnalysis — pure helper functions for zone intelligence:
 * sizing defaults, conflict detection, allocation math, auto-suggest.
 */

import * as turf from '@turf/turf';
import type { LandZone, ZoneCategory } from '../../store/zoneStore.js';
import type { ScoredResult } from '../../lib/computeScores.js';
import type { SiteData } from '../../store/siteDataStore.js';
import { getLayerSummary } from '../../store/siteDataStore.js';

/* ------------------------------------------------------------------ */
/*  Zone Sizing Defaults                                               */
/* ------------------------------------------------------------------ */

export interface ZoneSizingDefault {
  minPct: number;
  maxPct: number;
  label: string;
}

export const ZONE_SIZING_DEFAULTS: Record<ZoneCategory, ZoneSizingDefault> = {
  conservation:     { minPct: 20, maxPct: 40, label: '20-40% conservation set-aside' },
  food_production:  { minPct: 10, maxPct: 30, label: '10-30% productive agriculture' },
  livestock:        { minPct: 10, maxPct: 25, label: '10-25% grazing / paddock' },
  habitation:       { minPct: 2,  maxPct: 8,  label: '2-8% habitation footprint' },
  spiritual:        { minPct: 3,  maxPct: 10, label: '3-10% spiritual / contemplation' },
  retreat:          { minPct: 5,  maxPct: 15, label: '5-15% guest accommodation' },
  water_retention:  { minPct: 5,  maxPct: 15, label: '5-15% water management' },
  infrastructure:   { minPct: 2,  maxPct: 5,  label: '2-5% infrastructure' },
  buffer:           { minPct: 5,  maxPct: 15, label: '5-15% buffer / setback' },
  access:           { minPct: 3,  maxPct: 8,  label: '3-8% circulation' },
  commons:          { minPct: 5,  maxPct: 15, label: '5-15% commons / gathering' },
  education:        { minPct: 2,  maxPct: 8,  label: '2-8% education' },
  future_expansion: { minPct: 5,  maxPct: 20, label: '5-20% future expansion' },
};

export interface ZoneSizingResult {
  zone: LandZone;
  actualAcres: number;
  minAcres: number;
  maxAcres: number;
  status: 'under' | 'within' | 'over';
}

export function computeZoneSizing(
  zones: LandZone[],
  totalAcreage: number | null,
): ZoneSizingResult[] {
  if (!totalAcreage || totalAcreage <= 0) return [];
  return zones.map((zone) => {
    const defaults = ZONE_SIZING_DEFAULTS[zone.category];
    const actualAcres = zone.areaM2 / 4046.86;
    const minAcres = (totalAcreage * defaults.minPct) / 100;
    const maxAcres = (totalAcreage * defaults.maxPct) / 100;
    const status = actualAcres < minAcres ? 'under' : actualAcres > maxAcres ? 'over' : 'within';
    return { zone, actualAcres, minAcres, maxAcres, status };
  });
}

/* ------------------------------------------------------------------ */
/*  Conflict Detection                                                 */
/* ------------------------------------------------------------------ */

export interface ZoneConflict {
  type: 'overlap' | 'adjacency' | 'regulatory';
  severity: 'error' | 'warning' | 'info';
  zoneIds: string[];
  zoneNames: string[];
  description: string;
}

const INCOMPATIBLE_ADJACENCIES: [ZoneCategory, ZoneCategory, string][] = [
  ['livestock', 'retreat', 'Livestock noise/odour near guest accommodation'],
  ['livestock', 'spiritual', 'Livestock near spiritual / contemplation zones'],
  ['infrastructure', 'conservation', 'Infrastructure encroaching on conservation'],
  ['infrastructure', 'spiritual', 'Infrastructure noise near spiritual zones'],
  ['access', 'conservation', 'Road access cutting through conservation'],
];

export function detectZoneConflicts(
  zones: LandZone[],
  zoningLayerSummary: Record<string, unknown> | null,
): ZoneConflict[] {
  const conflicts: ZoneConflict[] = [];

  // 1. Geometric overlaps
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i]!;
      const b = zones[j]!;
      try {
        const featureA = turf.feature(a.geometry);
        const featureB = turf.feature(b.geometry);
        const intersection = turf.intersect(turf.featureCollection([featureA, featureB]));
        if (intersection) {
          const overlapM2 = turf.area(intersection);
          if (overlapM2 > 1) {
            conflicts.push({
              type: 'overlap',
              severity: 'error',
              zoneIds: [a.id, b.id],
              zoneNames: [a.name, b.name],
              description: `"${a.name}" and "${b.name}" overlap by ${formatAreaShort(overlapM2)}`,
            });
          }
        }
      } catch {
        // Turf can throw on invalid geometries — skip pair
      }
    }
  }

  // 2. Incompatible adjacencies (within 10m buffer)
  for (const [catA, catB, reason] of INCOMPATIBLE_ADJACENCIES) {
    const groupA = zones.filter((z) => z.category === catA);
    const groupB = zones.filter((z) => z.category === catB);
    for (const a of groupA) {
      for (const b of groupB) {
        try {
          const buffered = turf.buffer(turf.feature(a.geometry), 10, { units: 'meters' });
          if (buffered && turf.booleanIntersects(buffered, turf.feature(b.geometry))) {
            conflicts.push({
              type: 'adjacency',
              severity: 'warning',
              zoneIds: [a.id, b.id],
              zoneNames: [a.name, b.name],
              description: `${reason}: "${a.name}" adjacent to "${b.name}"`,
            });
          }
        } catch {
          // skip
        }
      }
    }
  }

  // 3. Regulatory (if zoning layer data is available)
  if (zoningLayerSummary) {
    const permitted = zoningLayerSummary.permitted_uses as string[] | undefined;
    if (permitted && permitted.length > 0) {
      const permSet = new Set(permitted.map((p) => p.toLowerCase()));
      for (const z of zones) {
        const catLabel = z.category.replace(/_/g, ' ');
        // Simple heuristic: check if any permitted use keyword overlaps
        if (!permSet.has(catLabel) && !permSet.has(z.category)) {
          conflicts.push({
            type: 'regulatory',
            severity: 'info',
            zoneIds: [z.id],
            zoneNames: [z.name],
            description: `"${z.name}" (${catLabel}) may not align with local zoning`,
          });
        }
      }
    }
  }

  return conflicts;
}

/* ------------------------------------------------------------------ */
/*  Allocation Summary                                                 */
/* ------------------------------------------------------------------ */

export interface AllocationEntry {
  category: ZoneCategory;
  label: string;
  color: string;
  areaM2: number;
  acres: number;
  pct: number;
}

export interface AllocationSummary {
  entries: AllocationEntry[];
  totalZonedM2: number;
  totalPropertyM2: number;
  unallocatedM2: number;
  zonedPct: number;
}

export function computeAllocation(
  zones: LandZone[],
  totalAcreage: number | null,
  categoryConfig: Record<ZoneCategory, { label: string; color: string }>,
): AllocationSummary {
  const totalPropertyM2 = (totalAcreage ?? 0) * 4046.86;

  const byCat = new Map<ZoneCategory, number>();
  let totalZonedM2 = 0;
  for (const z of zones) {
    byCat.set(z.category, (byCat.get(z.category) ?? 0) + z.areaM2);
    totalZonedM2 += z.areaM2;
  }

  const entries: AllocationEntry[] = [];
  for (const [category, areaM2] of byCat) {
    const cfg = categoryConfig[category];
    entries.push({
      category,
      label: cfg.label,
      color: cfg.color,
      areaM2,
      acres: areaM2 / 4046.86,
      pct: totalPropertyM2 > 0 ? (areaM2 / totalPropertyM2) * 100 : 0,
    });
  }
  entries.sort((a, b) => b.areaM2 - a.areaM2);

  const unallocatedM2 = Math.max(0, totalPropertyM2 - totalZonedM2);
  const zonedPct = totalPropertyM2 > 0 ? (totalZonedM2 / totalPropertyM2) * 100 : 0;

  return { entries, totalZonedM2, totalPropertyM2, unallocatedM2, zonedPct };
}

/* ------------------------------------------------------------------ */
/*  Auto-Suggest                                                       */
/* ------------------------------------------------------------------ */

export interface ZoneSuggestion {
  category: ZoneCategory;
  label: string;
  reason: string;
  sourceName: string;
  sourceScore: number;
}

const SCORE_TO_ZONE: { scoreName: string; threshold: number; category: ZoneCategory; reason: string }[] = [
  { scoreName: 'Water Resilience', threshold: 60, category: 'water_retention', reason: 'Strong water resilience supports dedicated retention zones' },
  { scoreName: 'Agricultural Suitability', threshold: 65, category: 'food_production', reason: 'Soil and climate conditions favour productive agriculture' },
  { scoreName: 'Habitat Sensitivity', threshold: 70, category: 'conservation', reason: 'High ecological sensitivity warrants protected set-aside' },
  { scoreName: 'Regenerative Potential', threshold: 60, category: 'conservation', reason: 'Significant regeneration opportunity in conservation zones' },
  { scoreName: 'Buildability', threshold: 70, category: 'habitation', reason: 'Favourable terrain for habitation development' },
  { scoreName: 'Stewardship Readiness', threshold: 65, category: 'commons', reason: 'Site conditions support community stewardship areas' },
];

export function computeZoneSuggestions(
  scores: ScoredResult[] | null,
  siteData: SiteData | null,
  existingCategories: Set<ZoneCategory>,
): ZoneSuggestion[] {
  if (!scores) return [];
  const suggestions: ZoneSuggestion[] = [];
  const suggested = new Set<ZoneCategory>();

  for (const mapping of SCORE_TO_ZONE) {
    const score = scores.find((s) => s.label === mapping.scoreName);
    if (!score || score.score < mapping.threshold) continue;
    if (existingCategories.has(mapping.category) || suggested.has(mapping.category)) continue;

    suggestions.push({
      category: mapping.category,
      label: mapping.reason,
      reason: mapping.reason,
      sourceName: mapping.scoreName,
      sourceScore: score.score,
    });
    suggested.add(mapping.category);
  }

  // Tier 3 sun trap suggestion
  if (siteData && !existingCategories.has('food_production') && !suggested.has('food_production')) {
    const micro = getLayerSummary<{ sunTraps?: { areaPct?: number } }>(siteData, 'microclimate');
    if (micro?.sunTraps?.areaPct && micro.sunTraps.areaPct > 30) {
      suggestions.push({
        category: 'food_production',
        label: 'Sun-trap microclimates detected — ideal for intensive production',
        reason: 'Sun-trap microclimates detected — ideal for intensive production',
        sourceName: 'Microclimate (sun traps)',
        sourceScore: micro.sunTraps.areaPct,
      });
    }
  }

  return suggestions;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatAreaShort(m2: number): string {
  if (m2 > 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toFixed(0)} m²`;
}
