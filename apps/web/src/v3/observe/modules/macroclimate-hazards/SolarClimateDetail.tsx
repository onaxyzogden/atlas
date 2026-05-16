import {
  ArrowRight,
  CalendarDays,
  Download,
  Droplet,
  ExternalLink,
  Leaf,
  Plus,
  ShieldCheck,
  Snowflake,
  Sprout,
  Sun,
  TriangleAlert,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import MonthlyClimateChart from './MonthlyClimateChart.js';
import SunPathDiagram from './SunPathDiagram.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import {
  climateKpis,
  getClimateLayer,
  polygonCentroid,
  solarOpportunities,
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

export default function SolarClimateDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);
  const centroid = polygonCentroid(project?.location?.boundary);
  const summary = getClimateLayer(layers)?.summary;
  const lat = centroid?.lat ?? null;
  const annualHrs = summary?.annual_sunshine_hours;
  const dailyAvg = annualHrs ? (annualHrs / 365).toFixed(1) : '—';

  const items = climateKpis(layers);
  const opps = solarOpportunities(layers);

  const exposure: Array<[string, string, string]> = [];
  if (summary?.prevailing_wind) {
    exposure.push([
      'Prevailing wind',
      `Wind from ${summary.prevailing_wind} — plan windbreaks on this edge.`,
      summary.wind_speed_ms != null ? `${(summary.wind_speed_ms * 3.6).toFixed(0)} km/h` : '—',
    ]);
  }
  if (summary?.last_frost_date) {
    exposure.push([
      'Spring frost window',
      `Last frost average: ${summary.last_frost_date}. Protect tender plants until then.`,
      'Plan',
    ]);
  }
  if (summary?.first_frost_date) {
    exposure.push([
      'Fall frost window',
      `First frost average: ${summary.first_frost_date}. Harvest before this date.`,
      'Plan',
    ]);
  }
  if (exposure.length === 0) {
    exposure.push(['Exposure data pending', 'Awaiting climate layer.', '—']);
  }

  const priorities: Array<[string, string]> = [];
  if ((summary?.solar_radiation_kwh_m2_day ?? 0) >= 4) {
    priorities.push([
      'Maximize passive solar gain',
      'Good winter solar exposure supports passive heating and greenhouse siting.',
    ]);
  }
  if ((summary?.annual_precip_mm ?? 0) >= 600) {
    priorities.push([
      'Capture seasonal rainfall',
      `~${Math.round(summary?.annual_precip_mm ?? 0)} mm/yr. Design swales, ponds, and tanks.`,
    ]);
  }
  if (summary?.prevailing_wind) {
    priorities.push([
      'Shelter from prevailing winds',
      `${summary.prevailing_wind} winds shape exposure. Use windbreaks and landform.`,
    ]);
  }
  if ((summary?.growing_season_days ?? 0) > 0) {
    priorities.push([
      'Plan around frost windows',
      `${summary?.growing_season_days} frost-free days — protect tender plants in shoulder seasons.`,
    ]);
  }
  if (priorities.length === 0) {
    priorities.push(['Climate priorities pending', 'Add layer data to surface insights.']);
  }

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-macroclimate-hazards-solar-climate"
        lede="Understand sunlight, seasonal rhythms, rainfall, and wind patterns to design with climate, not against it. These insights help you place elements, time actions, and build resilience."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button type="button" className={card.btn}>
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Export climate report
        </button>
        <button type="button" className={card.btn}>
          <ExternalLink aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Open climate sources
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          {items.slice(0, 4).map((item) => {
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

      {items.length > 4 ? (
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Exposure metrics</h2>
          <div className={obsx.kpiGrid}>
            {items.slice(4).map((item) => {
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
        <h2 className={card.sectionTitle}>Monthly climate overview</h2>
        <MonthlyClimateChart layers={layers} />
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Solar path &amp; seasonal sun angles</h2>
        <div className={card.grid}>
          <SunPathDiagram lat={lat} />
          <div>
            <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>Daylight summary</h3>
            <div className={card.statRow}>
              <span><Sun aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Latitude</span>
              <span>{lat != null ? `${lat.toFixed(2)}°` : '—'}</span>
            </div>
            <div className={card.statRow}>
              <span><Sun aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Avg daily sunshine</span>
              <span>{dailyAvg}{annualHrs ? ' hrs' : ''}</span>
            </div>
            <div className={card.statRow}>
              <span>Annual sunshine</span>
              <span>{annualHrs ? `${Math.round(annualHrs)} hrs` : '—'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            <Wind aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Exposure &amp; shelter
          </h2>
          <div className={obsx.synthesisBlock}>
            {exposure.map(([title, text, rating]) => (
              <p key={title}>
                <Wind aria-hidden="true" size={14} />
                <span>
                  <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {text} <em style={{ color: 'rgba(var(--color-gold-rgb), 0.85)', fontStyle: 'normal' }}>{rating}</em>
                </span>
              </p>
            ))}
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            <Sprout aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Climate opportunities
          </h2>
          <div className={obsx.synthesisBlock}>
            {opps.map(([title, text]) => (
              <p key={title}>
                <Sprout aria-hidden="true" size={14} />
                <span>
                  <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {text}
                </span>
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Climate insights &amp; next actions</h2>
        <div className={obsx.synthesisBlock}>
          {priorities.map(([title, text], index) => (
            <p key={title}>
              <b>{index + 1}</b>
              <span>
                <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {text}
              </span>
            </p>
          ))}
        </div>
        <div className={card.btnRow}>
          <button type="button" className={card.btn}>
            <Plus aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Add to design plan
            <ArrowRight aria-hidden="true" size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
          </button>
        </div>
        <p className={card.sectionBody} style={{ marginTop: 12 }}>
          <Leaf aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Match design ambition to local climate, not aspirational hours.
        </p>
      </section>
    </div>
  );
}
