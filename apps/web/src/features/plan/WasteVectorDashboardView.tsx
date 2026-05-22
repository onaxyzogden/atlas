/**
 * WasteVectorDashboardView — the closed-loop dashboard.
 *
 * Read-mostly bento overview rendered when the user toggles the Dashboard
 * view inside the Module 5 "Waste-to-resource vectors" tab. Every panel
 * except the scenarios row is derived live from project-scoped
 * `materialFlows` + `fertilityInfra` via stable selectors + `useMemo`
 * (selector-stability rule, 2026-04-26). Risks/interventions share the
 * `useClosedLoopValidation` hook with `ClosedLoopGraphCard` so the two
 * surfaces can never report different counts. The scenarios row stays
 * sample-backed (scenarioStore has no closed-loop snapshot).
 */

import { useMemo } from 'react';
import {
  Sprout,
  Recycle,
  Leaf,
  Droplets,
  Zap,
  RefreshCw,
  AlertTriangle,
  CircleCheck,
  CircleDot,
  ChevronRight,
  Pencil,
  FlaskConical,
  Download,
} from 'lucide-react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useClosedLoopStore,
  MATERIAL_KIND_CONFIG,
  type MaterialFlow,
  type MaterialKind,
  type FertilityInfraType,
} from '../../store/closedLoopStore.js';
import { useFlowEndpointOptions } from './useFlowEndpointOptions.js';
import { useClosedLoopValidation } from './useClosedLoopValidation.js';
import shared from '../../v3/_shared/stageCard/stageCard.module.css';
import styles from './WasteVectorDashboardView.module.css';

interface Props {
  project: LocalProject;
  onSwitchToList: () => void;
}

// ── Derivation helpers (pure) ───────────────────────────────────────────────

/** Fold an optional numeric field over a flow list, treating missing as 0. */
function sum(fs: MaterialFlow[], pick: (f: MaterialFlow) => number | undefined): number {
  return fs.reduce((acc, f) => acc + (pick(f) ?? 0), 0);
}

/** Loop efficiency = share of flows with both endpoints pinned, as a 0–100 %. */
function efficiency(fs: MaterialFlow[]): number {
  if (fs.length === 0) return 0;
  const closed = fs.filter((f) => f.sourceId && f.sinkId).length;
  return Math.round((closed / fs.length) * 100);
}

/** Compact number format: integers get thousands separators; fractions ≤1 dp. */
function fmt(n: number): string {
  return n % 1 === 0
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Human label for a flow endpoint: pinned-feature name → free-text → placeholder. */
function resolveEndpoint(
  id: string | null,
  fallback: string | undefined,
  labelById: Map<string, string>,
): string {
  if (id && labelById.has(id)) return labelById.get(id)!;
  if (fallback) return fallback;
  return '(unpinned)';
}

/** Stream-inventory unit by material kind. */
function streamUnit(kind: MaterialKind): string {
  return kind === 'water' || kind === 'greywater' ? 'L/mo' : 'kg/mo';
}

const plural = (n: number): string => (n === 1 ? '' : 's');

type Severity = 'high' | 'medium' | 'low';

/** Rules-based remedy per risk category (static; no store). */
const RISK_TO_INTERVENTION: Record<string, { label: string; impact: 'High' | 'Medium' }> = {
  'orphan-fertility':       { label: 'Wire feedstock + a destination into orphaned fertility units', impact: 'High' },
  'fertility-no-feedstock': { label: 'Declare an incoming feedstock for outgoing-only units',         impact: 'Medium' },
  'dangling-water':         { label: 'Route water / greywater outflow into a reuse sink',             impact: 'High' },
  'dangling-flow':          { label: 'Pin an endpoint for free-floating flows',                       impact: 'Medium' },
  'isolated-zone':          { label: 'Connect isolated features via a material vector',               impact: 'Medium' },
};

interface FNode {
  id: string;
  label: string;
  meta: string;
  x: number;
  y: number;
}

interface Kpi {
  id: string;
  Icon: typeof Sprout;
  label: string;
  /** Formatted value, or '—' when the field carries no data yet. */
  value: string;
  /** Suffix unit; '' when the value is the em-dash placeholder. */
  unit: string;
  cadence: string;
}

// SAMPLE DATA — the scenarios row stays sample-backed (scenarioStore has no
// closed-loop snapshot); every other panel is now store-derived below.

const SCENARIOS = [
  { id: 'regen-max', name: 'Regenerative max', blurb: 'Balanced for fertility & biomass', eff: 84, inputs: '1,246 kg/mo', outputs: '842 kg/mo' },
  { id: 'low-input', name: 'Low input',        blurb: 'Minimal hauling, deep mulch',     eff: 71, inputs: '980 kg/mo',  outputs: '610 kg/mo' },
  { id: 'water-led', name: 'Water-led',        blurb: 'Greywater into the orchard band', eff: 78, inputs: '1,820 L/day', outputs: '680 kg/mo' },
  { id: 'livestock', name: 'Livestock-led',    blurb: 'Manure feeds the compost stack',  eff: 80, inputs: '1,310 kg/mo', outputs: '790 kg/mo' },
  { id: 'season',    name: 'Seasonal pulse',   blurb: 'Spring/fall biomass surges',       eff: 76, inputs: '1,420 kg/mo', outputs: '720 kg/mo' },
];

// ── Geometry helpers for the flow-map SVG ───────────────────────────────────

const SVG_W = 820;
const SVG_H = 360;
const COL_X = { source: 110, processor: 410, dest: 710 } as const;
const ROW_TOP = 40;
const ROW_GAP = 70;

function nodeY(index: number): number {
  return ROW_TOP + index * ROW_GAP;
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) * 0.55;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function WasteVectorDashboardView({ project, onSwitchToList }: Props) {
  // Raw slices — derive project-scoped views in useMemo (selector stability).
  const allFlows = useClosedLoopStore((s) => s.materialFlows);
  const allInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const flows = useMemo(
    () => allFlows.filter((f) => f.projectId === project.id),
    [allFlows, project.id],
  );
  const projectInfra = useMemo(
    () => allInfra.filter((i) => i.projectId === project.id),
    [allInfra, project.id],
  );
  const endpointOptions = useFlowEndpointOptions(project.id);
  const validation = useClosedLoopValidation(project);
  const loopEff = efficiency(flows);

  // ── KPI strip — six store-derived chips ───────────────────────────────────
  const kpis = useMemo<Kpi[]>(() => {
    const isOrganic = (f: MaterialFlow) =>
      f.materialKind === 'organic_matter' || f.materialKind === 'manure' || f.materialKind === 'mulch';
    const isWater = (f: MaterialFlow) => f.materialKind === 'water' || f.materialKind === 'greywater';
    const isCompost = (f: MaterialFlow) => f.materialKind === 'compost';
    const isEnergy = (f: MaterialFlow) => f.materialKind === 'energy';

    const organicTotal = sum(flows.filter(isOrganic), (f) => f.massKgPerMonth);
    const organicHas = flows.some((f) => isOrganic(f) && f.massKgPerMonth != null);

    const compostTotal = sum(flows.filter(isCompost), (f) => f.massKgPerMonth);
    const compostHas = flows.some((f) => isCompost(f) && f.massKgPerMonth != null);

    const npkTotal = sum(
      flows.filter(isCompost),
      (f) => (f.nutrientNKgPerMonth ?? 0) + (f.nutrientPKgPerMonth ?? 0) + (f.nutrientKKgPerMonth ?? 0),
    );
    const npkHas = flows.some(
      (f) =>
        isCompost(f) &&
        (f.nutrientNKgPerMonth != null || f.nutrientPKgPerMonth != null || f.nutrientKKgPerMonth != null),
    );

    const waterTotal = sum(flows.filter(isWater), (f) => f.volumeLPerMonth);
    const waterHas = flows.some((f) => isWater(f) && f.volumeLPerMonth != null);

    const energyTotal = sum(flows.filter(isEnergy), (f) => f.energyKwhPerMonth);
    const energyHas = flows.some((f) => isEnergy(f) && f.energyKwhPerMonth != null);

    const mk = (
      id: string,
      Icon: typeof Sprout,
      label: string,
      cadence: string,
      total: number,
      unit: string,
      has: boolean,
    ): Kpi => ({ id, Icon, label, cadence, value: has ? fmt(total) : '—', unit: has ? unit : '' });

    return [
      mk('organic', Sprout, 'Organic waste captured', 'per month', organicTotal, 'kg/mo', organicHas),
      mk('compost', Recycle, 'Compost output', 'per month', compostTotal, 'kg/mo', compostHas),
      mk('npk', Leaf, 'NPK recovery', 'per month', npkTotal, 'kg/mo', npkHas),
      mk('water', Droplets, 'Water reuse', 'per month', waterTotal, 'L/mo', waterHas),
      mk('energy', Zap, 'Energy value', 'per month', energyTotal, 'kWh/mo', energyHas),
      {
        id: 'loop',
        Icon: RefreshCw,
        label: 'Loop efficiency',
        cadence: 'closed flows',
        value: flows.length > 0 ? String(loopEff) : '—',
        unit: flows.length > 0 ? '%' : '',
      },
    ];
  }, [flows, loopEff]);

  // ── Stream inventory — one row per material kind present ───────────────────
  const streamRows = useMemo(() => {
    const totals = new Map<MaterialKind, number>();
    for (const f of flows) {
      const v = f.massKgPerMonth ?? f.volumeLPerMonth ?? 0;
      totals.set(f.materialKind, (totals.get(f.materialKind) ?? 0) + v);
    }
    return [...totals.entries()]
      .map(([kind, value]) => ({
        kind,
        label: MATERIAL_KIND_CONFIG[kind].label,
        value,
        tone: value > 0 ? ('met' as const) : ('partial' as const),
      }))
      .sort((a, b) => b.value - a.value);
  }, [flows]);

  // ── Flow-map adjacency — stable Bézier positions across re-renders ─────────
  const flowGraph = useMemo(() => {
    const labelById = new Map<string, string>();
    for (const o of endpointOptions) {
      const idx = o.label.indexOf(' · ');
      labelById.set(o.id, idx >= 0 ? o.label.slice(idx + 3) : o.label);
    }
    const procIds = new Set(projectInfra.map((i) => i.id));
    const hasProc = projectInfra.length > 0;

    const sources = new Map<string, FNode>();
    const processors = new Map<string, FNode>();
    const dests = new Map<string, FNode>();

    // Pre-seed processor column from fertility infra (3-column mode).
    if (hasProc)
      for (const inf of projectInfra)
        processors.set(inf.id, {
          id: inf.id,
          label: labelById.get(inf.id) ?? inf.type.replace(/_/g, ' '),
          meta: '',
          x: 0,
          y: 0,
        });

    const keyOf = (id: string | null, label: string) => id ?? `txt:${label}`;
    interface Edge { fromKey: string; toKey: string; kind: MaterialKind }
    const edges: Edge[] = [];

    for (const f of flows) {
      const srcLabel = resolveEndpoint(f.sourceId, f.sourceLabel, labelById);
      const dstLabel = resolveEndpoint(f.sinkId, f.sinkLabel, labelById);
      const srcKey = keyOf(f.sourceId, srcLabel);
      const dstKey = keyOf(f.sinkId, dstLabel);
      const srcIsProc = hasProc && f.sourceId != null && procIds.has(f.sourceId);
      const dstIsProc = hasProc && f.sinkId != null && procIds.has(f.sinkId);

      if (!srcIsProc && !sources.has(srcKey))
        sources.set(srcKey, { id: srcKey, label: srcLabel, meta: '', x: 0, y: 0 });
      if (!dstIsProc && !dests.has(dstKey))
        dests.set(dstKey, { id: dstKey, label: dstLabel, meta: '', x: 0, y: 0 });
      edges.push({ fromKey: srcKey, toKey: dstKey, kind: f.materialKind });
    }

    const place = (map: Map<string, FNode>, x: number): FNode[] => {
      const arr = [...map.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(0, 8);
      arr.forEach((n, i) => {
        n.x = x;
        n.y = nodeY(i);
      });
      return arr;
    };
    const srcNodes = place(sources, COL_X.source);
    const procNodes = hasProc ? place(processors, COL_X.processor) : [];
    const dstNodes = place(dests, hasProc ? COL_X.dest : COL_X.processor);

    const pos = new Map<string, FNode>();
    for (const n of [...srcNodes, ...procNodes, ...dstNodes]) pos.set(n.id, n);
    const renderEdges = edges
      .filter((e) => pos.has(e.fromKey) && pos.has(e.toKey))
      .map((e) => {
        const a = pos.get(e.fromKey)!;
        const b = pos.get(e.toKey)!;
        return { d: curve(a.x + 56, a.y, b.x - 56, b.y), color: MATERIAL_KIND_CONFIG[e.kind].color };
      });

    const maxRows = Math.max(srcNodes.length, procNodes.length, dstNodes.length, 1);
    const height = Math.max(220, ROW_TOP + maxRows * ROW_GAP + 20);
    return { srcNodes, procNodes, dstNodes, edges: renderEdges, hasProc, height };
  }, [flows, projectInfra, endpointOptions]);

  // ── Processing methods — one row per fertility infra type ──────────────────
  const processingRows = useMemo(() => {
    const counts = new Map<FertilityInfraType, number>();
    for (const inf of projectInfra) counts.set(inf.type, (counts.get(inf.type) ?? 0) + 1);
    return [...counts.entries()]
      .map(([type, count]) => ({ type, label: type.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [projectInfra]);

  // ── Risks — shared validation surface (parity with ClosedLoopGraphCard) ────
  const riskRows = useMemo(() => {
    const { orphanFertility, fertilityWithoutFeedstock, isolatedFeatures, vectors } = validation;
    const dangling = vectors.filter((v) => !v.sourceId || !v.sinkId);
    const danglingWater = dangling.filter(
      (v) => v.materialKind === 'water' || v.materialKind === 'greywater',
    );
    const danglingOther = dangling.filter(
      (v) => v.materialKind !== 'water' && v.materialKind !== 'greywater',
    );
    const rows: { id: string; label: string; severity: Severity }[] = [];
    if (orphanFertility.length > 0)
      rows.push({
        id: 'orphan-fertility',
        label: `${orphanFertility.length} orphan fertility unit${plural(orphanFertility.length)}`,
        severity: 'medium',
      });
    if (fertilityWithoutFeedstock.length > 0)
      rows.push({
        id: 'fertility-no-feedstock',
        label: `${fertilityWithoutFeedstock.length} fertility unit${plural(
          fertilityWithoutFeedstock.length,
        )} without feedstock`,
        severity: 'medium',
      });
    if (danglingWater.length > 0)
      rows.push({
        id: 'dangling-water',
        label: `${danglingWater.length} dangling water flow${plural(danglingWater.length)}`,
        severity: 'high',
      });
    if (danglingOther.length > 0)
      rows.push({
        id: 'dangling-flow',
        label: `${danglingOther.length} dangling flow${plural(danglingOther.length)}`,
        severity: 'medium',
      });
    if (isolatedFeatures.length > 0)
      rows.push({
        id: 'isolated-zone',
        label: `${isolatedFeatures.length} isolated feature${plural(isolatedFeatures.length)}`,
        severity: 'low',
      });
    return rows.slice(0, 4);
  }, [validation]);

  const interventionRows = useMemo(
    () => riskRows.map((r) => ({ id: r.id, ...RISK_TO_INTERVENTION[r.id]! })),
    [riskRows],
  );

  const sevPill = (s: Severity): string =>
    (s === 'high' ? shared.pillUnmet : s === 'medium' ? shared.pillPartial : shared.pill) ?? '';

  return (
    <>
      {/* Panel 1 — KPI strip */}
      <section className={`${shared.section} ${styles.kpiSection}`}>
        <div className={styles.kpiGrid}>
          {kpis.map(({ id, Icon, label, value, unit, cadence }) => (
            <div key={id} className={styles.kpi}>
              <div className={styles.kpiHead}>
                <Icon size={16} aria-hidden />
                <span className={styles.kpiLabel}>{label}</span>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{value}</span>
                {unit && <span className={styles.kpiUnit}>{unit}</span>}
              </div>
              <div className={styles.kpiCadence}>{cadence}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Panel 2 — Resource flow map */}
      <section className={shared.section}>
        <div className={styles.flowHead}>
          <h2 className={shared.sectionTitle}>Resource flow map</h2>
          <ul className={styles.legend} aria-label="Material legend">
            <li><span className={styles.legendSwatch} style={{ background: MATERIAL_KIND_CONFIG.organic_matter.color }} /> Organics</li>
            <li><span className={styles.legendSwatch} style={{ background: MATERIAL_KIND_CONFIG.manure.color }} /> Nutrients</li>
            <li><span className={styles.legendSwatch} style={{ background: MATERIAL_KIND_CONFIG.greywater.color }} /> Water</li>
            <li><span className={styles.legendSwatch} style={{ background: MATERIAL_KIND_CONFIG.energy.color }} /> Energy</li>
          </ul>
        </div>
        {flows.length === 0 ? (
          <p className={shared.empty}>Add waste vectors to populate this panel.</p>
        ) : (
          <div className={styles.flowMapWrap}>
            <svg
              viewBox={`0 0 ${SVG_W} ${flowGraph.height}`}
              preserveAspectRatio="xMidYMid meet"
              className={styles.flowSvg}
              role="img"
              aria-label="Resource flow map showing sources, processing nodes and destinations"
            >
              {/* Column headers */}
              <text x={COL_X.source} y={20} className={styles.flowColHead} textAnchor="middle">Sources (inputs)</text>
              {flowGraph.hasProc && (
                <text x={COL_X.processor} y={20} className={styles.flowColHead} textAnchor="middle">Processing nodes</text>
              )}
              <text x={flowGraph.hasProc ? COL_X.dest : COL_X.processor} y={20} className={styles.flowColHead} textAnchor="middle">Destinations (outputs)</text>

              {/* Flow paths */}
              {flowGraph.edges.map((e, i) => (
                <path
                  key={`f-${i}`}
                  d={e.d}
                  stroke={e.color}
                  strokeWidth={1.6}
                  strokeOpacity={0.55}
                  fill="none"
                />
              ))}

              {/* Source nodes */}
              {flowGraph.srcNodes.map((n) => (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <rect x={-56} y={-22} width={112} height={44} rx={6} className={styles.flowNodeRect} />
                  <text x={0} y={4} className={styles.flowNodeLabel} textAnchor="middle">{n.label}</text>
                </g>
              ))}

              {/* Processor nodes */}
              {flowGraph.procNodes.map((n) => (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <rect x={-56} y={-22} width={112} height={44} rx={6} className={styles.flowNodeRect} data-emph="true" />
                  <text x={0} y={4} className={styles.flowNodeLabel} textAnchor="middle">{n.label}</text>
                </g>
              ))}

              {/* Destination nodes */}
              {flowGraph.dstNodes.map((n) => (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <rect x={-56} y={-22} width={112} height={44} rx={6} className={styles.flowNodeRect} />
                  <text x={0} y={4} className={styles.flowNodeLabel} textAnchor="middle">{n.label}</text>
                </g>
              ))}

              {/* Loop-efficiency badge */}
              <g transform={`translate(${SVG_W - 72}, ${flowGraph.height - 72})`}>
                <circle r={36} className={styles.loopBadgeBg} />
                <text y={-2} textAnchor="middle" className={styles.loopBadgeValue}>{loopEff}%</text>
                <text y={14} textAnchor="middle" className={styles.loopBadgeLabel}>Loop eff.</text>
              </g>
            </svg>
          </div>
        )}
      </section>

      {/* Panel 3 — Stream inventory + Processing methods */}
      <div className={styles.twoCol}>
        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Stream inventory</h2>
          {streamRows.length === 0 ? (
            <p className={shared.empty}>Add waste vectors to populate this panel.</p>
          ) : (
            <ul className={styles.metaList}>
              {streamRows.slice(0, 6).map((row) => (
                <li key={row.kind} className={styles.metaRow}>
                  <span className={styles.metaIcon}>
                    {row.tone === 'met' ? (
                      <CircleCheck size={14} className={styles.toneMet} aria-hidden />
                    ) : (
                      <CircleDot size={14} className={styles.tonePartial} aria-hidden />
                    )}
                  </span>
                  <span className={styles.metaLabel}>{row.label}</span>
                  <span className={styles.metaValue}>{fmt(row.value)} {streamUnit(row.kind)}</span>
                </li>
              ))}
              {streamRows.length > 6 && (
                <li className={styles.metaRow}>
                  <span className={styles.metaIcon} />
                  <span className={styles.metaLabel}>+{streamRows.length - 6} more stream{plural(streamRows.length - 6)}</span>
                  <span className={styles.metaValue} />
                </li>
              )}
            </ul>
          )}
        </section>

        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Processing methods</h2>
          {processingRows.length === 0 ? (
            <p className={shared.empty}>No fertility infrastructure placed yet.</p>
          ) : (
            <ul className={styles.metaList}>
              {processingRows.map((m) => (
                <li key={m.type} className={styles.metaRow}>
                  <span className={styles.metaLabel}>{m.label}</span>
                  <span className={`${shared.pill} ${shared.pillMet}`}>Active · {m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Panel 4 — Risks + Recommended interventions */}
      <div className={styles.twoCol}>
        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Risks &amp; constraints</h2>
          {riskRows.length === 0 ? (
            <p className={shared.empty}>No closed-loop issues detected.</p>
          ) : (
            <ul className={styles.metaList}>
              {riskRows.map((r) => (
                <li key={r.id} className={styles.metaRow}>
                  <span className={styles.metaIcon}>
                    <AlertTriangle
                      size={14}
                      className={r.severity === 'high' ? styles.toneUnmet : r.severity === 'medium' ? styles.tonePartial : styles.metaLabel}
                      aria-hidden
                    />
                  </span>
                  <span className={styles.metaLabel}>{r.label}</span>
                  <span className={`${shared.pill} ${sevPill(r.severity)}`}>{r.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Recommended interventions</h2>
          {interventionRows.length === 0 ? (
            <p className={shared.empty}>No closed-loop issues detected.</p>
          ) : (
            <ul className={styles.metaList}>
              {interventionRows.map((i) => (
                <li key={i.id} className={styles.metaRow}>
                  <span className={styles.metaLabel}>{i.label}</span>
                  <span className={`${shared.pill} ${i.impact === 'High' ? shared.pillMet : shared.pillPartial}`}>
                    {i.impact} impact
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Panel 5 — Closed-loop scenarios (sample) */}
      <section className={shared.section}>
        <div className={styles.flowHead}>
          <h2 className={shared.sectionTitle}>Closed-loop scenarios</h2>
          <span className={styles.hint}>(sample) · swipe to compare</span>
        </div>
        <div className={styles.scenarioRow}>
          {SCENARIOS.map((s) => (
            <article key={s.id} className={styles.scenario}>
              <div className={styles.scenarioHead}>
                <h3 className={styles.scenarioName}>{s.name}</h3>
                <span className={styles.scenarioEff}>{s.eff}%</span>
              </div>
              <p className={styles.scenarioBlurb}>{s.blurb}</p>
              <div className={styles.scenarioStats}>
                <div><span>Inputs</span><strong>{s.inputs}</strong></div>
                <div><span>Outputs</span><strong>{s.outputs}</strong></div>
              </div>
              <button type="button" className={styles.scenarioLink}>
                Compare <ChevronRight size={12} aria-hidden />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Panel 6 — Footer action bar */}
      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={onSwitchToList}>
          <Pencil size={14} aria-hidden /> Edit vectors
        </button>
        <button type="button" className={styles.actionBtn} disabled title="Coming soon">
          <FlaskConical size={14} aria-hidden /> Run simulations
        </button>
        <button type="button" className={styles.actionBtn} disabled title="Coming soon">
          <Download size={14} aria-hidden /> Export closed-loop report
        </button>
      </div>
    </>
  );
}
