/**
 * §11 WelfareAccessAuditCard — per-paddock shade / shelter / water access audit.
 *
 * For every paddock the card computes the polygon centroid and measures
 * great-circle distance to the nearest:
 *   - **shade-providing structure** (animal_shelter / barn / pavilion /
 *     cabin / greenhouse / workshop / lookout)
 *   - **shelter-providing structure** (animal_shelter / barn — the two
 *     types that meaningfully house livestock through weather events)
 *   - **water source** (water utility: water_tank / well_pump /
 *     rain_catchment, or water-relevant structure: water_tank / well /
 *     water_pump_house)
 *
 * Each axis is banded:
 *   - ≤100 m = good (within easy walking distance for most species)
 *   - ≤200 m = fair (reachable but suboptimal — long noon walks)
 *   - >200 m = poor (welfare risk under heat/storm)
 *   - none placed = missing (steward needs to add it)
 *
 * Per-paddock worst-of-three sets the row tone. Summary tally + remediation
 * notes (e.g., "Add an animal_shelter within 100 m of paddock X").
 *
 * Pure presentation-layer derivation — no shared math, no new entities,
 * no map overlays. Closes §11 manifest item `water-shelter-shade-access`
 * (P2 partial → done). Companion to LivestockWelfarePhasingCard (which
 * audits welfare *infrastructure phasing*, not welfare *access*).
 */

import { useMemo } from 'react';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import { useUtilityStore, type Utility, type UtilityType } from '../../store/utilityStore.js';
import s from './WelfareAccessAuditCard.module.css';

interface Props {
  projectId: string;
}

const SHADE_STRUCTURES: ReadonlySet<StructureType> = new Set([
  'animal_shelter',
  'barn',
  'pavilion',
  'cabin',
  'greenhouse',
  'workshop',
  'lookout',
]);

const SHELTER_STRUCTURES: ReadonlySet<StructureType> = new Set([
  'animal_shelter',
  'barn',
]);

const WATER_UTILITIES: ReadonlySet<UtilityType> = new Set([
  'water_tank',
  'well_pump',
  'rain_catchment',
]);

const WATER_STRUCTURES: ReadonlySet<StructureType> = new Set([
  'water_tank',
  'well',
  'water_pump_house',
]);

type Band = 'good' | 'fair' | 'poor' | 'missing';

function bandFor(distanceM: number | null): Band {
  if (distanceM == null) return 'missing';
  if (distanceM <= 100) return 'good';
  if (distanceM <= 200) return 'fair';
  return 'poor';
}

const BAND_RANK: Record<Band, number> = { good: 0, fair: 1, poor: 2, missing: 3 };

function worstBand(...bs: Band[]): Band {
  let worst: Band = 'good';
  for (const b of bs) if (BAND_RANK[b] > BAND_RANK[worst]) worst = b;
  return worst;
}

interface AxisFinding {
  axis: 'shade' | 'shelter' | 'water';
  band: Band;
  distanceM: number | null;
  nearestName: string | null;
}

interface PaddockEval {
  paddock: Paddock;
  shade: AxisFinding;
  shelter: AxisFinding;
  water: AxisFinding;
  worst: Band;
  centroid: { lat: number; lng: number } | null;
}

function polygonCentroid(geom: GeoJSON.Polygon): { lat: number; lng: number } | null {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    if (!pt || pt.length < 2) continue;
    const lng = pt[0];
    const lat = pt[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    sx += lng;
    sy += lat;
    n += 1;
  }
  if (n === 0) return null;
  return { lng: sx / n, lat: sy / n };
}

/** Approx great-circle distance (equirect, fine for small parcels). */
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180) * Math.cos(meanLat);
  return Math.sqrt(dLat * dLat + dLng * dLng) * R;
}

interface NearestResult {
  distanceM: number | null;
  name: string | null;
}

function nearestStructureOfTypes(
  centroid: { lat: number; lng: number },
  structures: Structure[],
  allowed: ReadonlySet<StructureType>,
): NearestResult {
  let best: NearestResult = { distanceM: null, name: null };
  for (const st of structures) {
    if (!allowed.has(st.type)) continue;
    const lng = st.center[0];
    const lat = st.center[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    const d = distanceM(centroid, { lat, lng });
    if (best.distanceM == null || d < best.distanceM) {
      best = { distanceM: d, name: st.name || st.type };
    }
  }
  return best;
}

function nearestUtilityOfTypes(
  centroid: { lat: number; lng: number },
  utilities: Utility[],
  allowed: ReadonlySet<UtilityType>,
): NearestResult {
  let best: NearestResult = { distanceM: null, name: null };
  for (const u of utilities) {
    if (!allowed.has(u.type)) continue;
    const lng = u.center[0];
    const lat = u.center[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    const d = distanceM(centroid, { lat, lng });
    if (best.distanceM == null || d < best.distanceM) {
      best = { distanceM: d, name: u.name || u.type };
    }
  }
  return best;
}

function nearestWaterAny(
  centroid: { lat: number; lng: number },
  utilities: Utility[],
  structures: Structure[],
): NearestResult {
  const u = nearestUtilityOfTypes(centroid, utilities, WATER_UTILITIES);
  const s2 = nearestStructureOfTypes(centroid, structures, WATER_STRUCTURES);
  if (u.distanceM == null) return s2;
  if (s2.distanceM == null) return u;
  return u.distanceM <= s2.distanceM ? u : s2;
}

const BAND_LABEL: Record<Band, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  missing: 'Missing',
};

function fmtDistance(m: number | null): string {
  if (m == null) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function axisDetail(f: AxisFinding, axisLabel: string): string {
  if (f.band === 'missing') {
    return `No ${axisLabel.toLowerCase()} placed within the project — add one to complete the welfare loop.`;
  }
  const dist = fmtDistance(f.distanceM);
  const name = f.nearestName ?? axisLabel;
  if (f.band === 'good') return `${dist} to "${name}" — within easy walking distance.`;
  if (f.band === 'fair') return `${dist} to "${name}" — reachable but a long noon walk; consider a closer placement.`;
  return `${dist} to "${name}" — beyond comfortable distance for most species; welfare risk under heat or storm.`;
}

function remediationFor(p: PaddockEval): string | null {
  const gaps: string[] = [];
  if (p.shade.band === 'missing' || p.shade.band === 'poor') gaps.push('shade structure');
  if (p.shelter.band === 'missing' || p.shelter.band === 'poor') gaps.push('weather shelter');
  if (p.water.band === 'missing' || p.water.band === 'poor') gaps.push('water source');
  if (gaps.length === 0) return null;
  return `Add a ${gaps.join(' / ')} within 100 m of "${p.paddock.name || 'this paddock'}".`;
}

export default function WelfareAccessAuditCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const allStructures = useStructureStore((st) => st.structures);
  const allUtilities = useUtilityStore((st) => st.utilities);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s2) => s2.projectId === projectId),
    [allStructures, projectId],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );

  const evals: PaddockEval[] = useMemo(() => {
    return paddocks.map((paddock): PaddockEval => {
      const centroid = polygonCentroid(paddock.geometry);
      if (!centroid) {
        return {
          paddock,
          shade: { axis: 'shade', band: 'missing', distanceM: null, nearestName: null },
          shelter: { axis: 'shelter', band: 'missing', distanceM: null, nearestName: null },
          water: { axis: 'water', band: 'missing', distanceM: null, nearestName: null },
          worst: 'missing',
          centroid: null,
        };
      }
      const shadeNearest = nearestStructureOfTypes(centroid, structures, SHADE_STRUCTURES);
      const shelterNearest = nearestStructureOfTypes(centroid, structures, SHELTER_STRUCTURES);
      const waterNearest = nearestWaterAny(centroid, utilities, structures);
      const shade: AxisFinding = {
        axis: 'shade',
        band: bandFor(shadeNearest.distanceM),
        distanceM: shadeNearest.distanceM,
        nearestName: shadeNearest.name,
      };
      const shelter: AxisFinding = {
        axis: 'shelter',
        band: bandFor(shelterNearest.distanceM),
        distanceM: shelterNearest.distanceM,
        nearestName: shelterNearest.name,
      };
      const water: AxisFinding = {
        axis: 'water',
        band: bandFor(waterNearest.distanceM),
        distanceM: waterNearest.distanceM,
        nearestName: waterNearest.name,
      };
      return {
        paddock,
        shade,
        shelter,
        water,
        worst: worstBand(shade.band, shelter.band, water.band),
        centroid,
      };
    });
  }, [paddocks, structures, utilities]);

  const summary = useMemo(() => {
    let good = 0;
    let fair = 0;
    let poor = 0;
    let missing = 0;
    for (const e of evals) {
      if (e.worst === 'good') good += 1;
      else if (e.worst === 'fair') fair += 1;
      else if (e.worst === 'poor') poor += 1;
      else missing += 1;
    }
    return { good, fair, poor, missing, total: evals.length };
  }, [evals]);

  if (paddocks.length === 0) {
    return (
      <section className={s.card}>
        <header className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Welfare access audit · shade / shelter / water</h3>
            <p className={s.cardHint}>
              Per-paddock distance check against the three welfare anchors that determine whether a
              herd can comfortably ride out a heat day or a thunderstorm.
            </p>
          </div>
          <span className={s.heuristicBadge}>Heuristic</span>
        </header>
        <p className={s.empty}>
          No paddocks drawn yet — this card activates once you sketch grazing paddocks on the map.
        </p>
      </section>
    );
  }

  const sorted = [...evals].sort((a, b) => BAND_RANK[b.worst] - BAND_RANK[a.worst]);

  return (
    <section className={s.card}>
      <header className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Welfare access audit · shade / shelter / water</h3>
          <p className={s.cardHint}>
            For every paddock the centroid is measured against the nearest <em>shade</em>{' '}
            (animal_shelter / barn / pavilion / cabin / greenhouse / workshop / lookout),{' '}
            <em>shelter</em> (animal_shelter / barn), and <em>water</em> source (water utility or
            water-relevant structure). Bands: ≤100 m = good · ≤200 m = fair · &gt;200 m = poor.
          </p>
        </div>
        <span className={s.heuristicBadge}>Heuristic</span>
      </header>

      <div className={s.summaryRow}>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.total}</span>
          <span className={s.summaryLabel}>Paddocks</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.good}</span>
          <span className={s.summaryLabel}>Good</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.fair}</span>
          <span className={s.summaryLabel}>Fair</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.poor + summary.missing}</span>
          <span className={s.summaryLabel}>Poor / missing</span>
        </div>
      </div>

      <h4 className={s.sectionTitle}>Per-paddock findings</h4>
      <ul className={s.list}>
        {sorted.map((e) => {
          const rowClass = s[`row_${e.worst}`] ?? '';
          const tagClass = s[`tag_${e.worst}`] ?? '';
          const remediation = remediationFor(e);
          return (
            <li key={e.paddock.id} className={`${s.row} ${rowClass}`}>
              <div className={s.rowHead}>
                <span className={`${s.tag} ${tagClass}`}>{BAND_LABEL[e.worst]}</span>
                <span className={s.rowTitle}>{e.paddock.name || 'Paddock'}</span>
                {e.paddock.species.length > 0 && (
                  <span className={s.kindBadge}>{e.paddock.species.join(' · ')}</span>
                )}
              </div>
              <ul className={s.axisList}>
                {(['shade', 'shelter', 'water'] as const).map((axis) => {
                  const f =
                    axis === 'shade' ? e.shade : axis === 'shelter' ? e.shelter : e.water;
                  const axisLabel =
                    axis === 'shade' ? 'Shade' : axis === 'shelter' ? 'Shelter' : 'Water';
                  const aTagClass = s[`tag_${f.band}`] ?? '';
                  return (
                    <li key={axis} className={s.axisRow}>
                      <span className={`${s.axisTag} ${aTagClass}`}>{BAND_LABEL[f.band]}</span>
                      <span className={s.axisLabel}>{axisLabel}:</span>
                      <span className={s.axisDetail}>{axisDetail(f, axisLabel)}</span>
                    </li>
                  );
                })}
              </ul>
              {remediation && <p className={s.remediation}>→ {remediation}</p>}
            </li>
          );
        })}
      </ul>

      <p className={s.footnote}>
        <em>Note:</em> Distances are great-circle from polygon centroids — actual walked distance
        will be longer where fencing or terrain blocks a straight line. Bands are working defaults
        based on common heat-tolerance and rotation literature; cattle and sheep tolerate longer
        walks than goats and pigs. Re-tighten the bands per species if you have working knowledge
        of your herd's behavior.
      </p>
    </section>
  );
}
