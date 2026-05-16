/**
 * ClosedLoopGraphCard — Plan Module 5 (Soil Fertility), card 3/4 (added card).
 *
 * Per Permaculture Scholar verdict 2026-05-07: Atlas's WasteVectorTool
 * captures directed edges between features but offers no visual graph
 * and no validation. Holmgren P6 ("Produce no waste") demands that
 * every output have a sink. This card surfaces the existing
 * `wasteVectors` data + every feature node and flags **orphan
 * fertility units** (no incoming or outgoing vector) and **isolated
 * features** (zones / structures / crops / fertility units that touch
 * no vector at all) so the steward can route the missing flows.
 *
 * Sources: NotebookLM Permaculture Scholar (5aa3dcf3-…), conversation
 * 2026-05-07; Holmgren D. *Principles & Pathways* P6 *Produce No
 * Waste*; OSU PDC, "Soil Building Goals & Plan."
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  useClosedLoopStore,
  type FertilityInfraType,
} from '../../../../store/closedLoopStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useAllStructures } from '../../../../store/builtEnvironmentSelectors.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { usePhaseStoreCappedEntities } from '../../usePhaseStoreCappedEntities.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

/** Avg of all vertices across all rings — cheap centroid, fine for layout. */
function polygonCentroid(geom: GeoJSON.Polygon): [number, number] | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const ring of geom.coordinates) {
    for (const pt of ring) {
      sx += pt[0]!;
      sy += pt[1]!;
      n++;
    }
  }
  return n === 0 ? null : [sx / n, sy / n];
}

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface Node {
  id: string;
  label: string;
  kind: 'zone' | 'structure' | 'crop' | 'fertility';
  /** [lng, lat] centroid when known, else null (e.g. structure without geometry). */
  lngLat: [number, number] | null;
}

type LayoutMode = 'ring' | 'spatial';

/**
 * Type-aware remedies for fertility units missing flows. Generic "declare
 * a feedstock and a destination" helps no one — a composter wants greens
 * + browns and outputs amendment; a chop-and-drop wants in-bed biomass
 * and outputs surface mulch. Sourced from Mollison ch.8 + Cornell
 * composting guidance + practical permaculture references.
 */
const FERTILITY_REMEDY: Record<
  FertilityInfraType,
  { orphan: string; noFeedstock: string }
> = {
  composter: {
    orphan: 'Wire greens + browns sources (kitchen scraps, grass, leaves, straw) inward and finished compost outward to garden / orchard zones.',
    noFeedstock: 'Outgoing flow declared but no feedstock source — what feeds the heap? Add greens + browns from kitchen, pasture or pruning piles.',
  },
  hugelkultur: {
    orphan: 'Hugel beds eat woody debris on build, then output a long planting bed. Wire wood-chip / log / brash sources inward and the bed itself as a planting destination.',
    noFeedstock: 'Outgoing yield declared but no woody feedstock — log the prunings or felled trunks that built the mound.',
  },
  biochar: {
    orphan: 'Biochar is built from a woody-feedstock burn and finished into amendment. Wire pruning/coppice waste inward and charged char out to garden beds.',
    noFeedstock: 'Outgoing char declared but no feedstock — what biomass is being charred?',
  },
  worm_bin: {
    orphan: 'Worm bins eat fine kitchen scraps and produce castings + leachate. Wire scrap source inward and castings out to a seedling / nursery zone.',
    noFeedstock: 'Outgoing castings declared but no incoming scraps — confirm the kitchen-to-bin route.',
  },
  cover_crop: {
    orphan: 'Cover crops capture sun + N in place. Wire the bed they grow in inward (as substrate) and chop-and-drop or tilling-in outward to the same bed.',
    noFeedstock: 'Cover crops typically self-seed or are sown — log the seed source / nursery as the incoming flow.',
  },
  chop_and_drop: {
    orphan: 'Chop-and-drop sources biomass in-place (comfrey, nettle, sunflower) and drops it as mulch. Wire the planting they\'re cut from inward and the bed they mulch outward.',
    noFeedstock: 'Outgoing mulch declared but no source — which planting is being chopped?',
  },
  dynamic_accumulator: {
    orphan: 'Dynamic accumulators (comfrey, dandelion, yarrow) mine deep minerals. Wire the soil/bed they grow in inward and a leaf-fall / cut-back schedule outward.',
    noFeedstock: 'Accumulators feed off the deep soil profile — log the bed or root-zone they\'re drawing from.',
  },
  rotational_grazing: {
    orphan: 'Rotational grazing eats forage and outputs manure + impact. Wire the paddock / cover crop inward and dunged paddocks outward to the next-rotation zone.',
    noFeedstock: 'Outgoing manure declared but no forage source — link the paddock or stockpile providing the feed.',
  },
};

const KIND_COLOR: Record<Node['kind'], string> = {
  zone: '#7fb285',
  structure: '#c89b66',
  crop: '#a3c45c',
  fertility: '#5db1a2',
};

export default function ClosedLoopGraphCard({ project }: Props) {
  const allVectors = useClosedLoopStore((s) => s.wasteVectors);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useAllStructures();
  const allCrops = useCropStore((s) => s.cropAreas);

  // Fertility infra is the only phase-tagged entity in this card.
  // Capped by the year scrubber's `yeomansCapForYear(currentYear)` via
  // the phaseStore→Yeomans adapter. Zones, structures, crops, and vectors stay uncapped:
  // they have no phase field, and caps are presentational — dangling
  // edges from a capped-out fertility node are accepted (matches the
  // principle established for WaterStorageCard overflow targets).
  // See wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md.
  const fertilityRaw = useMemo(
    () => allFertility.filter((f) => f.projectId === project.id),
    [allFertility, project.id],
  );
  const fertility = usePhaseStoreCappedEntities(fertilityRaw);

  const { nodes, vectors } = useMemo(() => {
    const pId = project.id;
    const ns: Node[] = [];
    for (const z of allZones) {
      if (z.projectId !== pId) continue;
      ns.push({ id: z.id, label: z.name || z.category, kind: 'zone', lngLat: polygonCentroid(z.geometry as GeoJSON.Polygon) });
    }
    for (const s of allStructures) {
      if (s.projectId !== pId) continue;
      ns.push({ id: s.id, label: s.name || s.type, kind: 'structure', lngLat: s.center ?? polygonCentroid(s.geometry) });
    }
    for (const c of allCrops) {
      if (c.projectId !== pId) continue;
      ns.push({ id: c.id, label: (c as { name?: string }).name ?? 'crop area', kind: 'crop', lngLat: polygonCentroid(c.geometry) });
    }
    for (const f of fertility) {
      ns.push({ id: f.id, label: `${f.type.replace(/_/g, ' ')}${f.scaleNote ? ` (${f.scaleNote})` : ''}`, kind: 'fertility', lngLat: f.center ?? null });
    }
    const vs = allVectors.filter((v) => v.projectId === pId);
    return { nodes: ns, vectors: vs };
  }, [project.id, allZones, allStructures, allCrops, fertility, allVectors]);

  // Adjacency
  const inDeg = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vectors) m.set(v.toFeatureId, (m.get(v.toFeatureId) ?? 0) + 1);
    return m;
  }, [vectors]);
  const outDeg = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vectors) m.set(v.fromFeatureId, (m.get(v.fromFeatureId) ?? 0) + 1);
    return m;
  }, [vectors]);

  // Orphan fertility = fertility node with no edges either direction.
  const orphanFertility = useMemo(
    () =>
      nodes.filter(
        (n) => n.kind === 'fertility' && (inDeg.get(n.id) ?? 0) === 0 && (outDeg.get(n.id) ?? 0) === 0,
      ),
    [nodes, inDeg, outDeg],
  );
  // Isolated feature = any non-fertility node that touches no vector.
  const isolatedFeatures = useMemo(
    () =>
      nodes.filter(
        (n) => n.kind !== 'fertility' && (inDeg.get(n.id) ?? 0) === 0 && (outDeg.get(n.id) ?? 0) === 0,
      ),
    [nodes, inDeg, outDeg],
  );
  // Sink-less producers = node that produces (out > 0) but never receives (in == 0).
  // For non-fertility, this is fine (fields produce). For fertility, an outgoing-only
  // unit with no incoming feedstock is suspicious.
  const fertilityWithoutFeedstock = useMemo(
    () =>
      nodes.filter(
        (n) => n.kind === 'fertility' && (outDeg.get(n.id) ?? 0) > 0 && (inDeg.get(n.id) ?? 0) === 0,
      ),
    [nodes, inDeg, outDeg],
  );

  // SVG layout: two modes.
  //  · 'ring' — nodes evenly spaced around a circle (original behaviour,
  //    works even when no centroids are known).
  //  · 'spatial' — nodes placed by lon/lat centroid, normalised into the
  //    SVG viewport. Per Module 5 follow-up
  //    `2026-05-07-atlas-plan-soil-scholar-build-fresh.md`: when centroid
  //    coords exist, the graph maps physical location so vector lengths
  //    reflect real haul distance (Holmgren P3 *Obtain a yield* — short
  //    haul = positive yield; long haul = energy debt).
  const W = 560, H = 360;
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.36;
  const PAD = 30;
  const [layout, setLayout] = useState<LayoutMode>('ring');
  const spatialReady = useMemo(
    () => nodes.some((n) => n.lngLat !== null),
    [nodes],
  );

  const positions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    if (layout === 'spatial' && spatialReady) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const n of nodes) {
        if (!n.lngLat) continue;
        const [lng, lat] = n.lngLat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      const dLng = maxLng - minLng || 1e-6;
      const dLat = maxLat - minLat || 1e-6;
      const sx = (W - 2 * PAD) / dLng;
      const sy = (H - 2 * PAD) / dLat;
      const s = Math.min(sx, sy);
      // Centre the projected cloud in the viewport.
      const offX = (W - s * dLng) / 2;
      const offY = (H - s * dLat) / 2;
      // Lay nodes without centroids on a fallback ring around the centre
      // so they don't pile up at the origin.
      const fallback: string[] = [];
      for (const n of nodes) {
        if (n.lngLat) {
          const [lng, lat] = n.lngLat;
          const x = offX + (lng - minLng) * s;
          const y = H - (offY + (lat - minLat) * s); // flip y so north reads up
          m.set(n.id, { x, y });
        } else {
          fallback.push(n.id);
        }
      }
      const fr = Math.min(W, H) * 0.18;
      fallback.forEach((id, i) => {
        const a = (i / Math.max(fallback.length, 1)) * Math.PI * 2 - Math.PI / 2;
        m.set(id, { x: cx + fr * Math.cos(a), y: cy + fr * Math.sin(a) });
      });
      return m;
    }
    // Ring fallback / default.
    const n = Math.max(nodes.length, 1);
    nodes.forEach((node, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      m.set(node.id, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    });
    return m;
  }, [nodes, cx, cy, r, layout, spatialReady]);

  const counts = useMemo(() => {
    const c = { zone: 0, structure: 0, crop: 0, fertility: 0 } as Record<Node['kind'], number>;
    for (const n of nodes) c[n.kind]++;
    return c;
  }, [nodes]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Closed-loop graph</h1>
        <p className={styles.lede}>
          Holmgren&rsquo;s sixth principle: <em>Produce no waste</em>. Every
          output should feed another element, every input should come from
          one. The graph below renders the waste-vectors you&rsquo;ve drawn
          and flags fertility units with no flows attached.
        </p>
      </header>

      {nodes.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            Add features (zones, structures, crops, fertility units) and waste
            vectors before this graph populates.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Graph</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', fontSize: '0.85em', opacity: 0.85 }}>
              <span>Layout:</span>
              {(['ring', 'spatial'] as const).map((m) => {
                const disabled = m === 'spatial' && !spatialReady;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => setLayout(m)}
                    title={disabled ? 'No feature centroids available yet' : `Switch to ${m} layout`}
                    style={{
                      padding: '2px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: layout === m ? 'rgba(220,160,90,0.22)' : 'transparent',
                      color: 'inherit',
                      font: 'inherit',
                      fontSize: '0.95em',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {m}
                  </button>
                );
              })}
              {layout === 'spatial' && (
                <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
                  N is up · vector length ≈ haul distance
                </span>
              )}
            </div>
            <svg
              role="img"
              aria-label="Closed-loop nutrient graph"
              viewBox={`0 0 ${W} ${H}`}
              style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.20)', borderRadius: 8 }}
            >
              <defs>
                <marker id="cl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.55)" />
                </marker>
              </defs>
              {vectors.map((v) => {
                const a = positions.get(v.fromFeatureId);
                const b = positions.get(v.toFeatureId);
                if (!a || !b) return null;
                return (
                  <line
                    key={v.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth={1.4}
                    markerEnd="url(#cl-arrow)"
                  />
                );
              })}
              {nodes.map((n) => {
                const p = positions.get(n.id)!;
                const isOrphan =
                  (n.kind === 'fertility' && (inDeg.get(n.id) ?? 0) === 0 && (outDeg.get(n.id) ?? 0) === 0);
                return (
                  <g key={n.id}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={9}
                      fill={KIND_COLOR[n.kind]}
                      stroke={isOrphan ? '#e08a4a' : 'rgba(0,0,0,0.4)'}
                      strokeWidth={isOrphan ? 2.4 : 1}
                    />
                    <text
                      x={p.x}
                      y={p.y - 13}
                      textAnchor="middle"
                      fontSize={9.5}
                      fill="rgba(255,255,255,0.85)"
                    >
                      {n.label.slice(0, 18)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className={styles.statRow}>
              <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(['zone', 'structure', 'crop', 'fertility'] as const).map((k) => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, background: KIND_COLOR[k], borderRadius: 5, display: 'inline-block' }} />
                    {k} ({counts[k]})
                  </span>
                ))}
              </span>
              <span>{vectors.length} vector(s)</span>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Validation</h2>
            <div className={styles.statRow}>
              <span>Orphan fertility units (no flows in or out)</span>
              <strong style={{ color: orphanFertility.length > 0 ? '#e08a4a' : undefined }}>
                {orphanFertility.length}
              </strong>
            </div>
            <div className={styles.statRow}>
              <span>Fertility units producing without feedstock (outgoing but no incoming)</span>
              <strong style={{ color: fertilityWithoutFeedstock.length > 0 ? '#e08a4a' : undefined }}>
                {fertilityWithoutFeedstock.length}
              </strong>
            </div>
            <div className={styles.statRow}>
              <span>Isolated zones / structures / crops (no flows)</span>
              <strong>{isolatedFeatures.length}</strong>
            </div>

            {(orphanFertility.length > 0 || fertilityWithoutFeedstock.length > 0) && (
              <>
                <h3 className={styles.sectionTitle} style={{ marginTop: 12, fontSize: '0.95em' }}>Fertility units to wire up</h3>
                <ul className={styles.list}>
                  {[...orphanFertility, ...fertilityWithoutFeedstock].map((n) => {
                    const isOrphan = orphanFertility.includes(n);
                    const fert = allFertility.find((f) => f.id === n.id);
                    const remedy = fert ? FERTILITY_REMEDY[fert.type] : null;
                    const fallback = isOrphan
                      ? 'No vectors — declare both a feedstock source and a destination.'
                      : 'Outgoing vector exists but no incoming feedstock — what fills this unit?';
                    return (
                      <li key={n.id} className={styles.listRow}>
                        <div>
                          <strong>{n.label}</strong>
                          <div className={styles.listMeta}>
                            {remedy
                              ? (isOrphan ? remedy.orphan : remedy.noFeedstock)
                              : fallback}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why this matters</h2>
        <p className={styles.lede}>
          A closed-loop site treats every output as someone&rsquo;s input.
          When a composter sits alone — no feedstock declared, no
          destination for finished compost — the steward is missing a flow
          that, in real life, will either fail to materialise or quietly
          leak waste off-site. The validation above doesn&rsquo;t fix the
          flow; it reveals the gap, so the steward can.
        </p>
      </section>
    </div>
  );
}
