import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  ArrowRight,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { ProgressRing, SurfaceCard } from '../../_shared/components/index.js';
import {
  makeHazardId,
  useHazardsStore,
  type Hazard,
  type HazardKind,
  type HazardRisk,
  type HazardStatus,
  type HazardTrend,
} from '../../../../store/hazardsStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import HazardRiskMatrix from './HazardRiskMatrix.js';
import HazardHotspotsMap from './HazardHotspotsMap.js';
import {
  hazardCounts,
  riskLabel,
  statusLabel,
  topRiskPriorities,
} from './derivations.js';

const KIND_OPTIONS: HazardKind[] = [
  'frost',
  'storm',
  'drought',
  'flood',
  'fire',
  'wind',
  'erosion',
  'other',
];
const RISK_OPTIONS: HazardRisk[] = ['low', 'moderate', 'high'];
const TREND_OPTIONS: HazardTrend[] = ['down', 'flat', 'up'];
const STATUS_OPTIONS: HazardStatus[] = ['monitoring', 'planned', 'in_progress', 'mitigated'];

export default function HazardsLogDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);

  const ensureDefaults = useHazardsStore((s) => s.ensureDefaults);
  const addHazard = useHazardsStore((s) => s.addHazard);
  const updateHazard = useHazardsStore((s) => s.updateHazard);
  const removeHazard = useHazardsStore((s) => s.removeHazard);
  const allByProject = useHazardsStore((s) => s.byProject);
  const hazards = useMemo(
    () => allByProject.find((p) => p.projectId === id)?.hazards ?? [],
    [allByProject, id],
  );

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  const counts = hazardCounts(hazards);
  const priorities = topRiskPriorities(hazards).slice(0, 3);

  return (
    <div className="detail-page hazards-log-page">
      <HazardsHeader />
      <HazardKpis counts={counts} />
      <section className="hazards-top-grid">
        <HazardsOverview
          rows={hazards}
          onUpdate={(hid, patch) => updateHazard(id, hid, patch)}
          onRemove={(hid) => removeHazard(id, hid)}
        />
        <SurfaceCard className="hazard-panel risk-matrix-panel">
          <h2>Risk matrix</h2>
          <HazardRiskMatrix hazards={hazards} />
        </SurfaceCard>
        <SurfaceCard className="hazard-panel hotspots-panel">
          <h2>Hazard hotspots</h2>
          <HazardHotspotsMap
            boundary={project?.location?.boundary}
            caption={project?.name}
            hazards={hazards}
          />
        </SurfaceCard>
      </section>
      <AddHazardForm onAdd={(h) => addHazard(id, h)} />
      <section className="hazards-bottom-grid">
        <PriorityActions priorities={priorities} />
      </section>
    </div>
  );
}

function HazardsHeader() {
  return (
    <header className="hazards-header">
      <div>
        <div className="hazards-title-row">
          <TriangleAlert aria-hidden="true" />
          <div>
            <h1>Hazards log</h1>
            <p>
              Track site risks, seasonal threats and mitigation readiness. Use this log to
              prioritize actions, reduce losses and build resilience across your design zones.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

interface HazardKpisProps {
  counts: ReturnType<typeof hazardCounts>;
}

function HazardKpis({ counts }: HazardKpisProps) {
  const items: Array<[typeof TriangleAlert | typeof ShieldCheck, string, string, string, string]> = [
    [ShieldCheck, 'Logged hazards', String(counts.total), 'Across all zones', 'green'],
    [TriangleAlert, 'High priority', String(counts.highRisk), 'Requires attention', counts.highRisk > 0 ? 'red' : 'dim'],
    [TriangleAlert, 'Moderate', String(counts.moderateRisk), 'Monitor & manage', 'gold'],
    [ShieldCheck, 'Mitigated', String(counts.mitigated), 'Resolved hazards', 'green'],
    [ShieldCheck, 'Avg coverage', `${counts.averageMitigationPct}%`, 'Mitigation in place', 'green'],
  ];

  return (
    <section className="hazard-kpi-grid">
      {items.map(([Icon, label, value, note, tone]) => (
        <SurfaceCard className={`hazard-kpi ${tone}`} key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{counts.total === 0 ? '—' : value}</strong>
          <small>{note}</small>
        </SurfaceCard>
      ))}
    </section>
  );
}

interface HazardsOverviewProps {
  rows: Hazard[];
  onUpdate: (id: string, patch: Partial<Omit<Hazard, 'id' | 'createdAt'>>) => void;
  onRemove: (id: string) => void;
}

function HazardsOverview({ rows, onUpdate, onRemove }: HazardsOverviewProps) {
  return (
    <SurfaceCard className="hazard-panel hazards-overview-panel">
      <h2>Hazards overview</h2>
      {rows.length === 0 ? (
        <p className="empty-note">No hazards logged yet — add one below.</p>
      ) : (
        <>
          <div className="hazards-table-head">
            <span>Hazard</span>
            <span>Risk</span>
            <span>Trend</span>
            <span>Window</span>
            <span>Status</span>
            <span>Coverage</span>
          </div>
          {rows.map((h, index) => (
            <article className="hazard-row" key={h.id}>
              <b>{index + 1}</b>
              <div>
                <strong>{h.label}</strong>
                <small>{h.kind}</small>
              </div>
              <em>{riskLabel(h.risk)}</em>
              <em>{h.trend}</em>
              <span>{h.window ?? '—'}</span>
              <select
                value={h.status}
                onChange={(e) => onUpdate(h.id, { status: e.target.value as HazardStatus })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
              <ProgressRing value={h.mitigationPct} label={`${h.mitigationPct}%`} />
              <button
                type="button"
                aria-label={`Remove ${h.label}`}
                className="icon-button"
                onClick={() => onRemove(h.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))}
        </>
      )}
    </SurfaceCard>
  );
}

interface AddHazardFormProps {
  onAdd: (h: Hazard) => void;
}

function AddHazardForm({ onAdd }: AddHazardFormProps) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<HazardKind>('frost');
  const [risk, setRisk] = useState<HazardRisk>('moderate');
  const [trend, setTrend] = useState<HazardTrend>('flat');
  const [mitigationPct, setMitigationPct] = useState(0);
  const [window, setWindow] = useState('');

  function commit(e: FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const now = Date.now();
    onAdd({
      id: makeHazardId(),
      kind,
      label: trimmed,
      risk,
      trend,
      status: 'monitoring',
      mitigationPct,
      window: window.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setLabel('');
    setMitigationPct(0);
    setWindow('');
  }

  return (
    <SurfaceCard className="hazard-panel add-hazard-form">
      <h2>
        <Plus aria-hidden="true" /> Add hazard
      </h2>
      <form onSubmit={commit} className="add-hazard-row">
        <input
          placeholder="Hazard label (e.g., Late spring frost)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value as HazardKind)}>
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select value={risk} onChange={(e) => setRisk(e.target.value as HazardRisk)}>
          {RISK_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {riskLabel(r)}
            </option>
          ))}
        </select>
        <select value={trend} onChange={(e) => setTrend(e.target.value as HazardTrend)}>
          {TREND_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          placeholder="Window (e.g., Apr-Sep)"
          value={window}
          onChange={(e) => setWindow(e.target.value)}
        />
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Mitigation %"
          value={mitigationPct}
          onChange={(e) => setMitigationPct(Number(e.target.value) || 0)}
        />
        <button className="green-button" type="submit">
          Add
        </button>
      </form>
    </SurfaceCard>
  );
}

interface PriorityActionsProps {
  priorities: Hazard[];
}

function PriorityActions({ priorities }: PriorityActionsProps) {
  return (
    <SurfaceCard className="hazard-panel priority-panel">
      <h2>Priority next actions</h2>
      {priorities.length === 0 ? (
        <p className="empty-note">No active hazards — add one above.</p>
      ) : (
        priorities.map((h, index) => (
          <p key={h.id}>
            <b>{index + 1}</b>
            <span>
              {h.label}
              <small>
                {riskLabel(h.risk)} risk · {h.mitigationPct}% mitigated
              </small>
            </span>
            <em>
              {statusLabel(h.status)}
              <small>{h.window ?? 'No window'}</small>
            </em>
          </p>
        ))
      )}
      <button className="outlined-button" type="button">
        View all recommendations <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}
