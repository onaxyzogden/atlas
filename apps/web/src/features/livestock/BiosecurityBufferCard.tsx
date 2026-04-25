/**
 * §11 BiosecurityBufferCard — heuristic disease/biosecurity setback audit.
 *
 * For each livestock structure (barn, animal_shelter), evaluates four
 * standard rural setbacks against the existing structure layout:
 *
 *   - Livestock-to-livestock  ≥ 30 m  (cross-species disease spread)
 *   - Livestock-to-water      ≥ 30 m  (manure runoff into wells/tanks)
 *   - Livestock-to-human      ≥ 50 m  (zoonotic + odor buffer)
 *   - Livestock-to-boundary   ≥ 15 m  (neighbor relations)
 *
 * Surfaces violations grouped by livestock structure, plus an "isolation
 * pad candidate" that ranks the most-buffered livestock structure as the
 * preferred location for sick-animal quarantine.
 *
 * Heuristic only — flat-earth distance from structure center, no fence
 * geometry, no airflow modeling. Standards reflect common North American
 * extension-service guidance (NRCS, Penn State Extension) and should be
 * cross-checked against local ordinance before construction.
 */
import { useMemo } from 'react';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import css from './BiosecurityBufferCard.module.css';

const LIVESTOCK_TYPES: ReadonlySet<StructureType> = new Set(['barn', 'animal_shelter']);
const WATER_TYPES: ReadonlySet<StructureType> = new Set(['well', 'water_tank', 'water_pump_house']);
const HUMAN_TYPES: ReadonlySet<StructureType> = new Set([
  'cabin', 'yurt', 'pavilion', 'prayer_space', 'bathhouse', 'classroom', 'tent_glamping', 'fire_circle',
]);

const SETBACK_LIVESTOCK_M = 30;
const SETBACK_WATER_M = 30;
const SETBACK_HUMAN_M = 50;
const SETBACK_BOUNDARY_M = 15;

interface Props {
  projectId: string;
  parcelBoundaryGeojson?: GeoJSON.FeatureCollection | null;
}

interface Violation {
  rule: 'livestock' | 'water' | 'human' | 'boundary';
  targetName: string;
  targetType: string;
  distanceM: number;
  requiredM: number;
}

interface LivestockReport {
  structure: Structure;
  violations: Violation[];
  minBuffer: number; // smallest distance to any non-self structure (proxy for isolation potential)
  buffersByCategory: { livestock: number; water: number; human: number; boundary: number };
}

function flatEarthMeters(a: [number, number], b: [number, number]): number {
  // [lng, lat] inputs. Equirectangular approximation — accurate within < 0.5%
  // for the planning-grade distances we audit here (typically < 500 m).
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const meanLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dx = (lng2 - lng1) * 111320 * Math.cos(meanLat);
  const dy = (lat2 - lat1) * 110540;
  return Math.hypot(dx, dy);
}

function distanceToBoundaryM(center: [number, number], boundary: GeoJSON.FeatureCollection | null | undefined): number | null {
  if (!boundary || !boundary.features || boundary.features.length === 0) return null;
  let minDist = Number.POSITIVE_INFINITY;
  for (const feat of boundary.features) {
    const geom = feat.geometry;
    if (!geom) continue;
    const rings: GeoJSON.Position[][] = [];
    if (geom.type === 'Polygon') rings.push(...geom.coordinates);
    else if (geom.type === 'MultiPolygon') for (const poly of geom.coordinates) rings.push(...poly);
    else continue;
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const p1 = ring[i];
        const p2 = ring[i + 1];
        if (!p1 || !p2 || p1.length < 2 || p2.length < 2) continue;
        const d = pointToSegmentMeters(center, [p1[0]!, p1[1]!], [p2[0]!, p2[1]!]);
        if (d < minDist) minDist = d;
      }
    }
  }
  return Number.isFinite(minDist) ? minDist : null;
}

function pointToSegmentMeters(p: [number, number], a: [number, number], b: [number, number]): number {
  // Project p onto segment ab in flat-earth metres, return distance.
  const meanLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const mPerDegLng = 111320 * Math.cos(meanLat);
  const mPerDegLat = 110540;
  const ax = a[0] * mPerDegLng;
  const ay = a[1] * mPerDegLat;
  const bx = b[0] * mPerDegLng;
  const by = b[1] * mPerDegLat;
  const px = p[0] * mPerDegLng;
  const py = p[1] * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const TYPE_LABEL: Record<string, string> = {
  barn: 'Barn',
  animal_shelter: 'Animal shelter',
  well: 'Well',
  water_tank: 'Water tank',
  water_pump_house: 'Pump house',
  cabin: 'Cabin',
  yurt: 'Yurt',
  pavilion: 'Pavilion',
  prayer_space: 'Prayer space',
  bathhouse: 'Bathhouse',
  classroom: 'Classroom',
  tent_glamping: 'Glamping tent',
  fire_circle: 'Fire circle',
};

function labelFor(t: string): string {
  return TYPE_LABEL[t] ?? t.replace(/_/g, ' ');
}

function fmtM(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(0)} m`;
}

export default function BiosecurityBufferCard({ projectId, parcelBoundaryGeojson }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const projectStructures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );

  const reports = useMemo<LivestockReport[]>(() => {
    const livestock = projectStructures.filter((s) => LIVESTOCK_TYPES.has(s.type));
    if (livestock.length === 0) return [];
    return livestock.map((self) => {
      const violations: Violation[] = [];
      let minLivestock = Number.POSITIVE_INFINITY;
      let minWater = Number.POSITIVE_INFINITY;
      let minHuman = Number.POSITIVE_INFINITY;
      let minBoundary = Number.POSITIVE_INFINITY;

      for (const other of projectStructures) {
        if (other.id === self.id) continue;
        const d = flatEarthMeters(self.center, other.center);
        if (LIVESTOCK_TYPES.has(other.type)) {
          if (d < minLivestock) minLivestock = d;
          if (d < SETBACK_LIVESTOCK_M) {
            violations.push({ rule: 'livestock', targetName: other.name, targetType: other.type, distanceM: d, requiredM: SETBACK_LIVESTOCK_M });
          }
        } else if (WATER_TYPES.has(other.type)) {
          if (d < minWater) minWater = d;
          if (d < SETBACK_WATER_M) {
            violations.push({ rule: 'water', targetName: other.name, targetType: other.type, distanceM: d, requiredM: SETBACK_WATER_M });
          }
        } else if (HUMAN_TYPES.has(other.type)) {
          if (d < minHuman) minHuman = d;
          if (d < SETBACK_HUMAN_M) {
            violations.push({ rule: 'human', targetName: other.name, targetType: other.type, distanceM: d, requiredM: SETBACK_HUMAN_M });
          }
        }
      }

      const boundaryDist = distanceToBoundaryM(self.center, parcelBoundaryGeojson ?? null);
      if (boundaryDist != null) {
        minBoundary = boundaryDist;
        if (boundaryDist < SETBACK_BOUNDARY_M) {
          violations.push({ rule: 'boundary', targetName: 'parcel boundary', targetType: 'boundary', distanceM: boundaryDist, requiredM: SETBACK_BOUNDARY_M });
        }
      }

      const candidates = [minLivestock, minWater, minHuman, minBoundary].filter((d) => Number.isFinite(d));
      const minBuffer = candidates.length > 0 ? Math.min(...candidates) : 0;

      return {
        structure: self,
        violations,
        minBuffer,
        buffersByCategory: {
          livestock: Number.isFinite(minLivestock) ? minLivestock : 0,
          water: Number.isFinite(minWater) ? minWater : 0,
          human: Number.isFinite(minHuman) ? minHuman : 0,
          boundary: Number.isFinite(minBoundary) ? minBoundary : 0,
        },
      };
    });
  }, [projectStructures, parcelBoundaryGeojson]);

  if (reports.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Biosecurity & Buffer Audit</h3>
            <p className={css.cardHint}>No livestock structures placed yet. Add a barn or animal shelter to surface disease-vector setback recommendations.</p>
          </div>
          <span className={css.heuristicBadge}>AI DRAFT</span>
        </div>
      </div>
    );
  }

  const totalViolations = reports.reduce((sum, r) => sum + r.violations.length, 0);
  const cleanCount = reports.filter((r) => r.violations.length === 0).length;
  const isolationCandidate = [...reports].sort((a, b) => b.minBuffer - a.minBuffer)[0];

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Biosecurity & Buffer Audit</h3>
          <p className={css.cardHint}>
            Heuristic setback audit for {reports.length} livestock structure{reports.length === 1 ? '' : 's'}: cross-species
            distance, water-source proximity, human-zone buffer, and parcel-boundary clearance. Recommended thresholds reflect
            common rural extension-service guidance — confirm against your local ordinance.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </div>

      <div className={css.summaryRow}>
        <div className={css.summaryStat}>
          <div className={css.summaryLabel}>Audited</div>
          <div className={css.summaryValue}>{reports.length}</div>
          <div className={css.summarySub}>livestock structures</div>
        </div>
        <div className={css.summaryStat}>
          <div className={css.summaryLabel}>Clean</div>
          <div className={`${css.summaryValue} ${cleanCount === reports.length ? css.toneGood : css.toneFair}`}>{cleanCount}</div>
          <div className={css.summarySub}>no setback violations</div>
        </div>
        <div className={css.summaryStat}>
          <div className={css.summaryLabel}>Violations</div>
          <div className={`${css.summaryValue} ${totalViolations === 0 ? css.toneGood : totalViolations < 4 ? css.toneFair : css.tonePoor}`}>{totalViolations}</div>
          <div className={css.summarySub}>across all rules</div>
        </div>
      </div>

      <div className={css.rulesBlock}>
        <div className={css.rulesTitle}>Setback rules applied</div>
        <ul className={css.rulesList}>
          <li><span className={css.ruleDot} data-rule="livestock" /> Livestock ↔ Livestock ≥ {SETBACK_LIVESTOCK_M} m <span className={css.ruleNote}>cross-species disease spread</span></li>
          <li><span className={css.ruleDot} data-rule="water" /> Livestock ↔ Water source ≥ {SETBACK_WATER_M} m <span className={css.ruleNote}>manure runoff into wells/tanks</span></li>
          <li><span className={css.ruleDot} data-rule="human" /> Livestock ↔ Human zone ≥ {SETBACK_HUMAN_M} m <span className={css.ruleNote}>zoonotic + odor buffer</span></li>
          <li><span className={css.ruleDot} data-rule="boundary" /> Livestock ↔ Parcel boundary ≥ {SETBACK_BOUNDARY_M} m <span className={css.ruleNote}>neighbor relations</span></li>
        </ul>
      </div>

      <ul className={css.reportList}>
        {reports.map((r) => {
          const tone = r.violations.length === 0 ? 'good' : r.violations.length < 3 ? 'fair' : 'poor';
          return (
            <li key={r.structure.id} className={`${css.report} ${css[`tone_${tone}`] ?? ''}`}>
              <div className={css.reportHead}>
                <div>
                  <div className={css.reportName}>{r.structure.name}</div>
                  <div className={css.reportType}>{labelFor(r.structure.type)}</div>
                </div>
                <div className={css.reportStatus}>
                  {r.violations.length === 0
                    ? <span className={css.statusGood}>Clean</span>
                    : <span className={css.statusBad}>{r.violations.length} violation{r.violations.length === 1 ? '' : 's'}</span>}
                </div>
              </div>

              <div className={css.bufferGrid}>
                <BufferStat label="Nearest livestock" m={r.buffersByCategory.livestock} required={SETBACK_LIVESTOCK_M} />
                <BufferStat label="Nearest water" m={r.buffersByCategory.water} required={SETBACK_WATER_M} />
                <BufferStat label="Nearest human zone" m={r.buffersByCategory.human} required={SETBACK_HUMAN_M} />
                <BufferStat label="Boundary clearance" m={r.buffersByCategory.boundary} required={SETBACK_BOUNDARY_M} />
              </div>

              {r.violations.length > 0 && (
                <ul className={css.violationList}>
                  {r.violations.map((v, i) => (
                    <li key={i} className={css.violation}>
                      <span className={css.ruleDot} data-rule={v.rule} />
                      <span className={css.violationText}>
                        <strong>{labelFor(v.targetType)}</strong> "{v.targetName}" only <strong>{fmtM(v.distanceM)}</strong> away
                        — needs ≥ {v.requiredM} m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {isolationCandidate && (
        <div className={css.isolationCard}>
          <div className={css.isolationLabel}>Isolation pad candidate</div>
          <div className={css.isolationName}>{isolationCandidate.structure.name}</div>
          <p className={css.isolationNote}>
            Most-buffered livestock structure ({fmtM(isolationCandidate.minBuffer)} to nearest non-self feature).
            Best candidate for a quarantine pad or sick-animal isolation pen — sustained separation reduces
            cross-contamination during outbreaks.
          </p>
        </div>
      )}

      <p className={css.footnote}>
        Heuristic setbacks reflect common North American extension-service guidance (NRCS, Penn State Extension).
        Distances measured from <em>structure center</em> on a flat-earth approximation — fence geometry, slope, and
        prevailing wind are not modelled. Cross-check against local ordinance and your veterinarian before siting.
      </p>
    </div>
  );
}

function BufferStat({ label, m, required }: { label: string; m: number; required: number }) {
  const tone = m === 0 ? 'fair' : m >= required ? 'good' : 'poor';
  return (
    <div className={css.bufferStat}>
      <div className={css.bufferLabel}>{label}</div>
      <div className={`${css.bufferValue} ${css[`tone_${tone}`] ?? ''}`}>{m === 0 ? '—' : fmtM(m)}</div>
      <div className={css.bufferReq}>need ≥ {required} m</div>
    </div>
  );
}
