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

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useClosedLoopStore } from '../../../../store/closedLoopStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useStructureStore } from '../../../../store/structureStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import styles from '../../../../features/plan/planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface Node {
  id: string;
  label: string;
  kind: 'zone' | 'structure' | 'crop' | 'fertility';
}

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
  const allStructures = useStructureStore((s) => s.structures);
  const allCrops = useCropStore((s) => s.cropAreas);

  const { nodes, vectors } = useMemo(() => {
    const pId = project.id;
    const ns: Node[] = [];
    for (const z of allZones) if (z.projectId === pId) ns.push({ id: z.id, label: z.name || z.category, kind: 'zone' });
    for (const s of allStructures) if (s.projectId === pId) ns.push({ id: s.id, label: s.name || s.type, kind: 'structure' });
    for (const c of allCrops) if (c.projectId === pId) ns.push({ id: c.id, label: (c as { name?: string }).name ?? 'crop area', kind: 'crop' });
    for (const f of allFertility) if (f.projectId === pId) ns.push({ id: f.id, label: `${f.type}${f.scaleNote ? ` (${f.scaleNote})` : ''}`, kind: 'fertility' });
    const vs = allVectors.filter((v) => v.projectId === pId);
    return { nodes: ns, vectors: vs };
  }, [project.id, allZones, allStructures, allCrops, allFertility, allVectors]);

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

  // SVG layout: ring layout — nodes spaced around a circle, edges as straight lines.
  const W = 560, H = 360;
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.36;
  const positions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    const n = Math.max(nodes.length, 1);
    nodes.forEach((node, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      m.set(node.id, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    });
    return m;
  }, [nodes, cx, cy, r]);

  const counts = useMemo(() => {
    const c = { zone: 0, structure: 0, crop: 0, fertility: 0 } as Record<Node['kind'], number>;
    for (const n of nodes) c[n.kind]++;
    return c;
  }, [nodes]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
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
                  {[...orphanFertility, ...fertilityWithoutFeedstock].map((n) => (
                    <li key={n.id} className={styles.listRow}>
                      <div>
                        <strong>{n.label}</strong>
                        <div className={styles.listMeta}>
                          {orphanFertility.includes(n)
                            ? 'No vectors — declare both a feedstock source and a destination.'
                            : 'Outgoing vector exists but no incoming feedstock — what fills this unit?'}
                        </div>
                      </div>
                    </li>
                  ))}
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
