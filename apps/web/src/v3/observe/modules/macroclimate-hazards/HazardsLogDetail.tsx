import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  ArrowRight,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
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
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import {
  hazardCounts,
  riskLabel,
  statusLabel,
  topRiskPriorities,
} from './derivations.js';

const KIND_OPTIONS: HazardKind[] = [
  'frost', 'storm', 'drought', 'flood', 'fire', 'wind', 'erosion', 'other',
];
const RISK_OPTIONS: HazardRisk[] = ['low', 'moderate', 'high'];
const TREND_OPTIONS: HazardTrend[] = ['down', 'flat', 'up'];
const STATUS_OPTIONS: HazardStatus[] = ['monitoring', 'planned', 'in_progress', 'mitigated'];

function riskPillClass(risk: HazardRisk) {
  return risk === 'high' ? card.pillFail : risk === 'moderate' ? card.pillPartial : card.pillMet;
}

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
    <div className={card.page}>
      <div className={card.hero} data-stage="observe">
        <div className={obsx.heroRow}>
          <div>
            <p className={card.lede}>
              Track site risks, seasonal threats, and mitigation readiness. Use this log
              to prioritize actions, reduce losses, and build resilience across your
              design zones.
            </p>
          </div>
        </div>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <Kpi icon={ShieldCheck} label="Logged hazards" value={counts.total === 0 ? '—' : String(counts.total)} note="Across all zones" />
          <Kpi icon={TriangleAlert} label="High priority" value={counts.total === 0 ? '—' : String(counts.highRisk)} note="Requires attention" />
          <Kpi icon={TriangleAlert} label="Moderate" value={counts.total === 0 ? '—' : String(counts.moderateRisk)} note="Monitor & manage" />
          <Kpi icon={ShieldCheck} label="Mitigated" value={counts.total === 0 ? '—' : String(counts.mitigated)} note="Resolved" />
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          Hazards overview <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{counts.total}</span>
        </h2>
        {hazards.length === 0 ? (
          <p className={card.empty}>No hazards logged yet — add one below.</p>
        ) : (
          <table className={card.table}>
            <thead>
              <tr>
                <th>Hazard</th>
                <th>Risk</th>
                <th>Trend</th>
                <th>Window</th>
                <th>Status</th>
                <th className="num">Coverage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {hazards.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong style={{ color: 'rgba(232,220,200,0.95)' }}>{h.label}</strong>
                    <div style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>{h.kind}</div>
                  </td>
                  <td>
                    <span className={`${card.pill} ${riskPillClass(h.risk)}`}>{riskLabel(h.risk)}</span>
                  </td>
                  <td>{h.trend}</td>
                  <td>{h.window ?? '—'}</td>
                  <td>
                    <select
                      value={h.status}
                      onChange={(e) => updateHazard(id, h.id, { status: e.target.value as HazardStatus })}
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        color: 'rgba(232,220,200,0.92)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{h.mitigationPct}%</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      aria-label={`Remove ${h.label}`}
                      className={card.removeBtn}
                      onClick={() => removeHazard(id, h.id)}
                    >
                      <Trash2 aria-hidden="true" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Risk matrix</h2>
          <HazardRiskMatrix hazards={hazards} />
        </section>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Hazard hotspots</h2>
          <HazardHotspotsMap
            boundary={project?.location?.boundary}
            caption={project?.name}
            hazards={hazards}
          />
        </section>
      </div>

      <AddHazardForm onAdd={(h) => addHazard(id, h)} />

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Priority next actions</h2>
        {priorities.length === 0 ? (
          <p className={card.empty}>No active hazards — add one above.</p>
        ) : (
          <div className={obsx.synthesisBlock}>
            {priorities.map((h, index) => (
              <p key={h.id}>
                <b>{index + 1}</b>
                <span>
                  <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{h.label}.</b>{' '}
                  {riskLabel(h.risk)} risk · {h.mitigationPct}% mitigated · {statusLabel(h.status)}
                  {h.window ? ` · ${h.window}` : ''}
                </span>
              </p>
            ))}
          </div>
        )}
        <div className={card.btnRow}>
          <button type="button" className={card.btn}>
            View all recommendations
            <ArrowRight aria-hidden="true" size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
          </button>
        </div>
      </section>
    </div>
  );
}

interface KpiProps {
  icon: typeof TriangleAlert;
  label: string;
  value: string;
  note: string;
}

function Kpi({ icon: Icon, label, value, note }: KpiProps) {
  return (
    <div className={obsx.kpiBlock}>
      <span className={obsx.label}>
        <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
        {label}
      </span>
      <span className={obsx.value}>{value}</span>
      <span className={obsx.note}>{note}</span>
    </div>
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
  const [windowStr, setWindowStr] = useState('');

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
      window: windowStr.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setLabel('');
    setMitigationPct(0);
    setWindowStr('');
  }

  return (
    <section className={card.section}>
      <h2 className={card.sectionTitle}>
        <Plus aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Add hazard
      </h2>
      <form onSubmit={commit} className={card.grid}>
        <label className={`${card.field} ${card.full}`}>
          <span>Hazard label</span>
          <input
            placeholder="e.g., Late spring frost"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className={card.field}>
          <span>Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as HazardKind)}>
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className={card.field}>
          <span>Risk</span>
          <select value={risk} onChange={(e) => setRisk(e.target.value as HazardRisk)}>
            {RISK_OPTIONS.map((r) => (
              <option key={r} value={r}>{riskLabel(r)}</option>
            ))}
          </select>
        </label>
        <label className={card.field}>
          <span>Trend</span>
          <select value={trend} onChange={(e) => setTrend(e.target.value as HazardTrend)}>
            {TREND_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={card.field}>
          <span>Window</span>
          <input
            placeholder="e.g., Apr-Sep"
            value={windowStr}
            onChange={(e) => setWindowStr(e.target.value)}
          />
        </label>
        <label className={card.field}>
          <span>Mitigation %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={mitigationPct}
            onChange={(e) => setMitigationPct(Number(e.target.value) || 0)}
          />
        </label>
        <div className={`${card.btnRow} ${card.full}`}>
          <button className={card.btn} type="submit">Add hazard</button>
        </div>
      </form>
    </section>
  );
}
