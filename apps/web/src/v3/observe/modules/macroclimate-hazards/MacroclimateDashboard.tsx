import { useEffect, useMemo } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Droplet,
  Leaf,
  Snowflake,
  Sun,
  TriangleAlert,
  Wind,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useHazardsStore } from '../../../../store/hazardsStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import MonthlyClimateChart from './MonthlyClimateChart.js';
import SunPathDiagram from './SunPathDiagram.js';
import HazardRiskMatrix from './HazardRiskMatrix.js';
import HazardHotspotsMap from './HazardHotspotsMap.js';
import {
  climateKpis,
  hazardCounts,
  polygonCentroid,
  riskLabel,
  solarOpportunities,
  statusLabel,
  topRiskPriorities,
  type KpiItem,
} from './derivations.js';

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

  return (
    <div className="detail-page macroclimate-page">
      <section className="macroclimate-layout">
        <div className="macroclimate-main">
          <MacroHeader />
          <MacroKpis layers={layers} hazards={hazards} />
          <SolarClimateCard layers={layers} lat={centroid?.lat ?? null} />
          <HazardsCard
            hazards={hazards}
            boundary={project?.location?.boundary}
            caption={project?.name}
          />
          <AnnotationListCard
            title="Field annotations"
            projectId={projectId ?? null}
            kinds={['frostPocket', 'hazardZone']}
            emptyHint="No frost pockets or hazard zones recorded yet — outline one with the tools panel."
          />
        </div>
        <MacroSidebar hazards={hazards} />
      </section>
    </div>
  );
}

function MacroHeader() {
  return (
    <header className="macro-header">
      <span>Module 2</span>
      <h1>Macroclimate &amp; Hazards</h1>
      <p>
        Understand the big-picture climate patterns and natural hazards that shape your site. Use
        this foundation to design resilient systems that work with your environment, not against
        it.
      </p>
    </header>
  );
}

interface MacroKpisProps {
  layers: ReturnType<typeof useSiteDataStore.getState>['dataByProject'][string]['layers'] | undefined;
  hazards: ReturnType<ReturnType<typeof useHazardsStore.getState>['getHazards']>;
}

function MacroKpis({ layers, hazards }: MacroKpisProps) {
  const climateItems = climateKpis(layers).slice(0, 6);
  const counts = hazardCounts(hazards);
  const items: KpiItem[] = [
    ...climateItems,
    {
      iconKey: 'alert',
      label: 'Logged hazards',
      value: counts.total === 0 ? '—' : String(counts.active),
      note: counts.total === 0 ? 'None yet' : `${counts.total} total`,
      tone: counts.highRisk > 0 ? 'red' : 'gold',
    },
  ];

  return (
    <section className="macro-kpi-grid">
      {items.map((item) => {
        const Icon = ICON_MAP[item.iconKey];
        return (
          <SurfaceCard className={`macro-kpi-card ${item.tone}`} key={item.label}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </SurfaceCard>
        );
      })}
    </section>
  );
}

interface SolarClimateCardProps {
  layers: MacroKpisProps['layers'];
  lat: number | null;
}

function SolarClimateCard({ layers, lat }: SolarClimateCardProps) {
  const opportunities = solarOpportunities(layers);

  return (
    <SurfaceCard className="macro-section-card solar-card">
      <header>
        <div>
          <h2>
            <Sun aria-hidden="true" /> Solar &amp; Climate detail
          </h2>
          <p>
            Deep dive into sun, temperature, precipitation, and seasonality to identify
            opportunities for passive design and productivity.
          </p>
        </div>
        <button className="green-button" type="button">
          Open page <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <div className="solar-grid">
        <div>
          <h3>Average Monthly Climate</h3>
          <MonthlyClimateChart layers={layers} />
        </div>
        <div>
          <h3>Sun path</h3>
          <SunPathDiagram lat={lat} />
        </div>
        <SurfaceCard className="climate-opportunities">
          <h3>Climate opportunities</h3>
          {opportunities.map(([label, value]) => (
            <p key={label}>
              <Leaf aria-hidden="true" />
              <span>{label}</span>
              <b>{value}</b>
            </p>
          ))}
        </SurfaceCard>
      </div>
      <button
        className="outlined-button section-link"
        type="button"
      >
        See full climate analysis <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

interface HazardsCardProps {
  hazards: ReturnType<ReturnType<typeof useHazardsStore.getState>['getHazards']>;
  boundary?: GeoJSON.Polygon;
  caption?: string;
}

function HazardsCard({ hazards, boundary, caption }: HazardsCardProps) {
  const top = topRiskPriorities(hazards).slice(0, 3);

  return (
    <SurfaceCard className="macro-section-card hazards-card">
      <header>
        <div>
          <h2>
            <TriangleAlert aria-hidden="true" /> Hazards log
          </h2>
          <p>Review natural hazards, risk levels, and mitigation strategies for your site.</p>
        </div>
        <button className="green-button" type="button">
          Open page <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <div className="hazards-grid">
        <div>
          <h3>Hazard risk matrix</h3>
          <HazardRiskMatrix hazards={hazards} />
        </div>
        <div>
          <h3>Hazard hotspots</h3>
          <HazardHotspotsMap boundary={boundary} caption={caption} hazards={hazards} />
        </div>
        <SurfaceCard className="active-hazards-table">
          <h3>Active hazards</h3>
          {top.length > 0 ? (
            top.map((h, index) => (
              <p key={h.id}>
                <b>{index + 1}</b>
                <span>
                  {h.label}
                  <small>{riskLabel(h.risk)} risk</small>
                </span>
                <em>{h.trend}</em>
                <strong>{h.mitigationPct}%</strong>
                <i>{statusLabel(h.status)}</i>
              </p>
            ))
          ) : (
            <p className="empty-note">No hazards logged yet.</p>
          )}
        </SurfaceCard>
      </div>
      <button
        className="outlined-button section-link"
        type="button"
      >
        See full hazards log <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

interface MacroSidebarProps {
  hazards: HazardsCardProps['hazards'];
}

function MacroSidebar({ hazards }: MacroSidebarProps) {
  const top = topRiskPriorities(hazards).slice(0, 3);

  return (
    <aside className="macro-sidebar">
      <SurfaceCard className="macro-insights-card">
        <h2>Design insights &amp; recommendations</h2>
        <h3>Key takeaways</h3>
        {[
          'Cool temperate climate with strong seasonality and good precipitation.',
          'Design for passive solar gain, wind protection, and water capture.',
          'Frost windows shape planting timing and protective infrastructure.',
        ].map((item) => (
          <p key={item}>
            <CheckCircle2 aria-hidden="true" />
            {item}
          </p>
        ))}
        <h3>Next actions</h3>
        {[
          'Review Solar & Climate detail for passive design opportunities.',
          'Open Hazards log to refine mitigation strategies and track progress.',
          'Integrate climate insights into Zone & Sector planning.',
        ].map((item, index) => (
          <p className="numbered" key={item}>
            <b>{index + 1}</b>
            {item}
          </p>
        ))}
        <section className="risk-priorities">
          <h3>Top risk priorities</h3>
          {top.length > 0 ? (
            <ol>
              {top.map((h) => (
                <li key={h.id}>{h.label}</li>
              ))}
            </ol>
          ) : (
            <p className="empty-note">No hazards logged yet.</p>
          )}
        </section>
        <button className="green-button" type="button">
          Go to next: Site Analysis <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
