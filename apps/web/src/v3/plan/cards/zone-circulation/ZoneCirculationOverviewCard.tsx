/**
 * ZoneCirculationOverviewCard — Plan Module 3 (Zone & Circulation), card 3/3.
 *
 * Per Permaculture Scholar verdict 2026-05-07: a list-only zone/path
 * editor is "entirely insufficient." Mollison's Z0–Z5 ladder is
 * fundamentally about *the spatial relationship of elements and how
 * people move through a site*. The minimum permaculture-sound
 * visualisation is a base map with Z0–Z5 polygons drawn over it and
 * frequency-tagged paths traced on top, so the steward can verify that
 * their daily / weekly routes actually intersect their high-maintenance
 * zones.
 *
 * v1: render a normalised SVG mini-map driven directly off the zones +
 * paths the user already drew on the live map. No map-draw integration
 * here — that's a follow-up. Validation flags daily / weekly paths that
 * never enter a Z1 or Z2 zone (the canonical "where high-maintenance
 * elements live" zones). Geometry test uses @turf/boolean-intersects
 * (line ↔ polygon true intersection) per Module 3 follow-up
 * `2026-05-07-atlas-plan-zones-scholar-keep-atlas.md`; the legacy
 * bbox-overlap heuristic is still kept as a cheap pre-filter.
 */

import { useMemo } from 'react';
import { booleanIntersects } from '@turf/turf';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useZoneStore, type LandZone } from '../../../../store/zoneStore.js';
import { usePathStore, type DesignPath } from '../../../../store/pathStore.js';
import styles from '../../../../features/plan/planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

// Colour ramp keyed by Z-level (intensity-of-visit) — tuned to read on
// the dark module-card surface.
const Z_FILL: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
  0: 'rgba(220,160,90,0.55)',  // Z0 — home (warmest)
  1: 'rgba(210,180,90,0.45)',
  2: 'rgba(190,200,100,0.40)',
  3: 'rgba(150,200,130,0.35)',
  4: 'rgba(110,190,160,0.30)',
  5: 'rgba(80,160,170,0.25)',  // Z5 — wilderness (coolest)
};
const Z_LABEL: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
  0: 'Z0', 1: 'Z1', 2: 'Z2', 3: 'Z3', 4: 'Z4', 5: 'Z5',
};

const FREQ_WIDTH: Record<NonNullable<DesignPath['usageFrequency']>, number> = {
  daily: 4,
  weekly: 2.6,
  occasional: 1.6,
  rare: 1,
};
const FREQ_COLOR: Record<NonNullable<DesignPath['usageFrequency']>, string> = {
  daily: 'rgba(232,200,140,0.95)',
  weekly: 'rgba(200,180,140,0.85)',
  occasional: 'rgba(170,160,140,0.7)',
  rare: 'rgba(150,140,130,0.55)',
};

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EMPTY_BBOX: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

function expandBBox(b: BBox, x: number, y: number): BBox {
  return {
    minX: Math.min(b.minX, x),
    minY: Math.min(b.minY, y),
    maxX: Math.max(b.maxX, x),
    maxY: Math.max(b.maxY, y),
  };
}

function ringBBox(ring: number[][], acc: BBox): BBox {
  for (const pt of ring) acc = expandBBox(acc, pt[0]!, pt[1]!);
  return acc;
}

function polygonBBox(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): BBox {
  let acc: BBox = EMPTY_BBOX;
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) acc = ringBBox(ring, acc);
  } else {
    for (const poly of geom.coordinates) for (const ring of poly) acc = ringBBox(ring, acc);
  }
  return acc;
}

function lineBBox(geom: GeoJSON.LineString): BBox {
  return ringBBox(geom.coordinates, EMPTY_BBOX);
}

function bboxesIntersect(a: BBox, b: BBox): boolean {
  if (!isFinite(a.minX) || !isFinite(b.minX)) return false;
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
}

export default function ZoneCirculationOverviewCard({ project, onSwitchToMap }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);

  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );
  const paths = useMemo(
    () => allPaths.filter((p) => p.projectId === project.id),
    [allPaths, project.id],
  );

  // Compute mini-map bbox: union of boundary + all zones + all paths.
  const bbox = useMemo<BBox>(() => {
    let acc: BBox = EMPTY_BBOX;
    const boundary = project.parcelBoundaryGeojson as unknown;
    if (boundary && typeof boundary === 'object') {
      const b = boundary as Partial<GeoJSON.Feature> & Partial<GeoJSON.FeatureCollection> & Partial<GeoJSON.Geometry>;
      const geom: GeoJSON.Geometry | undefined =
        b.type === 'FeatureCollection'
          ? b.features?.[0]?.geometry
          : b.type === 'Feature'
            ? b.geometry
            : (b as GeoJSON.Geometry);
      if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
        acc = (() => {
          const b = polygonBBox(geom);
          return {
            minX: Math.min(acc.minX, b.minX),
            minY: Math.min(acc.minY, b.minY),
            maxX: Math.max(acc.maxX, b.maxX),
            maxY: Math.max(acc.maxY, b.maxY),
          };
        })();
      }
    }
    for (const z of zones) {
      const b = polygonBBox(z.geometry);
      acc = {
        minX: Math.min(acc.minX, b.minX),
        minY: Math.min(acc.minY, b.minY),
        maxX: Math.max(acc.maxX, b.maxX),
        maxY: Math.max(acc.maxY, b.maxY),
      };
    }
    for (const p of paths) {
      const b = lineBBox(p.geometry);
      acc = {
        minX: Math.min(acc.minX, b.minX),
        minY: Math.min(acc.minY, b.minY),
        maxX: Math.max(acc.maxX, b.maxX),
        maxY: Math.max(acc.maxY, b.maxY),
      };
    }
    if (!isFinite(acc.minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    // Pad 5% on every edge so geometry doesn't kiss the frame.
    const w = acc.maxX - acc.minX || 1;
    const h = acc.maxY - acc.minY || 1;
    return {
      minX: acc.minX - w * 0.05,
      minY: acc.minY - h * 0.05,
      maxX: acc.maxX + w * 0.05,
      maxY: acc.maxY + h * 0.05,
    };
  }, [project.parcelBoundaryGeojson, zones, paths]);

  const W = 720;
  const H = 460;

  // Build the geo→svg projector. Y is flipped because lat increases northward.
  const project2d = useMemo(() => {
    const dx = bbox.maxX - bbox.minX || 1;
    const dy = bbox.maxY - bbox.minY || 1;
    const scale = Math.min(W / dx, H / dy);
    const offX = (W - dx * scale) / 2;
    const offY = (H - dy * scale) / 2;
    return (lon: number, lat: number) => ({
      x: (lon - bbox.minX) * scale + offX,
      y: H - ((lat - bbox.minY) * scale + offY),
    });
  }, [bbox]);

  // Boundary path (background outline).
  const boundaryPath = useMemo(() => {
    const raw = project.parcelBoundaryGeojson as unknown;
    if (!raw || typeof raw !== 'object') return null;
    const b = raw as Partial<GeoJSON.Feature> & Partial<GeoJSON.FeatureCollection> & Partial<GeoJSON.Geometry>;
    const geom: GeoJSON.Geometry | undefined =
      b.type === 'FeatureCollection'
        ? b.features?.[0]?.geometry
        : b.type === 'Feature'
          ? b.geometry
          : (b as GeoJSON.Geometry);
    if (!geom) return null;
    if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') return null;
    const polys: number[][][][] = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    return polys
      .flatMap((poly) => poly.map((ring) =>
        ring
          .map((pt, i) => {
            const p = project2d(pt[0]!, pt[1]!);
            return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          })
          .join(' ') + ' Z',
      ))
      .join(' ');
  }, [project.parcelBoundaryGeojson, project2d]);

  // Validation: high-frequency paths that don't truly intersect any Z1/Z2
  // zone polygon. Two-stage test: (1) cheap bbox pre-filter rejects the
  // obvious non-overlaps; (2) @turf/boolean-intersects then runs a real
  // line↔polygon intersection on the survivors so adjacent-but-not-touching
  // bboxes don't false-positive as orphans. Closes the bbox-only heuristic
  // tracked in `wiki/decisions/2026-05-07-atlas-plan-zones-scholar-keep-atlas.md`.
  const z12Zones = useMemo(
    () => zones.filter((z) => z.permacultureZone === 1 || z.permacultureZone === 2),
    [zones],
  );
  const z12BBoxes = useMemo(
    () => z12Zones.map((z) => polygonBBox(z.geometry)),
    [z12Zones],
  );
  const orphanHighFreqPaths = useMemo(() => {
    const result: DesignPath[] = [];
    for (const p of paths) {
      if (p.usageFrequency !== 'daily' && p.usageFrequency !== 'weekly') continue;
      const pb = lineBBox(p.geometry);
      let touchesZ12 = false;
      for (let i = 0; i < z12Zones.length; i++) {
        if (!bboxesIntersect(pb, z12BBoxes[i]!)) continue;
        // bbox says "maybe overlap" → confirm with real geometry test.
        try {
          if (booleanIntersects(p.geometry, z12Zones[i]!.geometry)) {
            touchesZ12 = true;
            break;
          }
        } catch {
          // If turf throws on a degenerate geometry, fall back to the
          // bbox-positive result rather than false-flagging the path.
          touchesZ12 = true;
          break;
        }
      }
      if (!touchesZ12) result.push(p);
    }
    return result;
  }, [paths, z12Zones, z12BBoxes]);

  const untaggedZones = zones.filter((z) => typeof z.permacultureZone !== 'number').length;
  const untaggedPaths = paths.filter((p) => !p.usageFrequency).length;

  // Z-level coverage (m²)
  const zoneAreaByLevel = useMemo(() => {
    const out: Record<number, number> = {};
    for (const z of zones) {
      if (typeof z.permacultureZone === 'number') {
        out[z.permacultureZone] = (out[z.permacultureZone] ?? 0) + z.areaM2;
      }
    }
    return out;
  }, [zones]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 3 · Zone &amp; Circulation</span>
        <h1 className={styles.title}>Zone &amp; circulation overview</h1>
        <p className={styles.lede}>
          Zones aren&rsquo;t land-use categories — they&rsquo;re a frequency-of-visit
          ladder. Per Permaculture Scholar (2026-05-07): you can&rsquo;t verify
          a zone plan without seeing the spatial relationship between
          high-frequency paths and high-maintenance Z1 / Z2 elements
          (Mollison, <em>Designers&rsquo; Manual</em>; Yeomans Scale of
          Permanence: subdivision/livestock comes later, not here).
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Coverage</h2>
        {([0, 1, 2, 3, 4, 5] as const).map((lv) => (
          <div key={lv} className={styles.statRow}>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  background: Z_FILL[lv],
                  border: '1px solid rgba(255,255,255,0.2)',
                  marginRight: 8,
                  verticalAlign: 'middle',
                }}
              />
              {Z_LABEL[lv]}
            </span>
            <span>{((zoneAreaByLevel[lv] ?? 0) / 10000).toFixed(2)} ha</span>
          </div>
        ))}
        <div className={styles.statRow}>
          <span>Untagged zones / paths</span>
          <span>
            {untaggedZones} zones · {untaggedPaths} paths
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Validation</h2>
        {orphanHighFreqPaths.length === 0 && untaggedZones === 0 && untaggedPaths === 0 ? (
          <p className={styles.empty}>
            All zones &amp; paths tagged · every daily / weekly path enters a Z1 or Z2 zone. ✓
          </p>
        ) : (
          <ul className={styles.list}>
            {orphanHighFreqPaths.map((p) => (
              <li key={p.id} className={styles.listRow}>
                <div>
                  <strong>{p.name || 'Unnamed path'}</strong>
                  <div className={styles.listMeta} style={{ color: 'rgba(220,140,120,0.9)' }}>
                    {p.usageFrequency} path · doesn&rsquo;t enter any Z1 / Z2 zone
                  </div>
                </div>
              </li>
            ))}
            {untaggedZones > 0 && (
              <li className={styles.listRow}>
                <div>
                  <strong>{untaggedZones} zone{untaggedZones === 1 ? '' : 's'} untagged</strong>
                  <div className={styles.listMeta}>Assign Z0–Z5 in the Zone level layer tab.</div>
                </div>
              </li>
            )}
            {untaggedPaths > 0 && (
              <li className={styles.listRow}>
                <div>
                  <strong>{untaggedPaths} path{untaggedPaths === 1 ? '' : 's'} untagged</strong>
                  <div className={styles.listMeta}>Assign frequency in the Path frequency tab.</div>
                </div>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mini-map</h2>
        {zones.length === 0 && paths.length === 0 ? (
          <p className={styles.empty}>
            No zones or paths drawn yet for this project.{' '}
            <button
              type="button"
              onClick={onSwitchToMap}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(180,200,240,0.95)',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Open the map
            </button>{' '}
            to draw them, then return here to verify.
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{
              width: '100%',
              height: 'auto',
              background: 'linear-gradient(to bottom, rgba(60,90,130,0.12), rgba(40,30,20,0.35))',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Boundary outline */}
            {boundaryPath && (
              <path
                d={boundaryPath}
                fill="rgba(255,255,255,0.03)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            )}

            {/* Zone polygons (Z0–Z5 fill) */}
            {zones.map((z: LandZone) => {
              const polys: number[][][][] =
                z.geometry.type === 'Polygon' ? [z.geometry.coordinates] : z.geometry.coordinates;
              const d = polys
                .flatMap((poly) =>
                  poly.map((ring) =>
                    ring
                      .map((pt, i) => {
                        const p = project2d(pt[0]!, pt[1]!);
                        return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
                      })
                      .join(' ') + ' Z',
                  ),
                )
                .join(' ');
              const lv = z.permacultureZone;
              const fill =
                typeof lv === 'number'
                  ? Z_FILL[lv]
                  : 'rgba(120,120,120,0.18)';
              return (
                <path
                  key={z.id}
                  d={d}
                  fill={fill}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={0.7}
                />
              );
            })}

            {/* Paths */}
            {paths.map((p) => {
              const d = p.geometry.coordinates
                .map((pt, i) => {
                  const q = project2d(pt[0]!, pt[1]!);
                  return `${i === 0 ? 'M' : 'L'} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
                })
                .join(' ');
              const freq = p.usageFrequency;
              const stroke = freq ? FREQ_COLOR[freq] : 'rgba(150,150,150,0.45)';
              const width = freq ? FREQ_WIDTH[freq] : 1;
              return (
                <path
                  key={p.id}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Z-level labels (centroid of bbox per zone) */}
            {zones.map((z) => {
              const lv = z.permacultureZone;
              if (typeof lv !== 'number') return null;
              const b = polygonBBox(z.geometry);
              const cx = (b.minX + b.maxX) / 2;
              const cy = (b.minY + b.maxY) / 2;
              const p = project2d(cx, cy);
              return (
                <text
                  key={`lbl-${z.id}`}
                  x={p.x}
                  y={p.y}
                  fontSize={11}
                  fontWeight={600}
                  fill="rgba(232,220,200,0.95)"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {Z_LABEL[lv]}
                </text>
              );
            })}

            {/* Legend (frequency) */}
            <g transform={`translate(${W - 150}, 12)`}>
              <rect
                x={-6}
                y={-4}
                width={150}
                height={84}
                rx={6}
                fill="rgba(20,18,12,0.65)"
                stroke="rgba(255,255,255,0.08)"
              />
              <text x={0} y={10} fontSize={10} fill="rgba(232,220,200,0.7)">
                Path frequency
              </text>
              {(['daily', 'weekly', 'occasional', 'rare'] as const).map((f, i) => (
                <g key={f} transform={`translate(0, ${24 + i * 14})`}>
                  <line
                    x1={0}
                    y1={0}
                    x2={26}
                    y2={0}
                    stroke={FREQ_COLOR[f]}
                    strokeWidth={FREQ_WIDTH[f]}
                    strokeLinecap="round"
                  />
                  <text x={32} y={3} fontSize={10} fill="rgba(232,220,200,0.85)">
                    {f}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        )}
      </section>
    </div>
  );
}
