/**
 * §6 PrayerZoneReadinessCard — per-spiritual-zone prayer-readiness audit.
 *
 * Distinct from sibling cards on the same Spaces tab:
 *   - QuietZonePlanning evaluates noise from infrastructure / vehicle paths
 *   - ContemplationZonesCard rolls up nearest-noise / nearest-prayer
 *
 * This card answers a different question: for each zone the steward has
 * tagged spiritual, is it actually *ready* to serve as a place of prayer?
 * Five checks per zone, scored independently:
 *
 *   1. Prayer space — a placed prayer_space structure inside or within
 *      walking distance (≤ NEARBY_M) of the zone centroid
 *   2. Wudu water — a well, water tank, well pump, or rain catchment
 *      within short walking distance (≤ WUDU_WALK_M) for ablution
 *   3. Livestock buffer — no animal paddock inside the spiritual purity
 *      buffer per SETBACK_RULES.livestock_spiritual (50 m)
 *   4. Vehicle / loud infrastructure buffer — no road or generator
 *      within LOUD_BUFFER_M of the zone centroid
 *   5. Vision alignment — project type marks prayer as a first-class
 *      program element (moontrance / retreat / educational farm /
 *      explicit "prayer" or "spiritual" mention in vision text)
 *
 * Each zone earns a readiness band (Ready / Workable / Needs work). The
 * card aggregates a project-level band so the steward can see at a glance
 * whether the prayer programme is grounded.
 *
 * Pure presentation: no shared-package math, no new entity types, no
 * map overlays. Reads existing zoneStore, structureStore, utilityStore,
 * pathStore, visionStore, plus SETBACK_RULES and computeQibla.
 *
 * Spec: §6 prayer-spiritual-zone-planning (featureManifest line 238).
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
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
import { usePathStore } from '../../store/pathStore.js';
import { useVisionStore } from '../../store/visionStore.js';
import { SETBACK_RULES } from '../rules/SitingRules.js';
import { computeQibla, bearingToCardinal } from '../../lib/qibla.js';
import css from './PrayerZoneReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

/* ── Tunables ────────────────────────────────────────────────────── */

/** Walking distance to a prayer space — comfortable indoor-shoes walk. */
const NEARBY_M = 60;
/** Walking distance to wudu water — tighter (ablution before prayer). */
const WUDU_WALK_M = 35;
/** Loud-infrastructure setback — generators and vehicle roads. */
const LOUD_BUFFER_M = 30;
/** Spiritual-purity buffer from animals — pulled from SETBACK_RULES. */
const LIVESTOCK_BUFFER_M = SETBACK_RULES.livestock_spiritual;

const PRAYER_FACILITY_TYPES: StructureType[] = ['prayer_space'];
const LIVESTOCK_STRUCTURE_TYPES: StructureType[] = ['animal_shelter', 'barn'];
const WUDU_WATER_STRUCTURE_TYPES: StructureType[] = ['well', 'water_tank', 'water_pump_house'];
const WUDU_WATER_UTILITY_TYPES: UtilityType[] = ['well_pump', 'water_tank', 'rain_catchment'];
const LOUD_UTILITY_TYPES: UtilityType[] = ['generator'];
const VEHICLE_PATH_TYPES = ['main_road', 'secondary_road', 'service_road'] as const;

const PRAYER_VISION_KEYWORDS = ['prayer', 'salah', 'salat', 'spiritual', 'masjid', 'mosque', 'dhikr'];
const PRAYER_PROJECT_TYPES = ['moontrance', 'retreat_center', 'educational_farm', 'spiritual_retreat'];

const PER_ZONE_LIST_CAP = 6;

/* ── Helpers ─────────────────────────────────────────────────────── */

function distanceM(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const dy = (lat2 - lat1) * mPerDegLat;
  const dx = (lng2 - lng1) * mPerDegLng;
  return Math.sqrt(dx * dx + dy * dy);
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

function pointInZone(point: [number, number], z: LandZone): boolean {
  try {
    return turf.booleanPointInPolygon(turf.point(point), z.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon);
  } catch {
    return false;
  }
}

function nearestStructureDist(centroid: [number, number], list: Structure[]): { name: string; distM: number } | null {
  let best: { name: string; distM: number } | null = null;
  for (const s of list) {
    const d = distanceM(centroid, s.center);
    if (!best || d < best.distM) best = { name: s.name, distM: d };
  }
  return best;
}

function nearestUtilityDist(centroid: [number, number], list: Utility[]): { name: string; distM: number } | null {
  let best: { name: string; distM: number } | null = null;
  for (const u of list) {
    const d = distanceM(centroid, u.center);
    if (!best || d < best.distM) best = { name: u.name, distM: d };
  }
  return best;
}

interface PathLike {
  type: string;
  geometry: GeoJSON.Geometry;
}

function nearestPathDistM(centroid: [number, number], paths: PathLike[]): number | null {
  let best: number | null = null;
  for (const p of paths) {
    try {
      const dKm = turf.pointToLineDistance(turf.point(centroid), p.geometry as GeoJSON.LineString, { units: 'kilometers' });
      const dM = dKm * 1000;
      if (best === null || dM < best) best = dM;
    } catch {
      // skip malformed path
    }
  }
  return best;
}

/* ── Per-zone readiness model ────────────────────────────────────── */

type CheckStatus = 'pass' | 'warn' | 'fail' | 'na';

interface ZoneCheck {
  key: 'prayer' | 'wudu' | 'livestock' | 'loud' | 'vision';
  label: string;
  status: CheckStatus;
  detail: string;
}

interface ZoneReadiness {
  zone: LandZone;
  centroid: [number, number] | null;
  checks: ZoneCheck[];
  band: 'ready' | 'workable' | 'needs_work';
}

function bandFromChecks(checks: ZoneCheck[]): ZoneReadiness['band'] {
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  if (failCount === 0 && warnCount === 0) return 'ready';
  if (failCount <= 1 && warnCount <= 2) return 'workable';
  return 'needs_work';
}

const BAND_CFG: Record<ZoneReadiness['band'], { label: string; cls: string }> = {
  ready: { label: 'Ready', cls: css.bandReady ?? '' },
  workable: { label: 'Workable', cls: css.bandWorkable ?? '' },
  needs_work: { label: 'Needs work', cls: css.bandNeedsWork ?? '' },
};

const STATUS_CFG: Record<CheckStatus, { dot: string; cls: string }> = {
  pass: { dot: '\u25CF', cls: css.statusPass ?? '' },
  warn: { dot: '\u25CF', cls: css.statusWarn ?? '' },
  fail: { dot: '\u25CF', cls: css.statusFail ?? '' },
  na:   { dot: '\u25CB', cls: css.statusNa ?? '' },
};

/* ── Component ───────────────────────────────────────────────────── */

export default function PrayerZoneReadinessCard({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaths = usePathStore((s) => s.paths);
  const visionData = useVisionStore((s) => s.getVisionData(project.id));

  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === project.id), [allStructures, project.id]);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === project.id), [allUtilities, project.id]);
  const paths = useMemo(() => allPaths.filter((p) => p.projectId === project.id), [allPaths, project.id]);

  const spiritualZones = useMemo(() => zones.filter((z) => z.category === 'spiritual'), [zones]);

  // Project center for qibla — average of spiritual zone centroids (fallback: any zone centroid).
  const projectCenter = useMemo<[number, number] | null>(() => {
    const pool = spiritualZones.length > 0 ? spiritualZones : zones;
    if (pool.length === 0) return null;
    let sumLng = 0, sumLat = 0, n = 0;
    for (const z of pool) {
      const c = safeCentroid(z);
      if (c) { sumLng += c[0]; sumLat += c[1]; n++; }
    }
    if (n === 0) return null;
    return [sumLng / n, sumLat / n];
  }, [spiritualZones, zones]);

  const qibla = useMemo(
    () => projectCenter ? computeQibla(projectCenter[1], projectCenter[0]) : null,
    [projectCenter],
  );

  const prayerSpaces = useMemo(
    () => structures.filter((s) => PRAYER_FACILITY_TYPES.includes(s.type)),
    [structures],
  );
  const livestockStructures = useMemo(
    () => structures.filter((s) => LIVESTOCK_STRUCTURE_TYPES.includes(s.type)),
    [structures],
  );
  const wuduWaterStructures = useMemo(
    () => structures.filter((s) => WUDU_WATER_STRUCTURE_TYPES.includes(s.type)),
    [structures],
  );
  const wuduWaterUtilities = useMemo(
    () => utilities.filter((u) => WUDU_WATER_UTILITY_TYPES.includes(u.type)),
    [utilities],
  );
  const loudUtilities = useMemo(
    () => utilities.filter((u) => LOUD_UTILITY_TYPES.includes(u.type)),
    [utilities],
  );
  const vehiclePaths = useMemo(
    () => paths.filter((p) => (VEHICLE_PATH_TYPES as readonly string[]).includes(p.type)),
    [paths],
  );

  // Vision alignment is a project-level signal, computed once.
  const visionAlignment = useMemo(() => {
    const projectType = (project.projectType ?? '').toLowerCase();
    if (PRAYER_PROJECT_TYPES.includes(projectType)) {
      return { aligned: true, why: `project type "${projectType}" is prayer-forward` };
    }
    const mt = visionData?.moontranceIdentity;
    const mtText = mt ? `${mt.prayerPavilionIntent} ${mt.quietZoneDesignation} ${mt.waterLandWorshipIntegration}` : '';
    const haystack = `${project.visionStatement ?? ''} ${project.description ?? ''} ${mtText}`.toLowerCase();
    const hit = PRAYER_VISION_KEYWORDS.find((kw) => haystack.includes(kw));
    if (hit) return { aligned: true, why: `vision text mentions "${hit}"` };
    return { aligned: false, why: 'no prayer keyword in vision and project type is not prayer-forward' };
  }, [project, visionData]);

  const readiness = useMemo<ZoneReadiness[]>(() => {
    return spiritualZones.map((zone) => {
      const centroid = safeCentroid(zone);
      const checks: ZoneCheck[] = [];

      // 1. Prayer space
      if (!centroid) {
        checks.push({ key: 'prayer', label: 'Prayer space', status: 'na', detail: 'invalid zone geometry' });
      } else {
        const inside = prayerSpaces.find((s) => pointInZone(s.center, zone));
        if (inside) {
          checks.push({ key: 'prayer', label: 'Prayer space', status: 'pass', detail: `${inside.name} inside zone` });
        } else {
          const near = nearestStructureDist(centroid, prayerSpaces);
          if (near && near.distM <= NEARBY_M) {
            checks.push({ key: 'prayer', label: 'Prayer space', status: 'pass', detail: `${near.name} ${Math.round(near.distM)} m away` });
          } else if (near) {
            checks.push({ key: 'prayer', label: 'Prayer space', status: 'warn', detail: `nearest is ${near.name} (${Math.round(near.distM)} m, > ${NEARBY_M} m walk)` });
          } else {
            checks.push({ key: 'prayer', label: 'Prayer space', status: 'fail', detail: 'no prayer_space placed on the project' });
          }
        }
      }

      // 2. Wudu water
      if (!centroid) {
        checks.push({ key: 'wudu', label: 'Wudu water', status: 'na', detail: 'invalid zone geometry' });
      } else {
        const nearStruct = nearestStructureDist(centroid, wuduWaterStructures);
        const nearUtil = nearestUtilityDist(centroid, wuduWaterUtilities);
        const candidates = [nearStruct, nearUtil].filter((x): x is { name: string; distM: number } => x !== null);
        if (candidates.length === 0) {
          checks.push({ key: 'wudu', label: 'Wudu water', status: 'fail', detail: 'no well, tank, pump, or catchment placed' });
        } else {
          const best = candidates.reduce((acc, c) => (c.distM < acc.distM ? c : acc));
          if (best.distM <= WUDU_WALK_M) {
            checks.push({ key: 'wudu', label: 'Wudu water', status: 'pass', detail: `${best.name} ${Math.round(best.distM)} m away` });
          } else {
            checks.push({ key: 'wudu', label: 'Wudu water', status: 'warn', detail: `nearest water is ${best.name} (${Math.round(best.distM)} m, > ${WUDU_WALK_M} m)` });
          }
        }
      }

      // 3. Livestock buffer (purity)
      if (!centroid) {
        checks.push({ key: 'livestock', label: 'Livestock buffer', status: 'na', detail: 'invalid zone geometry' });
      } else {
        const near = nearestStructureDist(centroid, livestockStructures);
        if (!near) {
          checks.push({ key: 'livestock', label: 'Livestock buffer', status: 'pass', detail: 'no livestock structures on project' });
        } else if (near.distM >= LIVESTOCK_BUFFER_M) {
          checks.push({ key: 'livestock', label: 'Livestock buffer', status: 'pass', detail: `${near.name} ${Math.round(near.distM)} m clear (≥ ${LIVESTOCK_BUFFER_M} m)` });
        } else {
          checks.push({ key: 'livestock', label: 'Livestock buffer', status: 'fail', detail: `${near.name} only ${Math.round(near.distM)} m (< ${LIVESTOCK_BUFFER_M} m purity buffer)` });
        }
      }

      // 4. Loud infrastructure / vehicle paths
      if (!centroid) {
        checks.push({ key: 'loud', label: 'Loud-infra buffer', status: 'na', detail: 'invalid zone geometry' });
      } else {
        const nearGen = nearestUtilityDist(centroid, loudUtilities);
        const nearRoadM = nearestPathDistM(centroid, vehiclePaths as PathLike[]);
        const candidates: { label: string; distM: number }[] = [];
        if (nearGen) candidates.push({ label: nearGen.name, distM: nearGen.distM });
        if (nearRoadM !== null) candidates.push({ label: 'vehicle road', distM: nearRoadM });
        if (candidates.length === 0) {
          checks.push({ key: 'loud', label: 'Loud-infra buffer', status: 'pass', detail: 'no generators or roads near zone' });
        } else {
          const best = candidates.reduce((acc, c) => (c.distM < acc.distM ? c : acc));
          if (best.distM >= LOUD_BUFFER_M) {
            checks.push({ key: 'loud', label: 'Loud-infra buffer', status: 'pass', detail: `${best.label} ${Math.round(best.distM)} m clear (≥ ${LOUD_BUFFER_M} m)` });
          } else {
            checks.push({ key: 'loud', label: 'Loud-infra buffer', status: 'warn', detail: `${best.label} only ${Math.round(best.distM)} m (< ${LOUD_BUFFER_M} m)` });
          }
        }
      }

      // 5. Vision alignment (project-level)
      checks.push({
        key: 'vision',
        label: 'Vision alignment',
        status: visionAlignment.aligned ? 'pass' : 'warn',
        detail: visionAlignment.why,
      });

      const band = bandFromChecks(checks);
      return { zone, centroid, checks, band };
    });
  }, [spiritualZones, prayerSpaces, livestockStructures, wuduWaterStructures, wuduWaterUtilities, loudUtilities, vehiclePaths, visionAlignment]);

  // Aggregate band: worst case across zones (ready unless any zone is needs_work / workable).
  const aggregateBand: ZoneReadiness['band'] = useMemo(() => {
    if (readiness.some((r) => r.band === 'needs_work')) return 'needs_work';
    if (readiness.some((r) => r.band === 'workable')) return 'workable';
    return 'ready';
  }, [readiness]);

  if (spiritualZones.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>
              Prayer-zone readiness
              <span className={css.badge}>HEURISTIC</span>
            </h3>
            <p className={css.cardHint}>
              No spiritual zones drawn yet. Tag a zone with category <em>Spiritual</em>
              {' '}and this card will audit prayer-space presence, wudu-water reach,
              {' '}livestock purity buffer ({LIVESTOCK_BUFFER_M} m), loud-infrastructure
              {' '}distance, and vision alignment.
            </p>
          </div>
        </div>
        <p className={css.footnote}>
          Spec ref: §6 prayer-spiritual-zone-planning. Distances are planar approximations
          {' \u2014 '}intended for early planning, not surveyed buffers.
        </p>
      </div>
    );
  }

  const aggCfg = BAND_CFG[aggregateBand];
  const visibleZones = readiness.slice(0, PER_ZONE_LIST_CAP);
  const hiddenCount = readiness.length - visibleZones.length;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Prayer-zone readiness
            <span className={css.badge}>HEURISTIC</span>
          </h3>
          <p className={css.cardHint}>
            Each spiritual zone audited against five readiness checks: prayer space,
            wudu water, livestock buffer, loud-infrastructure buffer, and vision
            alignment.
          </p>
        </div>
        <div className={`${css.bandPill} ${aggCfg.cls}`}>
          <span className={css.bandLabel}>{aggCfg.label}</span>
          <span className={css.bandCount}>{readiness.length} zone{readiness.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {qibla && (
        <div className={css.qiblaBar}>
          <span className={css.qiblaLabel}>Project qibla</span>
          <span className={css.qiblaValue}>
            {Math.round(qibla.bearing)}° {bearingToCardinal(qibla.bearing)}
          </span>
          <span className={css.qiblaDim}>
            from project centroid ({projectCenter ? `${projectCenter[1].toFixed(3)}, ${projectCenter[0].toFixed(3)}` : '—'})
          </span>
        </div>
      )}

      <ul className={css.zoneList}>
        {visibleZones.map((r) => {
          const cfg = BAND_CFG[r.band];
          return (
            <li key={r.zone.id} className={css.zoneRow}>
              <div className={css.zoneHead}>
                <span
                  className={css.zoneSwatch}
                  style={{ background: r.zone.color, borderColor: r.zone.color }}
                />
                <span className={css.zoneName}>{r.zone.name}</span>
                <span className={`${css.zoneBand} ${cfg.cls}`}>{cfg.label}</span>
              </div>
              <ul className={css.checkList}>
                {r.checks.map((c) => {
                  const sCfg = STATUS_CFG[c.status];
                  return (
                    <li key={c.key} className={css.checkRow}>
                      <span className={`${css.statusDot} ${sCfg.cls}`}>{sCfg.dot}</span>
                      <span className={css.checkLabel}>{c.label}</span>
                      <span className={css.checkDetail}>{c.detail}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <p className={css.footnote}>
          {'\u2026'} and {hiddenCount} more spiritual zone{hiddenCount !== 1 ? 's' : ''}.
        </p>
      )}

      <p className={css.footnote}>
        Spec ref: §6 prayer-spiritual-zone-planning. Walk distances:
        {' '}<em>{NEARBY_M} m</em> to a prayer space, <em>{WUDU_WALK_M} m</em> to wudu water.
        {' '}Buffers: <em>{LIVESTOCK_BUFFER_M} m</em> from livestock per
        {' '}<em>SETBACK_RULES.livestock_spiritual</em>, <em>{LOUD_BUFFER_M} m</em> from
        {' '}generators / vehicle roads. Distances are planar.
      </p>
    </div>
  );
}
