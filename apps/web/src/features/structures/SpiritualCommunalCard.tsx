/**
 * SpiritualCommunalCard — §9 prayer / bathhouse / classroom rollup.
 *
 * Closes the §9 spec line "Prayer space, bathhouse, classroom placement"
 * by surfacing rationale alongside the bare placement mechanics. For each
 * placed instance the card shows:
 *
 *   - Prayer Space  — qiblah bearing for the project, rotation delta
 *                     (so the steward sees how close the long axis is
 *                     to facing Mecca), capacity hint (worshippers).
 *   - Bathhouse     — wudu-station capacity hint, water/septic coverage,
 *                     adjacency-to-prayer-space recommendation.
 *   - Classroom     — seated-capacity hint, infrastructure coverage.
 *
 * Pure presentation: reads structureStore + utilityStore, derives
 * qiblah bearing from the project parcel centroid using the existing
 * computeQibla helper. No new shared exports.
 *
 * Spec: §9 prayer-bathhouse-classroom-placement (featureManifest).
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useStructureStore,
  type Structure,
  type StructureType,
} from '../../store/structureStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { computeQibla, bearingToCardinal } from '../../lib/qibla.js';
import css from '../rules/SitingWarningsCard.module.css';

interface Props {
  project: LocalProject;
}

type FacilityType = Extract<StructureType, 'prayer_space' | 'bathhouse' | 'classroom'>;

interface FacilityConfig {
  type: FacilityType;
  label: string;
  icon: string;
  blurb: string;
  /** m² of floor area per occupant (rough planning heuristic). */
  m2PerPerson: number;
  occupantNoun: string;
}

const FACILITIES: FacilityConfig[] = [
  {
    type: 'prayer_space',
    label: 'Prayer space',
    icon: '\u{1F54C}',
    blurb: 'Salah, dhikr, and gathering for jumuah',
    m2PerPerson: 1.0,
    occupantNoun: 'worshippers',
  },
  {
    type: 'bathhouse',
    label: 'Bathhouse',
    icon: '\u{1F6BF}',
    blurb: 'Wudu stations and bathing facility',
    m2PerPerson: 2.0,
    occupantNoun: 'wudu stations',
  },
  {
    type: 'classroom',
    label: 'Classroom',
    icon: '\u{1F4DA}',
    blurb: 'Educational space and community hall',
    m2PerPerson: 1.5,
    occupantNoun: 'seats',
  },
];

/** Which utilities cover which infrastructure requirement key. */
const UTILITY_PROVIDES: Partial<Record<UtilityType, 'water' | 'power' | 'septic'>> = {
  water_tank: 'water',
  well_pump: 'water',
  rain_catchment: 'water',
  solar_panel: 'power',
  battery_room: 'power',
  generator: 'power',
  septic: 'septic',
  greywater: 'septic',
};

/** Planar-meter distance between two [lng, lat] points (good for ~km scale). */
function distanceM(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const dy = (lat2 - lat1) * mPerDegLat;
  const dx = (lng2 - lng1) * mPerDegLng;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Smallest signed angular delta in [-180, 180] between rotation and qiblah
 * bearing, then absolute degrees [0, 180]. The structure's long axis is
 * implicit: a 0° rotation has the width edge facing east. Without per-type
 * "primary axis" metadata, we treat rotation directly as bearing — close
 * enough for a steward-facing hint, not a survey-grade alignment.
 */
function qiblahDeltaDeg(rotationDeg: number, qiblahBearing: number): number {
  const raw = ((rotationDeg - qiblahBearing) % 360 + 540) % 360 - 180;
  return Math.abs(raw);
}

interface FacilityRollup {
  config: FacilityConfig;
  instances: Structure[];
}

export default function SpiritualCommunalCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const projectStructures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );

  const placedInfra = useMemo(() => {
    const present = new Set<'water' | 'power' | 'septic'>();
    for (const u of allUtilities) {
      if (u.projectId !== project.id) continue;
      const key = UTILITY_PROVIDES[u.type];
      if (key) present.add(key);
    }
    return present;
  }, [allUtilities, project.id]);

  const qiblah = useMemo(() => {
    if (!project.parcelBoundaryGeojson) return null;
    try {
      const c = turf.centroid(project.parcelBoundaryGeojson).geometry.coordinates;
      const lng = c[0];
      const lat = c[1];
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      return computeQibla(lat, lng);
    } catch {
      return null;
    }
  }, [project.parcelBoundaryGeojson]);

  const rollups = useMemo<FacilityRollup[]>(() => {
    return FACILITIES.map((config) => ({
      config,
      instances: projectStructures.filter((s) => s.type === config.type),
    }));
  }, [projectStructures]);

  const totalPlaced = rollups.reduce((acc, r) => acc + r.instances.length, 0);

  const prayerSpaces = rollups.find((r) => r.config.type === 'prayer_space')?.instances ?? [];
  const bathhouses = rollups.find((r) => r.config.type === 'bathhouse')?.instances ?? [];

  /* Adjacency advisory: for each prayer space, find the nearest bathhouse.
     50 m is a comfortable wudu-walk; beyond that flag a hint. */
  const ADJACENCY_THRESHOLD_M = 50;
  const prayerWithoutNearbyBathhouse = prayerSpaces.filter((p) => {
    if (bathhouses.length === 0) return true;
    const nearest = bathhouses.reduce<number>((min, b) => {
      const d = distanceM(p.center, b.center);
      return d < min ? d : min;
    }, Infinity);
    return nearest > ADJACENCY_THRESHOLD_M;
  });

  if (totalPlaced === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Spiritual &amp; communal facilities</h2>
          <span className={css.cardHint}>0 placed</span>
        </div>
        <div className={css.empty}>
          No prayer space, bathhouse, or classroom placed yet. Place from
          the structures tool {'\u2014'} this rollup will surface qiblah
          bearing, capacity hints, and adjacency recommendations.
        </div>
        {qiblah && (
          <div className={css.footnote}>
            Project qiblah bearing: <em>{qiblah.bearing.toFixed(1)}{'\u00B0'}{' '}
            {bearingToCardinal(qiblah.bearing)}</em> &middot; {Math.round(qiblah.distanceKm).toLocaleString()} km to Mecca.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Spiritual &amp; communal facilities</h2>
        <span className={css.cardHint}>
          {totalPlaced} placed
          {qiblah && (
            <>
              {' '}&middot; qiblah {qiblah.bearing.toFixed(0)}{'\u00B0'}{' '}
              {bearingToCardinal(qiblah.bearing)}
            </>
          )}
        </span>
      </div>

      {/* Tile strip — one cell per facility type */}
      <div className={css.tileGrid}>
        {rollups.map(({ config, instances }) => {
          const pending = instances.length === 0;
          return (
            <div
              key={config.type}
              className={`${css.tile} ${pending ? css.tilePending ?? '' : ''}`}
            >
              <div className={css.tileHead}>
                <span className={css.tileIcon}>{config.icon}</span>
                <span className={css.tileLabel}>{config.label}</span>
              </div>
              <span className={css.tileCount}>{instances.length}</span>
              <span className={css.tileBlurb}>{config.blurb}</span>
              {pending && <span className={css.pendingPill}>Not yet placed</span>}
            </div>
          );
        })}
      </div>

      {/* Per-instance list */}
      {totalPlaced > 0 && (
        <ul className={css.violationList}>
          {rollups.flatMap(({ config, instances }) =>
            instances.map((s) => {
              const stories = s.storiesCount ?? 1;
              const floorM2 = s.widthM * s.depthM * stories;
              const occupants = Math.floor(floorM2 / config.m2PerPerson);
              const reqs = (['water', 'power', 'septic'] as const).filter((r) =>
                ['cabin', 'bathhouse', 'classroom', 'prayer_space'].includes(s.type)
                  ? // pull req keys from the existing infrastructureReqs list
                    s.infrastructureReqs.includes(r)
                  : false,
              );
              const missing = reqs.filter((r) => !placedInfra.has(r));
              return (
                <li key={`${config.type}-${s.id}`} className={css.violationRow}>
                  <span className={css.dot} style={{ background: 'rgba(196,162,101,0.85)' }} />
                  <div className={css.violationBody}>
                    <span className={css.violationDim}>{config.label}</span>
                    <span className={css.violationTitle}>
                      {s.name}
                      <span className={css.violationOn}>
                        {' '}{'\u00B7'} {s.widthM}{'\u00D7'}{s.depthM}m
                        {stories > 1 ? `\u00D7${stories}` : ''} = ~{occupants} {config.occupantNoun}
                      </span>
                    </span>
                    <span className={css.violationSuggest}>
                      {config.type === 'prayer_space' && qiblah && (
                        <>
                          rotation {s.rotationDeg}{'\u00B0'} {'\u00B7'} qiblah delta{' '}
                          {qiblahDeltaDeg(s.rotationDeg, qiblah.bearing).toFixed(0)}{'\u00B0'}
                          {' '}{'\u00B7'}{' '}
                        </>
                      )}
                      {missing.length === 0
                        ? `infrastructure ready (${reqs.join(', ') || 'none'})`
                        : `missing: ${missing.join(', ')}`}
                    </span>
                  </div>
                </li>
              );
            }),
          )}
        </ul>
      )}

      {/* Adjacency advisory */}
      {prayerWithoutNearbyBathhouse.length > 0 && (
        <div className={css.empty}>
          {prayerWithoutNearbyBathhouse.length} prayer space
          {prayerWithoutNearbyBathhouse.length !== 1 ? 's have' : ' has'} no
          bathhouse within {ADJACENCY_THRESHOLD_M} m for wudu. Consider
          siting one nearby to support pre-prayer ablution.
        </div>
      )}

      <div className={css.footnote}>
        Spec ref: §9 prayer / bathhouse / classroom placement. Qiblah bearing
        is computed from the parcel centroid; the rotation delta treats
        structure rotation directly as the long-axis bearing {'\u2014'}{' '}
        a steward-facing hint, not a survey-grade alignment. Capacity hints
        use {FACILITIES.map((f) => `${f.m2PerPerson} m\u00B2/${f.occupantNoun.replace(/s$/, '')}`).join(', ')}.
      </div>
    </div>
  );
}
