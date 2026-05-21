/**
 * WasteVectorDashboardView — visual shell of the closed-loop dashboard.
 *
 * Read-mostly bento overview rendered when the user toggles the
 * Dashboard view inside the Module 5 "Waste-to-resource vectors" tab.
 * Sample data is hardcoded for the shell pass; wiring to closedLoopStore
 * / compostInventoryStore is the subject of a follow-up plan.
 */

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
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Pencil,
  FlaskConical,
  Download,
} from 'lucide-react';
import { MATERIAL_KIND_CONFIG } from '../../store/closedLoopStore.js';
import shared from '../../v3/_shared/stageCard/stageCard.module.css';
import styles from './WasteVectorDashboardView.module.css';

interface Props {
  onSwitchToList: () => void;
}

// SAMPLE DATA — replaced by store-derived selectors in a follow-up plan.

type Trend = 'up' | 'down';

interface Kpi {
  id: string;
  Icon: typeof Sprout;
  label: string;
  value: string;
  unit: string;
  cadence: string;
  delta: string;
  trend: Trend;
}

const KPIS: Kpi[] = [
  { id: 'organic',  Icon: Sprout,   label: 'Organic waste captured', value: '1,246', unit: 'kg', cadence: '/month', delta: '12% vs last month', trend: 'up' },
  { id: 'compost',  Icon: Recycle,  label: 'Compost output',         value: '842',   unit: 'kg', cadence: '/month', delta: '18% vs last month', trend: 'up' },
  { id: 'npk',      Icon: Leaf,     label: 'Nutrient recovery (NPK)', value: '92',    unit: '%',  cadence: 'efficiency', delta: '8% vs last month',  trend: 'up' },
  { id: 'water',    Icon: Droplets, label: 'Water reuse',            value: '1,580', unit: 'L',  cadence: '/day',   delta: '15% vs last month', trend: 'up' },
  { id: 'energy',   Icon: Zap,      label: 'Energy value',           value: '3.6',   unit: 'kWh', cadence: '/day',  delta: '9% vs last month',  trend: 'up' },
  { id: 'loop',     Icon: RefreshCw, label: 'Loop efficiency',       value: '84',    unit: '%',  cadence: 'overall', delta: '7% vs last month',  trend: 'up' },
];

interface Node {
  id: string;
  label: string;
  meta: string;
  kind: keyof typeof MATERIAL_KIND_CONFIG;
}

const SOURCES: Node[] = [
  { id: 'kitchen',  label: 'Kitchen scraps', meta: '245 kg/mo',  kind: 'organic_matter' },
  { id: 'manure',   label: 'Manure',         meta: '380 kg/mo',  kind: 'manure' },
  { id: 'greywater', label: 'Greywater',     meta: '1,580 L/day', kind: 'greywater' },
  { id: 'leaf',     label: 'Leaf litter',    meta: '310 kg/mo',  kind: 'organic_matter' },
];

const PROCESSORS: Node[] = [
  { id: 'compost',  label: 'Compost bays',   meta: 'Aerobic',      kind: 'compost' },
  { id: 'worm',     label: 'Worm bins',      meta: 'Vermicompost', kind: 'compost' },
  { id: 'mulch',    label: 'Mulch system',   meta: 'Sheet + woodchip', kind: 'mulch' },
  { id: 'wetland',  label: 'Constructed wetland', meta: 'Greywater', kind: 'greywater' },
];

const DESTINATIONS: Node[] = [
  { id: 'garden',   label: 'Garden beds',    meta: 'Vegetables',   kind: 'mulch' },
  { id: 'orchard',  label: 'Orchards',       meta: 'Fruit trees',  kind: 'compost' },
  { id: 'livestock', label: 'Livestock',     meta: 'Paddocks + coop', kind: 'grain' },
  { id: 'soil',     label: 'Soil building',  meta: 'SOM',          kind: 'organic_matter' },
];

interface Flow { from: string; to: string; kind: keyof typeof MATERIAL_KIND_CONFIG }

const FLOWS: Flow[] = [
  { from: 'kitchen',   to: 'compost',  kind: 'organic_matter' },
  { from: 'kitchen',   to: 'worm',     kind: 'organic_matter' },
  { from: 'manure',    to: 'compost',  kind: 'manure' },
  { from: 'manure',    to: 'mulch',    kind: 'manure' },
  { from: 'greywater', to: 'wetland',  kind: 'greywater' },
  { from: 'leaf',      to: 'mulch',    kind: 'organic_matter' },
  { from: 'leaf',      to: 'compost',  kind: 'organic_matter' },
  { from: 'compost',   to: 'garden',   kind: 'compost' },
  { from: 'compost',   to: 'orchard',  kind: 'compost' },
  { from: 'worm',      to: 'garden',   kind: 'compost' },
  { from: 'mulch',     to: 'orchard',  kind: 'mulch' },
  { from: 'mulch',     to: 'soil',     kind: 'organic_matter' },
  { from: 'wetland',   to: 'orchard',  kind: 'greywater' },
  { from: 'compost',   to: 'soil',     kind: 'organic_matter' },
];

const STREAM_INVENTORY = [
  { label: 'Total streams', value: 12, tone: 'met'  as const },
  { label: 'Active flows',  value: 28, tone: 'met'  as const },
  { label: 'Idle / seasonal', value: 4, tone: 'partial' as const },
  { label: 'At risk',       value: 2, tone: 'unmet' as const },
];

const PROCESSING_METHODS = [
  { label: 'Composting (aerobic)',    status: 'Active' },
  { label: 'Vermicomposting',         status: 'Active' },
  { label: 'Mulching',                status: 'Active' },
  { label: 'Anaerobic digestion',     status: 'Active' },
  { label: 'Constructed wetland',     status: 'Active' },
];

const RISKS = [
  { label: 'Excess nitrogen risk', severity: 'high' as const },
  { label: 'Greywater overload',   severity: 'medium' as const },
  { label: 'Seasonal leaf glut',   severity: 'medium' as const },
  { label: 'Manure storage',       severity: 'low' as const },
];

const INTERVENTIONS = [
  { label: 'Increase carbon inputs', impact: 'High' },
  { label: 'Expand mulch zones',     impact: 'High' },
  { label: 'Add willow to wetland',  impact: 'Medium' },
  { label: 'Cover manure piles',     impact: 'Low' },
];

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

export default function WasteVectorDashboardView({ onSwitchToList }: Props) {
  const sourceY  = Object.fromEntries(SOURCES.map((n, i) => [n.id, nodeY(i)]));
  const procY    = Object.fromEntries(PROCESSORS.map((n, i) => [n.id, nodeY(i)]));
  const destY    = Object.fromEntries(DESTINATIONS.map((n, i) => [n.id, nodeY(i)]));
  const yOf = (id: string): number => sourceY[id] ?? procY[id] ?? destY[id] ?? 0;
  const xOf = (id: string): number => {
    if (id in sourceY) return COL_X.source + 56;
    if (id in procY)   return COL_X.processor + 56;
    return COL_X.dest + 56;
  };
  const endX = (id: string): number => {
    if (id in procY)   return COL_X.processor - 56;
    if (id in destY)   return COL_X.dest - 56;
    return COL_X.source - 56;
  };

  return (
    <>
      {/* Panel 1 — KPI strip */}
      <section className={`${shared.section} ${styles.kpiSection}`}>
        <div className={styles.kpiGrid}>
          {KPIS.map(({ id, Icon, label, value, unit, cadence, delta, trend }) => (
            <div key={id} className={styles.kpi}>
              <div className={styles.kpiHead}>
                <Icon size={16} aria-hidden />
                <span className={styles.kpiLabel}>{label}</span>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{value}</span>
                <span className={styles.kpiUnit}>{unit}</span>
              </div>
              <div className={styles.kpiCadence}>{cadence}</div>
              <div className={`${styles.kpiDelta} ${trend === 'up' ? styles.kpiDeltaUp : styles.kpiDeltaDown}`}>
                {trend === 'up' ? <TrendingUp size={11} aria-hidden /> : <TrendingDown size={11} aria-hidden />}
                <span>{delta}</span>
              </div>
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
        <div className={styles.flowMapWrap}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="xMidYMid meet"
            className={styles.flowSvg}
            role="img"
            aria-label="Sample resource flow map showing sources, processors and destinations"
          >
            {/* Column headers */}
            <text x={COL_X.source} y={20}    className={styles.flowColHead} textAnchor="middle">Sources (inputs)</text>
            <text x={COL_X.processor} y={20} className={styles.flowColHead} textAnchor="middle">Processing nodes</text>
            <text x={COL_X.dest} y={20}      className={styles.flowColHead} textAnchor="middle">Destinations (outputs)</text>

            {/* Flow paths */}
            {FLOWS.map((f, i) => (
              <path
                key={`f-${i}`}
                d={curve(xOf(f.from), yOf(f.from), endX(f.to), yOf(f.to))}
                stroke={MATERIAL_KIND_CONFIG[f.kind].color}
                strokeWidth={1.6}
                strokeOpacity={0.55}
                fill="none"
              />
            ))}

            {/* Source nodes */}
            {SOURCES.map((n, i) => (
              <g key={n.id} transform={`translate(${COL_X.source}, ${nodeY(i)})`}>
                <rect x={-56} y={-22} width={112} height={44} rx={6} className={styles.flowNodeRect} />
                <text x={0} y={-3} className={styles.flowNodeLabel} textAnchor="middle">{n.label}</text>
                <text x={0} y={12} className={styles.flowNodeMeta} textAnchor="middle">{n.meta}</text>
              </g>
            ))}

            {/* Processor nodes */}
            {PROCESSORS.map((n, i) => (
              <g key={n.id} transform={`translate(${COL_X.processor}, ${nodeY(i)})`}>
                <rect x={-56} y={-22} width={112} height={44} rx={6} className={styles.flowNodeRect} data-emph="true" />
                <text x={0} y={-3} className={styles.flowNodeLabel} textAnchor="middle">{n.label}</text>
                <text x={0} y={12} className={styles.flowNodeMeta} textAnchor="middle">{n.meta}</text>
              </g>
            ))}

            {/* Destination nodes */}
            {DESTINATIONS.map((n, i) => (
              <g key={n.id} transform={`translate(${COL_X.dest}, ${nodeY(i)})`}>
                <rect x={-56} y={-22} width={112} height={44} rx={6} className={styles.flowNodeRect} />
                <text x={0} y={-3} className={styles.flowNodeLabel} textAnchor="middle">{n.label}</text>
                <text x={0} y={12} className={styles.flowNodeMeta} textAnchor="middle">{n.meta}</text>
              </g>
            ))}

            {/* Loop-efficiency badge */}
            <g transform={`translate(${SVG_W - 72}, ${SVG_H - 72})`}>
              <circle r={36} className={styles.loopBadgeBg} />
              <text y={-2} textAnchor="middle" className={styles.loopBadgeValue}>84%</text>
              <text y={14} textAnchor="middle" className={styles.loopBadgeLabel}>Loop eff.</text>
            </g>
          </svg>
        </div>
      </section>

      {/* Panel 3 — Stream inventory + Processing methods */}
      <div className={styles.twoCol}>
        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Stream inventory</h2>
          <ul className={styles.metaList}>
            {STREAM_INVENTORY.map((row) => (
              <li key={row.label} className={styles.metaRow}>
                <span className={styles.metaIcon}>
                  {row.tone === 'met'     && <CircleCheck size={14} className={styles.toneMet} aria-hidden />}
                  {row.tone === 'partial' && <CircleDot   size={14} className={styles.tonePartial} aria-hidden />}
                  {row.tone === 'unmet'   && <AlertTriangle size={14} className={styles.toneUnmet} aria-hidden />}
                </span>
                <span className={styles.metaLabel}>{row.label}</span>
                <span className={styles.metaValue}>{row.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Processing methods</h2>
          <ul className={styles.metaList}>
            {PROCESSING_METHODS.map((m) => (
              <li key={m.label} className={styles.metaRow}>
                <span className={styles.metaLabel}>{m.label}</span>
                <span className={`${shared.pill} ${shared.pillMet}`}>{m.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Panel 4 — Risks + Recommended interventions */}
      <div className={styles.twoCol}>
        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Risks &amp; constraints</h2>
          <ul className={styles.metaList}>
            {RISKS.map((r) => (
              <li key={r.label} className={styles.metaRow}>
                <span className={styles.metaIcon}><AlertTriangle size={14} className={r.severity === 'high' ? styles.toneUnmet : styles.tonePartial} aria-hidden /></span>
                <span className={styles.metaLabel}>{r.label}</span>
                <span className={`${shared.pill} ${r.severity === 'high' ? shared.pillUnmet : r.severity === 'medium' ? shared.pillPartial : shared.pill}`}>
                  {r.severity}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Recommended interventions</h2>
          <ul className={styles.metaList}>
            {INTERVENTIONS.map((i) => (
              <li key={i.label} className={styles.metaRow}>
                <span className={styles.metaLabel}>{i.label}</span>
                <span className={`${shared.pill} ${i.impact === 'High' ? shared.pillMet : i.impact === 'Medium' ? shared.pillPartial : shared.pill}`}>
                  {i.impact} impact
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Panel 5 — Closed-loop scenarios */}
      <section className={shared.section}>
        <div className={styles.flowHead}>
          <h2 className={shared.sectionTitle}>Closed-loop scenarios</h2>
          <span className={styles.hint}>Sample · swipe to compare</span>
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
