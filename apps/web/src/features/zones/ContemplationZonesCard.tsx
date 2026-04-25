/**
 * ContemplationZonesCard — §8 quiet contemplation zone rollup.
 *
 * Closes the §8 spec line "Quiet contemplation zone planning" by
 * surfacing a steward-facing rationale layer on top of the existing
 * zone-drawing mechanics. For each zone tagged for contemplation
 * (category `spiritual` OR keyword match in name / notes / use), the
 * card reports:
 *
 *   - the nearest noise source (animal shelter, barn, workshop, fire
 *     circle, gathering pavilion, generator, well pump) and its
 *     distance;
 *   - the nearest prayer facility (prayer_space structure) and its
 *     distance — supportive presence rather than a noise concern.
 *
 * Three tiles roll the project up: tagged zones · noise sources
 * nearby · prayer facilities nearby. "Nearby" is 100 m measured from
 * the zone centroid to the structure/utility center.
 *
 * Pure presentation: no new shared exports, no new rule logic.
 *
 * Spec: §8 quiet-contemplation-zone-planning (featureManifest).
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import {
  useStructureStore,
  type Structure,
  type StructureType,
} from '../../store/structureStore.js';
import {
  useUtilityStore,
  type Utility,
  type UtilityType,
} from '../../store/utilityStore.js';
import css from '../rules/SitingWarningsCard.module.css';

interface Props {
  projectId: string;
}

/* ── Heuristics ──────────────────────────────────────────────────── */

/** Zone counts as contemplation when its category is spiritual OR its
    name / notes / primary or secondary use mention any of these. */
const CONTEMPLATION_KEYWORDS = [
  'contemplation', 'quiet', 'meditation', 'meditat', 'dhikr', 'khalwa',
  'retreat', 'reflection', 'silence', 'silent', 'prayer', 'salah', 'salat',
];

function isContemplationZone(z: LandZone): boolean {
  if (z.category === 'spiritual') return true;
  const haystack = `${z.name} ${z.notes} ${z.primaryUse} ${z.secondaryUse}`.toLowerCase();
  return CONTEMPLATION_KEYWORDS.some((kw) => haystack.includes(kw));
}

/** Structure types we treat as noise sources for contemplation planning. */
const NOISE_STRUCTURE_TYPES: StructureType[] = [
  'animal_shelter',
  'barn',
  'workshop',
  'fire_circle',
  'pavilion',
  'water_pump_house',
];

/** Utility types we treat as noise sources. */
const NOISE_UTILITY_TYPES: UtilityType[] = [
  'generator',
  'well_pump',
];

/** Structure types that count as supportive prayer facilities. */
const PRAYER_FACILITY_TYPES: StructureType[] = ['prayer_space'];

/** "Nearby" radius in metres — same comfortable-walk distance used by
    SpiritualCommunalCard's adjacency advisory, doubled (100 m) since
    here we're measuring from a zone centroid not a single structure
    center, and contemplation tolerates a wider buffer. */
const NEARBY_RADIUS_M = 100;

function distanceM(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const dy = (lat2 - lat1) * mPerDegLat;
  const dx = (lng2 - lng1) * mPerDegLng;
  return Math.sqrt(dx * dx + dy * dy);
}

interface ZoneAnalysis {
  zone: LandZone;
  centroid: [number, number] | null;
  nearestNoise: { name: string; type: string; distM: number } | null;
  nearestPrayer: { name: string; distM: number } | null;
}

function safeCentroid(z: LandZone): [number, number] | null {
  try {
    const c = turf.centroid(z.geometry as GeoJSON.Geometry).geometry.coordinates;
    const lng = c[0];
    const lat = c[1];
    if (typeof lng === 'number' && typeof lat === 'number') return [lng, lat];
    return null;
  } catch {
    return null;
  }
}

function nearestStructure(
  centroid: [number, number],
  candidates: Structure[],
): { name: string; type: string; distM: number } | null {
  let best: { name: string; type: string; distM: number } | null = null;
  for (const c of candidates) {
    const d = distanceM(centroid, c.center);
    if (!best || d < best.distM) best = { name: c.name, type: c.type, distM: d };
  }
  return best;
}

function nearestUtility(
  centroid: [number, number],
  candidates: Utility[],
): { name: string; type: string; distM: number } | null {
  let best: { name: string; type: string; distM: number } | null = null;
  for (const u of candidates) {
    const d = distanceM(centroid, u.center);
    if (!best || d < best.distM) best = { name: u.name, type: u.type, distM: d };
  }
  return best;
}

const PER_ZONE_LIST_CAP = 5;

export default function ContemplationZonesCard({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId),
    [allZones, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );

  const contemplationZones = useMemo(
    () => zones.filter(isContemplationZone),
    [zones],
  );

  const noiseStructures = useMemo(
    () => structures.filter((s) => NOISE_STRUCTURE_TYPES.includes(s.type)),
    [structures],
  );
  const noiseUtilities = useMemo(
    () => utilities.filter((u) => NOISE_UTILITY_TYPES.includes(u.type)),
    [utilities],
  );
  const prayerFacilities = useMemo(
    () => structures.filter((s) => PRAYER_FACILITY_TYPES.includes(s.type)),
    [structures],
  );

  const analyses = useMemo<ZoneAnalysis[]>(() => {
    return contemplationZones.map((zone) => {
      const centroid = safeCentroid(zone);
      if (!centroid) {
        return { zone, centroid: null, nearestNoise: null, nearestPrayer: null };
      }
      const noiseStruct = nearestStructure(centroid, noiseStructures);
      const noiseUtil = nearestUtility(centroid, noiseUtilities);
      // Combine and pick the closer of the two noise candidates.
      let nearestNoise: ZoneAnalysis['nearestNoise'] = null;
      if (noiseStruct && noiseUtil) {
        nearestNoise = noiseStruct.distM <= noiseUtil.distM ? noiseStruct : noiseUtil;
      } else {
        nearestNoise = noiseStruct ?? noiseUtil;
      }
      const nearestPrayer = nearestStructure(centroid, prayerFacilities);
      return {
        zone,
        centroid,
        nearestNoise,
        nearestPrayer: nearestPrayer
          ? { name: nearestPrayer.name, distM: nearestPrayer.distM }
          : null,
      };
    });
  }, [contemplationZones, noiseStructures, noiseUtilities, prayerFacilities]);

  // Tile counts: how many contemplation zones have a noise source within
  // NEARBY_RADIUS_M, and how many have a prayer facility nearby.
  const zonesWithNoiseNearby = analyses.filter(
    (a) => a.nearestNoise !== null && a.nearestNoise.distM <= NEARBY_RADIUS_M,
  ).length;
  const zonesWithPrayerNearby = analyses.filter(
    (a) => a.nearestPrayer !== null && a.nearestPrayer.distM <= NEARBY_RADIUS_M,
  ).length;

  if (contemplationZones.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Quiet contemplation zones</h2>
          <span className={css.cardHint}>0 tagged</span>
        </div>
        <div className={css.empty}>
          No zone is tagged for contemplation yet. Draw a zone with category
          {' '}<em>Spiritual</em>, or include a keyword like &ldquo;quiet&rdquo;,
          {' '}&ldquo;contemplation&rdquo;, or &ldquo;dhikr&rdquo; in the name
          or notes, and this rollup will surface noise-source and prayer-
          facility proximity.
        </div>
        <div className={css.footnote}>
          Spec ref: §8 quiet contemplation zone planning. Tags are
          surfaced from category and keyword {'\u2014'} descriptive of
          steward intent, not prescriptive.
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Quiet contemplation zones</h2>
        <span className={css.cardHint}>
          {contemplationZones.length} tagged &middot; {zonesWithNoiseNearby} with
          noise within {NEARBY_RADIUS_M} m
        </span>
      </div>

      {/* Tile strip — three program-design rollup metrics */}
      <div className={css.tileGrid}>
        <div className={css.tile}>
          <div className={css.tileHead}>
            <span className={css.tileIcon}>{'\u{1F54B}'}</span>
            <span className={css.tileLabel}>Tagged zones</span>
          </div>
          <span className={css.tileCount}>{contemplationZones.length}</span>
          <span className={css.tileBlurb}>Spiritual category or keyword tag</span>
        </div>

        <div
          className={`${css.tile} ${
            zonesWithNoiseNearby > 0 ? css.tile_warning ?? '' : ''
          }`}
        >
          <div className={css.tileHead}>
            <span className={css.tileIcon}>{'\u{1F50A}'}</span>
            <span className={css.tileLabel}>Noise nearby</span>
          </div>
          <span className={css.tileCount}>{zonesWithNoiseNearby}</span>
          <span className={css.tileBlurb}>
            Animals, workshop, generator, pump within {NEARBY_RADIUS_M} m
          </span>
          {zonesWithNoiseNearby > 0 && (
            <span className={`${css.severityPill} ${css.pill_warning ?? ''}`}>
              Review siting
            </span>
          )}
        </div>

        <div
          className={`${css.tile} ${
            zonesWithPrayerNearby === 0 ? css.tilePending ?? '' : ''
          }`}
        >
          <div className={css.tileHead}>
            <span className={css.tileIcon}>{'\u{1F54C}'}</span>
            <span className={css.tileLabel}>Prayer nearby</span>
          </div>
          <span className={css.tileCount}>{zonesWithPrayerNearby}</span>
          <span className={css.tileBlurb}>
            Prayer space within {NEARBY_RADIUS_M} m of the zone centroid
          </span>
          {zonesWithPrayerNearby === 0 && (
            <span className={css.pendingPill}>None nearby</span>
          )}
        </div>
      </div>

      {/* Per-zone analysis list */}
      <ul className={css.violationList}>
        {analyses.slice(0, PER_ZONE_LIST_CAP).map((a) => {
          const noiseClose =
            a.nearestNoise !== null && a.nearestNoise.distM <= NEARBY_RADIUS_M;
          return (
            <li key={a.zone.id} className={css.violationRow}>
              <span
                className={css.dot}
                style={{ background: a.zone.color, borderColor: a.zone.color }}
              />
              <div className={css.violationBody}>
                <span className={css.violationDim}>
                  {a.zone.category.replace(/_/g, ' ')}
                </span>
                <span className={css.violationTitle}>{a.zone.name}</span>
                <span className={css.violationSuggest}>
                  {a.centroid === null ? (
                    <>invalid zone geometry {'\u2014'} cannot evaluate proximity</>
                  ) : (
                    <>
                      {a.nearestNoise ? (
                        <>
                          nearest noise:{' '}
                          <strong style={{ color: noiseClose ? 'rgba(245, 200, 150, 0.95)' : 'inherit' }}>
                            {a.nearestNoise.name} ({Math.round(a.nearestNoise.distM)} m)
                          </strong>
                        </>
                      ) : (
                        <>no noise sources placed</>
                      )}
                      {' \u00B7 '}
                      {a.nearestPrayer ? (
                        <>
                          nearest prayer: {a.nearestPrayer.name} ({Math.round(a.nearestPrayer.distM)} m)
                        </>
                      ) : (
                        <>no prayer facility placed</>
                      )}
                    </>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {analyses.length > PER_ZONE_LIST_CAP && (
        <div className={css.footnote}>
          {'\u2026'} and {analyses.length - PER_ZONE_LIST_CAP} more zone
          {analyses.length - PER_ZONE_LIST_CAP !== 1 ? 's' : ''}.
        </div>
      )}

      <div className={css.footnote}>
        Spec ref: §8 quiet contemplation zone planning. &ldquo;Nearby&rdquo;
        is {NEARBY_RADIUS_M} m measured planar from the zone centroid to
        the structure or utility center. Noise sources are{' '}
        <em>{NOISE_STRUCTURE_TYPES.length} structure types</em> and{' '}
        <em>{NOISE_UTILITY_TYPES.length} utility types</em> {'\u2014'} a
        proxy for the §5 noise rules, not a replacement.
      </div>
    </div>
  );
}
