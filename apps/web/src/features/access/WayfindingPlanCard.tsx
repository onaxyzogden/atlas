/**
 * §10 WayfindingPlanCard — orientation-legibility audit of the path
 * network. Detects junctions between paths, checks each one for a
 * landmark anchor (a placed structure within 50 m), flags orphan
 * structures (no path within 80 m), and flags long paths that lack any
 * intermediate decision point. Composes a 0\u2013100 wayfinding
 * legibility score from those signals.
 *
 * Pure presentation \u2014 no shared-package math, no map overlays. Uses
 * the same flat-earth distance approximation as EducationalRouteOverlays.
 */

import { useMemo } from 'react';
import {
  usePathStore,
  PATH_TYPE_CONFIG,
  type DesignPath,
  type PathType,
} from '../../store/pathStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import css from './WayfindingPlanCard.module.css';

/* ── Tunables ──────────────────────────────────────────────────────────── */

/** Two path sample-points within this distance count as the same junction. */
const JUNCTION_RADIUS_M = 25;
/** A structure within this distance of a junction "anchors" it. */
const ANCHOR_RADIUS_M = 50;
/** A structure beyond this distance from any path is "orphaned" from the network. */
const ORPHAN_RADIUS_M = 80;
/** Paths longer than this and without an intermediate junction are "blind". */
const BLIND_PATH_THRESHOLD_M = 200;
/** Path types that count as the "arrival network" (where a visitor enters). */
const ARRIVAL_PATH_TYPES: ReadonlySet<PathType> = new Set([
  'arrival_sequence',
  'main_road',
  'secondary_road',
]);

/* ── Geometry helpers (flat-earth, no turf) ────────────────────────────── */

function metersPerDegree(latDeg: number): { mPerLat: number; mPerLng: number } {
  const cosLat = Math.cos((latDeg * Math.PI) / 180);
  return { mPerLat: 110_540, mPerLng: 111_320 * cosLat };
}

function distMeters(a: [number, number], b: [number, number]): number {
  const { mPerLat, mPerLng } = metersPerDegree((a[1] + b[1]) / 2);
  const dx = (a[0] - b[0]) * mPerLng;
  const dy = (a[1] - b[1]) * mPerLat;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Sample N evenly-spaced points along a LineString proportional to segment length. */
function sampleLine(line: GeoJSON.LineString, samples: number): [number, number][] {
  const coords = line.coordinates as [number, number][];
  if (coords.length === 0) return [];
  if (coords.length === 1) return [coords[0]!];
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distMeters(coords[i]!, coords[i + 1]!);
    segLens.push(d);
    total += d;
  }
  if (total === 0) return [coords[0]!];
  const out: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const target = (i / (samples - 1 || 1)) * total;
    let acc = 0;
    for (let j = 0; j < segLens.length; j++) {
      const segLen = segLens[j]!;
      if (acc + segLen >= target || j === segLens.length - 1) {
        const t = segLen > 0 ? (target - acc) / segLen : 0;
        const a = coords[j]!;
        const b = coords[j + 1]!;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        break;
      }
      acc += segLen;
    }
  }
  return out;
}

/* ── Wayfinding analysis ───────────────────────────────────────────────── */

interface Junction {
  /** Average position of clustered sample points. */
  center: [number, number];
  pathIds: Set<string>;
  /** Position along each path expressed as 0\u20131 (start \u2026 end). */
  isEndpoint: boolean;
  /** Nearest landmark structure within ANCHOR_RADIUS_M, if any. */
  anchor: Structure | null;
  anchorDistM: number;
}

interface OrphanStructure {
  structure: Structure;
  nearestPathDistM: number;
}

interface BlindPath {
  path: DesignPath;
  reason: string;
}

interface UnreachableStructure {
  structure: Structure;
  nearestArrivalDistM: number;
}

interface WayfindingReport {
  totalPaths: number;
  totalStructures: number;
  junctions: Junction[];
  anchoredJunctionCount: number;
  orphans: OrphanStructure[];
  blindPaths: BlindPath[];
  unreachable: UnreachableStructure[];
  arrivalPathCount: number;
  /** 0\u2013100 composite score. */
  score: number;
}

function analyzeWayfinding(paths: DesignPath[], structures: Structure[]): WayfindingReport {
  // 1. Sample each path. Use 16 samples per path (good resolution for
  //    junction detection — a 200 m path gets ~13 m sampling).
  const SAMPLE_COUNT = 16;
  const sampledPaths = paths.map((p) => ({
    path: p,
    samples: sampleLine(p.geometry, SAMPLE_COUNT),
  }));

  // 2. Detect junctions: pairs of paths whose sample-points come within
  //    JUNCTION_RADIUS_M of each other. Cluster all such hits per
  //    path-pair into a single junction (keeping the closest).
  const junctions: Junction[] = [];
  for (let i = 0; i < sampledPaths.length; i++) {
    for (let j = i + 1; j < sampledPaths.length; j++) {
      const a = sampledPaths[i]!;
      const b = sampledPaths[j]!;
      let bestDist = Infinity;
      let bestA: [number, number] | null = null;
      let bestB: [number, number] | null = null;
      let bestAIdx = -1;
      let bestBIdx = -1;
      for (let ai = 0; ai < a.samples.length; ai++) {
        for (let bi = 0; bi < b.samples.length; bi++) {
          const d = distMeters(a.samples[ai]!, b.samples[bi]!);
          if (d < bestDist) {
            bestDist = d;
            bestA = a.samples[ai]!;
            bestB = b.samples[bi]!;
            bestAIdx = ai;
            bestBIdx = bi;
          }
        }
      }
      if (bestDist <= JUNCTION_RADIUS_M && bestA && bestB) {
        const isEndpointA = bestAIdx === 0 || bestAIdx === SAMPLE_COUNT - 1;
        const isEndpointB = bestBIdx === 0 || bestBIdx === SAMPLE_COUNT - 1;
        junctions.push({
          center: [(bestA[0] + bestB[0]) / 2, (bestA[1] + bestB[1]) / 2],
          pathIds: new Set([a.path.id, b.path.id]),
          isEndpoint: isEndpointA && isEndpointB,
          anchor: null,
          anchorDistM: Infinity,
        });
      }
    }
  }

  // 3. Anchor each junction to the nearest structure within ANCHOR_RADIUS_M.
  for (const jn of junctions) {
    let best: Structure | null = null;
    let bestDist = Infinity;
    for (const s of structures) {
      const d = distMeters(jn.center, s.center);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    if (best && bestDist <= ANCHOR_RADIUS_M) {
      jn.anchor = best;
      jn.anchorDistM = bestDist;
    }
  }

  // 4. Orphan structures: > ORPHAN_RADIUS_M from any path sample-point.
  const orphans: OrphanStructure[] = [];
  for (const s of structures) {
    let best = Infinity;
    for (const sp of sampledPaths) {
      for (const pt of sp.samples) {
        const d = distMeters(s.center, pt);
        if (d < best) best = d;
      }
    }
    if (best > ORPHAN_RADIUS_M) {
      orphans.push({ structure: s, nearestPathDistM: best });
    }
  }

  // 5. Blind paths: longer than threshold AND no intermediate junction.
  //    "Intermediate" = junction sample index not at endpoint of this path.
  const blindPaths: BlindPath[] = [];
  for (const sp of sampledPaths) {
    if (sp.path.lengthM < BLIND_PATH_THRESHOLD_M) continue;
    // Count junctions touching THIS path that aren't pure-endpoint hits.
    const intermediate = junctions.filter(
      (jn) => jn.pathIds.has(sp.path.id) && !jn.isEndpoint,
    ).length;
    if (intermediate === 0) {
      blindPaths.push({
        path: sp.path,
        reason: `${Math.round(sp.path.lengthM)} m without an intermediate junction or landmark anchor`,
      });
    }
  }

  // 6. Unreachable destinations from arrival network.
  const arrivalPaths = sampledPaths.filter((sp) => ARRIVAL_PATH_TYPES.has(sp.path.type));
  const unreachable: UnreachableStructure[] = [];
  if (arrivalPaths.length > 0) {
    for (const s of structures) {
      let best = Infinity;
      for (const sp of arrivalPaths) {
        for (const pt of sp.samples) {
          const d = distMeters(s.center, pt);
          if (d < best) best = d;
        }
      }
      // Use the orphan threshold: if the structure isn't within reach of
      // the arrival network it requires a connector that wasn't drawn.
      if (best > ORPHAN_RADIUS_M) {
        unreachable.push({ structure: s, nearestArrivalDistM: best });
      }
    }
  }

  // 7. Composite score (0\u2013100).
  const anchoredCount = junctions.filter((j) => j.anchor !== null).length;
  const totalStructures = structures.length;
  const totalPaths = paths.length;
  const anchorRatio = junctions.length > 0 ? anchoredCount / junctions.length : 0;
  const orphanRatio = totalStructures > 0 ? orphans.length / totalStructures : 0;
  const blindRatio = totalPaths > 0 ? blindPaths.length / totalPaths : 0;

  let score = 50; // neutral baseline
  score += 25 * anchorRatio; // up to +25 for fully anchored junctions
  score += 15 * (1 - orphanRatio); // up to +15 for no orphan structures
  score += 10 * (1 - blindRatio); // up to +10 for no blind paths
  // If there are no paths at all, the network can't be legible.
  if (totalPaths === 0) score = 0;
  // If there are paths but no structures, can't anchor anything.
  if (totalPaths > 0 && totalStructures === 0) score = Math.min(score, 35);
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    totalPaths,
    totalStructures,
    junctions,
    anchoredJunctionCount: anchoredCount,
    orphans,
    blindPaths,
    unreachable,
    arrivalPathCount: arrivalPaths.length,
    score,
  };
}

function ratingFor(score: number): { word: string; tone: 'good' | 'fair' | 'poor' } {
  if (score >= 75) return { word: 'Legible', tone: 'good' };
  if (score >= 55) return { word: 'Workable', tone: 'fair' };
  if (score >= 30) return { word: 'Confusing', tone: 'poor' };
  return { word: 'Disorienting', tone: 'poor' };
}

/* ── Component ─────────────────────────────────────────────────────────── */

interface Props {
  projectId: string;
}

export default function WayfindingPlanCard({ projectId }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);

  const paths = useMemo(
    () => allPaths.filter((p) => p.projectId === projectId),
    [allPaths, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );

  const report = useMemo(() => analyzeWayfinding(paths, structures), [paths, structures]);
  const rating = ratingFor(report.score);

  const ambiguousJunctions = report.junctions.filter((j) => j.anchor === null).slice(0, 5);

  if (paths.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h4 className={css.cardTitle}>Wayfinding Plan</h4>
          <span className={css.heuristicBadge}>Heuristic</span>
        </div>
        <div className={css.empty}>
          No paths drawn yet. Draw an arrival sequence and a few connectors
          to surface the wayfinding audit.
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h4 className={css.cardTitle}>Wayfinding Plan</h4>
          <p className={css.cardHint}>
            Junctions, landmark anchoring, orphan structures, and blind
            long paths.
          </p>
        </div>
        <span className={css.heuristicBadge}>Heuristic</span>
      </div>

      {/* Score gauge */}
      <div className={`${css.scoreRow} ${css[`tone_${rating.tone}`]}`}>
        <div className={css.scoreVal}>
          {report.score}
          <span className={css.scoreOf}>/100</span>
        </div>
        <div className={css.scoreMeta}>
          <span className={css.scoreWord}>{rating.word}</span>
          <span className={css.scoreSub}>orientation legibility</span>
        </div>
      </div>

      {/* Stat strip */}
      <div className={css.stats}>
        <Stat label="Junctions" value={report.junctions.length} />
        <Stat
          label="Anchored"
          value={report.anchoredJunctionCount}
          note={report.junctions.length > 0
            ? `${Math.round((report.anchoredJunctionCount / report.junctions.length) * 100)}%`
            : undefined}
        />
        <Stat label="Orphan structures" value={report.orphans.length} />
        <Stat label="Blind long paths" value={report.blindPaths.length} />
      </div>

      {/* Arrival reachability flag (if applicable) */}
      {report.arrivalPathCount > 0 && report.unreachable.length > 0 && (
        <div className={css.flagRow}>
          <span className={css.flagDot} />
          <div className={css.flagBody}>
            <span className={css.flagTitle}>
              {report.unreachable.length} destination{report.unreachable.length === 1 ? '' : 's'} not reached by arrival network
            </span>
            <span className={css.flagSub}>
              {report.unreachable.slice(0, 3).map((u) => u.structure.name || `(${u.structure.type})`).join(' \u00B7 ')}
              {report.unreachable.length > 3 && ` \u00B7 +${report.unreachable.length - 3} more`}
            </span>
          </div>
        </div>
      )}
      {report.arrivalPathCount === 0 && report.totalStructures > 0 && (
        <div className={css.flagRow}>
          <span className={css.flagDot} />
          <div className={css.flagBody}>
            <span className={css.flagTitle}>No arrival sequence or main road defined</span>
            <span className={css.flagSub}>Reachability cannot be evaluated until a visitor entry route is drawn.</span>
          </div>
        </div>
      )}

      {/* Issues list */}
      {(ambiguousJunctions.length > 0 || report.blindPaths.length > 0 || report.orphans.length > 0) && (
        <div className={css.issues}>
          <h5 className={css.issuesLabel}>Top issues</h5>
          <ul className={css.issueList}>
            {ambiguousJunctions.map((jn, idx) => {
              const pathNames = paths
                .filter((p) => jn.pathIds.has(p.id))
                .map((p) => p.name || PATH_TYPE_CONFIG[p.type]?.label || p.type)
                .join(' \u00D7 ');
              return (
                <li key={`jn-${idx}`} className={css.issue}>
                  <span className={css.issueKind}>Ambiguous junction</span>
                  <span className={css.issueDetail}>{pathNames || 'two paths'} meet with no landmark within {ANCHOR_RADIUS_M} m</span>
                </li>
              );
            })}
            {report.blindPaths.slice(0, 3).map((bp) => (
              <li key={`bp-${bp.path.id}`} className={css.issue}>
                <span className={css.issueKind}>Blind path</span>
                <span className={css.issueDetail}>{bp.path.name || PATH_TYPE_CONFIG[bp.path.type]?.label}{' \u2014 '}{bp.reason}</span>
              </li>
            ))}
            {report.orphans.slice(0, 3).map((op) => (
              <li key={`op-${op.structure.id}`} className={css.issue}>
                <span className={css.issueKind}>Orphan structure</span>
                <span className={css.issueDetail}>{op.structure.name || `(${op.structure.type})`}{' \u2014 '}{Math.round(op.nearestPathDistM)} m from nearest path</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className={css.footnote}>
        <em>Heuristic.</em> Junctions detected at {JUNCTION_RADIUS_M} m sample
        proximity; anchors counted within {ANCHOR_RADIUS_M} m; orphans beyond
        {' '}{ORPHAN_RADIUS_M} m of any path; blind paths longer than
        {' '}{BLIND_PATH_THRESHOLD_M} m without an intermediate junction. Score
        weights anchored junctions ({'\u00B1'}25), orphan ratio ({'\u00B1'}15),
        blind ratio ({'\u00B1'}10) above a 50-point baseline. Names landmark
        anchoring, not survey-grade signage planning.
      </p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={css.statVal}>{value}</span>
      {note && <span className={css.statNote}>{note}</span>}
    </div>
  );
}
