import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Droplet,
  Snowflake,
  Sun,
  TriangleAlert,
  Wind,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { pickDefined, pickTruthy } from '@ogden/shared';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useHazardsStore } from '../../../../store/hazardsStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { api } from '../../../../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../../../../app/demoSession.js';
import {
  useServerProjectId,
  NOT_SYNCED_EXPORT_TITLE,
} from '../../../../hooks/useServerProjectId.js';
import MonthlyClimateChart from './MonthlyClimateChart.js';
import SunPathDiagram from './SunPathDiagram.js';
import HazardRiskMatrix from './HazardRiskMatrix.js';
import HazardHotspotsMap from './HazardHotspotsMap.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
import {
  climateKpis,
  getClimateLayer,
  hazardCounts,
  monthlyClimateSeries,
  polygonCentroid,
  riskLabel,
  solarOpportunities,
  statusLabel,
  topRiskPriorities,
  type KpiItem,
} from './derivations.js';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const ICON_MAP: Record<KpiItem['iconKey'], LucideIcon> = {
  snowflake: Snowflake,
  droplet: Droplet,
  alert: TriangleAlert,
  calendar: CalendarDays,
  sun: Sun,
  wind: Wind,
  shield: ShieldCheck,
};

export default function MacroclimateDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  // The exports API addresses the SERVER project UUID; `id` is the local
  // store id (H4, deep-audit 2026-07-03). Null → not yet synced → disable.
  const serverProjectId = useServerProjectId(id);
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);
  const ensureHazards = useHazardsStore((s) => s.ensureDefaults);
  const allByProject = useHazardsStore((s) => s.byProject);
  const hazards = useMemo(
    () => allByProject.find((p) => p.projectId === id)?.hazards ?? [],
    [allByProject, id],
  );

  useEffect(() => {
    ensureHazards(id);
  }, [id, ensureHazards]);

  const centroid = polygonCentroid(project?.location?.boundary);
  const counts = hazardCounts(hazards);
  const climateItems = climateKpis(layers);
  const opportunities = solarOpportunities(layers);
  const top = topRiskPriorities(hazards).slice(0, 3);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting || serverProjectId === null) return;
    setExporting(true);
    try {
      const climateSummary = getClimateLayer(layers)?.summary as
        | Record<string, unknown>
        | undefined;
      const monthly = monthlyClimateSeries(layers).map((m) => ({
        month: MONTH_LABELS[(m.month - 1) % 12] ?? String(m.month),
        ...(m.precipMm != null ? { precipMm: m.precipMm } : {}),
        ...(m.meanMaxC != null ? { meanMaxC: m.meanMaxC } : {}),
        ...(m.meanMinC != null ? { meanMinC: m.meanMinC } : {}),
      }));
      const { data } = await api.exports.generate(serverProjectId, {
        exportType: 'macroclimate_report',
        payload: {
          macroclimate: {
            ...(climateSummary ? { climateSummary } : {}),
            ...(monthly.length > 0 ? { monthlyNormals: monthly } : {}),
            solarOpportunities: opportunities,
            hazards: hazards.map((h) => ({
              id: h.id,
              kind: h.kind,
              label: h.label,
              risk: h.risk,
              trend: h.trend,
              status: h.status,
              mitigationPct: h.mitigationPct,
              ...pickDefined(h, ['lat', 'lng']),
              ...pickTruthy(h, ['window', 'notes']),
              createdAt: h.createdAt,
              updatedAt: h.updatedAt,
            })),
            hazardCounts: {
              total: counts.total,
              active: counts.active,
              mitigated: counts.mitigated,
              monitoring: counts.monitoring,
              in_progress: counts.inProgress,
              planned: counts.planned,
              highRisk: counts.highRisk,
              moderateRisk: counts.moderateRisk,
              lowRisk: counts.lowRisk,
              averageMitigationPct: counts.averageMitigationPct,
            },
          },
        },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('Macroclimate report export failed', err);
    } finally {
      setExporting(false);
    }
  };

  // Pick four headline KPIs for the strip: hardiness, precip, frost-free, solar.
  const stripKpis = climateItems.slice(0, 4);
  // Remaining climate KPIs (wind + frost dates).
  const extraKpis = climateItems.slice(4);

  const riskPill = (risk: 'low' | 'moderate' | 'high') =>
    risk === 'high' ? card.pillFail : risk === 'moderate' ? card.pillPartial : card.pillMet;

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-macroclimate-hazards-dashboard"
        lede="Understand the big-picture climate patterns and natural hazards that shape your site. Use this foundation to design resilient systems that work with your environment, not against it."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={handleExport}
          disabled={exporting || DEMO_OFFLINE_ENABLED || serverProjectId === null}
          title={!DEMO_OFFLINE_ENABLED && serverProjectId === null ? NOT_SYNCED_EXPORT_TITLE : undefined}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generating…' : 'Export macroclimate report'}
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={counts.averageMitigationPct} />
            <span className={obsx.label}>Mitigation coverage</span>
            <span className={obsx.value}>
              {counts.total === 0 ? 'No hazards yet' : `${counts.active} active`}
            </span>
            <span className={obsx.note}>{counts.total} logged</span>
          </div>
          {stripKpis.map((item) => {
            const Icon = ICON_MAP[item.iconKey];
            return (
              <div key={item.label} className={obsx.kpiBlock}>
                <span className={obsx.label}>
                  {Icon ? <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                  {item.label}
                </span>
                <span className={obsx.value}>{item.value}</span>
                <span className={obsx.note}>{item.note}</span>
              </div>
            );
          })}
        </div>
      </section>

      {extraKpis.length > 0 ? (
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Climate exposure</h2>
          <div className={obsx.kpiGrid}>
            {extraKpis.map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              return (
                <div key={item.label} className={obsx.kpiBlock}>
                  <span className={obsx.label}>
                    {Icon ? <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                    {item.label}
                  </span>
                  <span className={obsx.value}>{item.value}</span>
                  <span className={obsx.note}>{item.note}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <Sun aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Solar &amp; climate detail
        </h2>
        <p className={card.sectionBody} style={{ marginBottom: 14 }}>
          Deep dive into sun, temperature, precipitation, and seasonality to identify
          opportunities for passive design and productivity.
        </p>
        <div className={card.grid}>
          <div>
            <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>Average monthly climate</h3>
            <MonthlyClimateChart layers={layers} />
          </div>
          <div>
            <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>Sun path</h3>
            <SunPathDiagram lat={centroid?.lat ?? null} />
          </div>
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Climate opportunities</h2>
        {opportunities.map(([label, value]) => (
          <div key={label} className={card.statRow}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <TriangleAlert aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Hazards log
        </h2>
        <p className={card.sectionBody} style={{ marginBottom: 14 }}>
          Review natural hazards, risk levels, and mitigation strategies for your site.
        </p>
        <div className={card.grid}>
          <div>
            <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>Hazard risk matrix</h3>
            <HazardRiskMatrix hazards={hazards} />
          </div>
          <div>
            <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>Hazard hotspots</h3>
            <HazardHotspotsMap
              boundary={project?.location?.boundary}
              caption={project?.name}
              hazards={hazards}
            />
          </div>
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          Active hazards <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{counts.active}</span>
        </h2>
        {top.length > 0 ? (
          top.map((h) => (
            <div key={h.id} className={card.statRow}>
              <span>
                {h.label} <span style={{ color: 'rgba(232,220,200,0.45)', marginLeft: 6, fontSize: 11 }}>{statusLabel(h.status)} · {h.mitigationPct}%</span>
              </span>
              <span className={`${card.pill} ${riskPill(h.risk)}`}>{riskLabel(h.risk)}</span>
            </div>
          ))
        ) : (
          <p className={card.empty}>No hazards logged yet.</p>
        )}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Macroclimate synthesis</h2>
        <div className={obsx.synthesisGrid}>
          <div className={obsx.synthesisBlock}>
            <h3>Key takeaways</h3>
            {[
              'Cool temperate climate with strong seasonality and good precipitation.',
              'Design for passive solar gain, wind protection, and water capture.',
              'Frost windows shape planting timing and protective infrastructure.',
            ].map((item) => (
              <p key={item}>
                <CheckCircle2 aria-hidden="true" size={14} />
                <span>{item}</span>
              </p>
            ))}
          </div>
          <div className={obsx.synthesisBlock}>
            <h3>Next actions</h3>
            {[
              'Review Solar & Climate detail for passive design opportunities.',
              'Open Hazards log to refine mitigation strategies and track progress.',
              'Integrate climate insights into Zone & Sector planning.',
            ].map((item, index) => (
              <p key={item}>
                <b>{index + 1}</b>
                <span>{item}</span>
              </p>
            ))}
          </div>
          <div className={obsx.synthesisBlock}>
            <h3>Top risk priorities</h3>
            {top.length > 0 ? (
              top.map((h, index) => (
                <p key={h.id}>
                  <b>{index + 1}</b>
                  <span>{h.label}</span>
                </p>
              ))
            ) : (
              <p>
                <CheckCircle2 aria-hidden="true" size={14} />
                <span>No hazards logged yet.</span>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Field annotations</h2>
        <AnnotationListCard
          title=""
          projectId={projectId ?? null}
          kinds={['frostPocket', 'hazardZone']}
          emptyHint="No frost pockets or hazard zones recorded yet — outline one with the tools panel."
        />
      </section>
    </div>
  );
}
