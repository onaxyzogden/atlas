/**
 * §3 SoilRiskHotspotsCard — derived dry / wet / erosion / compaction risk
 * advisories per drawn zone.
 *
 * Existing dashboards already surface zone categories (ZoneEcologyRollup),
 * carbon by land-use, and a sun-trap call-out (MicroclimateInsightsCard
 * covers the "sun trap" half of §3 `sun-trap-dry-wet-erosion-compaction`).
 * This card closes the other three risk classes — dry, wet, erosion,
 * compaction — by pulling signals already in the project stores:
 *
 *   • compaction: livestock paddock stocking density, plus zone categories
 *                 known to bear heavy traffic (livestock, infrastructure,
 *                 access corridors).
 *   • erosion:    zone successionStage tag (bare = high, pioneer = med),
 *                 with access / livestock categories adding pressure.
 *   • dry-prone:  centroid distance from the nearest water utility
 *                 (well_pump, water_tank, rain_catchment) — beyond ~120 m
 *                 carry-distance becomes a constraint, beyond ~250 m a
 *                 critical gap.
 *   • wet-prone:  zone category = water_retention, OR ≥ 2 water utilities
 *                 clustered within ~80 m of the centroid (likely a low /
 *                 wet pocket the steward has already started equipping).
 *
 * Pure presentation. No new shared math, no map writes, no new entity
 * types. Reads zoneStore + livestockStore + utilityStore.
 */
import { useMemo } from 'react';
import { useZoneStore, type LandZone, type ZoneCategory } from '../../store/zoneStore.js';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useUtilityStore, type Utility, type UtilityType } from '../../store/utilityStore.js';
import css from './SoilRiskHotspotsCard.module.css';

interface Props {
  projectId: string;
}

type Severity = 'low' | 'medium' | 'high';

interface RiskFlag {
  kind: 'compaction' | 'erosion' | 'dry' | 'wet';
  severity: Severity;
  rationale: string;
}

interface ZoneRisk {
  id: string;
  name: string;
  category: ZoneCategory;
  areaHa: number;
  flags: RiskFlag[];
  worst: Severity | null;
}

const WATER_UTILITY_TYPES: ReadonlySet<UtilityType> = new Set<UtilityType>([
  'well_pump',
  'water_tank',
  'rain_catchment',
]);

// Approximate degrees-per-metre at mid-latitudes — good enough for
// hot-spot proximity heuristics (no projection round-trip needed).
const M_PER_DEG_LAT = 111_320;

function centroidOf(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number] {
  // Lightweight average-of-vertices centroid. We're not drawing on the map
  // here, just deriving a representative point for proximity tests.
  const rings: GeoJSON.Position[][] =
    geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const ring of rings) {
    for (const pt of ring) {
      sx += pt[0]!;
      sy += pt[1]!;
      n += 1;
    }
  }
  if (n === 0) return [0, 0];
  return [sx / n, sy / n];
}

function metresBetween(a: [number, number], b: [number, number]): number {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dxM = (b[0] - a[0]) * M_PER_DEG_LAT * Math.cos(meanLatRad);
  const dyM = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.hypot(dxM, dyM);
}

function classifyZone(
  z: LandZone,
  paddockOverlay: Paddock | null,
  waterUtils: Utility[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const centroid = centroidOf(z.geometry);

  // ── Compaction ─────────────────────────────────────────────────────
  if (paddockOverlay && (paddockOverlay.stockingDensity ?? 0) >= 8) {
    flags.push({
      kind: 'compaction',
      severity: (paddockOverlay.stockingDensity ?? 0) >= 14 ? 'high' : 'medium',
      rationale: `Paddock "${paddockOverlay.name}" stocked at ${paddockOverlay.stockingDensity} head/ha — sustained hoof pressure compacts the topsoil.`,
    });
  } else if (z.category === 'livestock') {
    flags.push({
      kind: 'compaction',
      severity: 'medium',
      rationale: 'Livestock zone with no stocking density recorded — assume rotational pressure until paddocks are stocked.',
    });
  } else if (z.category === 'infrastructure' || z.category === 'access') {
    flags.push({
      kind: 'compaction',
      severity: 'medium',
      rationale: `${z.category === 'access' ? 'Access corridor' : 'Infrastructure footprint'} concentrates wheeled and foot traffic — expect heavy compaction over time.`,
    });
  }

  // ── Erosion ────────────────────────────────────────────────────────
  if (z.successionStage === 'bare') {
    flags.push({
      kind: 'erosion',
      severity: 'high',
      rationale: 'Bare ground tagged — every storm event is an erosion event. Cover-crop or mulch as a first-pass intervention.',
    });
  } else if (z.successionStage === 'pioneer') {
    flags.push({
      kind: 'erosion',
      severity: 'medium',
      rationale: 'Pioneer succession — root systems still shallow. Maintain or thicken vegetative cover before allowing disturbance.',
    });
  } else if (z.category === 'access' && z.successionStage !== 'climax') {
    flags.push({
      kind: 'erosion',
      severity: 'medium',
      rationale: 'Cleared access corridor — runoff concentrates along the path. Consider water-bars or rolling-grade dips.',
    });
  }

  // ── Dry-prone ──────────────────────────────────────────────────────
  if (z.category !== 'water_retention' && z.category !== 'conservation') {
    let nearestM: number | null = null;
    for (const u of waterUtils) {
      const d = metresBetween(centroid, u.center);
      if (nearestM === null || d < nearestM) nearestM = d;
    }
    if (nearestM === null) {
      flags.push({
        kind: 'dry',
        severity: 'medium',
        rationale: 'No water utility (well, tank, or rain catchment) placed yet — every irrigated zone will rely on hauled water.',
      });
    } else if (nearestM > 250) {
      flags.push({
        kind: 'dry',
        severity: 'high',
        rationale: `Nearest water utility is ${Math.round(nearestM)} m away — well beyond a hose run. Plan an in-zone catchment or distribution loop.`,
      });
    } else if (nearestM > 120) {
      flags.push({
        kind: 'dry',
        severity: 'medium',
        rationale: `Nearest water utility is ${Math.round(nearestM)} m away — workable for hand-watering but a constraint for irrigation lines.`,
      });
    }
  }

  // ── Wet-prone ──────────────────────────────────────────────────────
  if (z.category === 'water_retention') {
    flags.push({
      kind: 'wet',
      severity: 'medium',
      rationale: 'Water-retention zone by design — confirm overflow path and treat the lower fringe as seasonally saturated.',
    });
  } else {
    const closeWaterUtils = waterUtils.filter(
      (u) => metresBetween(centroid, u.center) < 80,
    );
    if (closeWaterUtils.length >= 2) {
      flags.push({
        kind: 'wet',
        severity: 'medium',
        rationale: `Cluster of ${closeWaterUtils.length} water utilities within 80 m — typically a low pocket where surface or subsurface water collects.`,
      });
    }
  }

  return flags;
}

function findOverlappingPaddock(z: LandZone, paddocks: Paddock[]): Paddock | null {
  if (z.category !== 'livestock') return null;
  const zCentroid = centroidOf(z.geometry);
  let best: { p: Paddock; d: number } | null = null;
  for (const p of paddocks) {
    const pc = centroidOf(p.geometry);
    const d = metresBetween(zCentroid, pc);
    if (best === null || d < best.d) best = { p, d };
  }
  // 200 m centroid distance ≈ overlapping or directly adjacent.
  return best && best.d < 200 ? best.p : null;
}

function severityRank(s: Severity | null): number {
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

function worstSeverity(flags: RiskFlag[]): Severity | null {
  if (flags.length === 0) return null;
  return flags.reduce<Severity>((acc, f) => (severityRank(f.severity) > severityRank(acc) ? f.severity : acc), 'low');
}

function bandClass(s: Severity | null): string {
  if (s === 'high') return css.row_high ?? '';
  if (s === 'medium') return css.row_med ?? '';
  if (s === 'low') return css.row_low ?? '';
  return css.row_clear ?? '';
}

const KIND_LABEL: Record<RiskFlag['kind'], string> = {
  compaction: 'Compaction',
  erosion: 'Erosion',
  dry: 'Dry-prone',
  wet: 'Wet-prone',
};

const KIND_ICON: Record<RiskFlag['kind'], string> = {
  compaction: '\u25A0', // ■
  erosion: '\u25BC',     // ▼
  dry: '\u2600',         // ☀
  wet: '\u2601',         // ☁
};

export default function SoilRiskHotspotsCard({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const { zones, paddocks, waterUtils } = useMemo(
    () => ({
      zones: allZones.filter((z) => z.projectId === projectId),
      paddocks: allPaddocks.filter((p) => p.projectId === projectId),
      waterUtils: allUtilities.filter(
        (u) => u.projectId === projectId && WATER_UTILITY_TYPES.has(u.type),
      ),
    }),
    [allZones, allPaddocks, allUtilities, projectId],
  );

  const rows = useMemo<ZoneRisk[]>(
    () =>
      zones.map((z) => {
        const overlay = findOverlappingPaddock(z, paddocks);
        const flags = classifyZone(z, overlay, waterUtils);
        return {
          id: z.id,
          name: z.name || '(unnamed zone)',
          category: z.category,
          areaHa: (z.areaM2 ?? 0) / 10_000,
          flags,
          worst: worstSeverity(flags),
        };
      }),
    [zones, paddocks, waterUtils],
  );

  const totals = useMemo(() => {
    let high = 0;
    let medium = 0;
    let clear = 0;
    const byKind: Record<RiskFlag['kind'], number> = { compaction: 0, erosion: 0, dry: 0, wet: 0 };
    for (const r of rows) {
      if (r.worst === 'high') high += 1;
      else if (r.worst === 'medium' || r.worst === 'low') medium += 1;
      else clear += 1;
      for (const f of r.flags) byKind[f.kind] += 1;
    }
    return { high, medium, clear, byKind };
  }, [rows]);

  if (zones.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Soil Risk Hotspots</h3>
            <p className={css.hint}>
              Per-zone dry / wet / erosion / compaction advisories derived
              from drawn zones, paddock stocking density, and water-utility
              placement. Draw at least one zone to populate this card.
            </p>
          </div>
          <span className={`${css.badge} ${css.badgeIdle ?? ''}`}>NO ZONES</span>
        </div>
        <div className={css.empty}>No zones drawn for this project yet.</div>
      </div>
    );
  }

  const overallTone =
    totals.high > 0 ? css.badgePoor : totals.medium > 0 ? css.badgeFair : css.badgeGood;

  // Sort: high > medium > clear, keeping original draw order within each band.
  const sorted = [...rows].sort((a, b) => severityRank(b.worst) - severityRank(a.worst));

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Soil Risk Hotspots</h3>
          <p className={css.hint}>
            Each drawn zone scored against four risk classes —
            <strong> compaction</strong>, <strong>erosion</strong>,
            <strong> dry-prone</strong>, <strong>wet-prone</strong> — using
            paddock stocking density, succession-stage tags, and distance
            to the nearest water utility. No new field data required.
          </p>
        </div>
        <span className={`${css.badge} ${overallTone}`}>
          {totals.high} HIGH · {totals.medium} WATCH · {totals.clear} CLEAR
        </span>
      </div>

      <div className={css.kindGrid}>
        {(Object.keys(KIND_LABEL) as RiskFlag['kind'][]).map((k) => (
          <div key={k} className={`${css.kindStat} ${totals.byKind[k] > 0 ? css.kindStatHit : ''}`}>
            <span className={css.kindIcon}>{KIND_ICON[k]}</span>
            <span className={css.kindLabel}>{KIND_LABEL[k]}</span>
            <span className={css.kindValue}>{totals.byKind[k]}</span>
          </div>
        ))}
      </div>

      <ul className={css.list}>
        {sorted.map((r) => (
          <li key={r.id} className={`${css.row} ${bandClass(r.worst)}`}>
            <div className={css.rowMain}>
              <div className={css.rowMeta}>
                <span className={css.rowName}>{r.name}</span>
                <span className={css.rowCat}>{r.category.replace(/_/g, ' ')}</span>
                <span className={css.rowArea}>{r.areaHa.toFixed(2)} ha</span>
              </div>
              <span className={`${css.rowBand} ${bandClass(r.worst)}`}>
                {r.worst === 'high'
                  ? 'HIGH'
                  : r.worst === 'medium' || r.worst === 'low'
                  ? 'WATCH'
                  : 'CLEAR'}
              </span>
            </div>

            {r.flags.length === 0 ? (
              <div className={css.clearNote}>
                No flagged risks — soil-protection conditions look acceptable
                for this zone's category and current vegetative cover.
              </div>
            ) : (
              <ul className={css.flagList}>
                {r.flags.map((f, i) => (
                  <li key={i} className={`${css.flag} ${css[`flag_${f.severity}`]}`}>
                    <span className={css.flagIcon}>{KIND_ICON[f.kind]}</span>
                    <span className={css.flagKind}>{KIND_LABEL[f.kind]}</span>
                    <span className={css.flagText}>{f.rationale}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        Heuristics are deliberately conservative: dry-zone thresholds use a
        flat 120 m / 250 m hose-and-haul radius (not slope-corrected),
        wet-zone clustering uses a fixed 80 m centroid window, and
        compaction relies on `Paddock.stockingDensity` rather than a
        treadage model. Treat these as walk-the-land prompts, not finished
        soil-conservation plans.
      </p>
    </div>
  );
}
