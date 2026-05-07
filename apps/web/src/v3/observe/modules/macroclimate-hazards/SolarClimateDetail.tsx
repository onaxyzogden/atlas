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
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import heroSunscape from '../../assets/solar-climate-detail/hero-sunscape.png';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import MonthlyClimateChart from './MonthlyClimateChart.js';
import SunPathDiagram from './SunPathDiagram.js';
import {
  climateKpis,
  getClimateLayer,
  polygonCentroid,
  solarOpportunities,
  type ClimateLayer,
  type KpiItem,
} from './derivations.js';

type ClimateSummary = ClimateLayer['summary'];

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
  const climateSummary = getClimateLayer(layers)?.summary;

  return (
    <div className="detail-page solar-detail-page">
      <section className="solar-detail-layout">
        <div className="solar-detail-main">
          <SolarHero />
          <SolarKpis layers={layers} />
          <section className="solar-chart-grid">
            <ClimateOverviewCard layers={layers} />
            <SolarPathCard lat={centroid?.lat ?? null} layers={layers} />
          </section>
          <section className="solar-bottom-grid">
            <ExposureCard summary={climateSummary} />
            <ClimateOpportunitiesCard layers={layers} />
          </section>
        </div>
        <SolarActionRail layers={layers} />
      </section>
    </div>
  );
}

function SolarHero() {
  return (
    <header className="solar-hero">
      <div>
        <h1>Solar &amp; Climate detail</h1>
        <p>
          Understand sunlight, seasonal rhythms, rainfall, and wind patterns to design with
          climate, not against it. These insights help you place elements, time actions, and build
          resilience.
        </p>
        <div className="solar-hero-actions">
          <button className="green-button" type="button">
            <Download aria-hidden="true" /> Export climate report
          </button>
          <button className="outlined-button" type="button">
            <ExternalLink aria-hidden="true" /> Open climate sources
          </button>
        </div>
      </div>
      <CroppedArt src={heroSunscape} className="solar-hero-art" />
    </header>
  );
}

interface LayersOnly {
  layers: ReturnType<typeof useSiteDataStore.getState>['dataByProject'][string]['layers'] | undefined;
}

function SolarKpis({ layers }: LayersOnly) {
  const items = climateKpis(layers);
  return (
    <section className="solar-kpi-grid">
      {items.map((item) => {
        const Icon = ICON_MAP[item.iconKey];
        return (
          <SurfaceCard className={`solar-kpi ${item.tone}`} key={item.label}>
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

function ClimateOverviewCard({ layers }: LayersOnly) {
  return (
    <SurfaceCard className="solar-panel climate-overview-panel">
      <header>
        <h2>Monthly climate overview</h2>
      </header>
      <MonthlyClimateChart layers={layers} className="climate-overview-image" />
    </SurfaceCard>
  );
}

interface SolarPathCardProps extends LayersOnly {
  lat: number | null;
}

function SolarPathCard({ lat, layers }: SolarPathCardProps) {
  const summary = getClimateLayer(layers)?.summary;
  const annualHrs = summary?.annual_sunshine_hours;
  const dailyAvg = annualHrs ? (annualHrs / 365).toFixed(1) : '—';

  return (
    <SurfaceCard className="solar-panel solar-path-panel">
      <h2>Solar path &amp; seasonal sun angles</h2>
      <div className="solar-path-content">
        <SunPathDiagram lat={lat} className="solar-path-image" />
        <SurfaceCard className="daylight-hours">
          <h3>Daylight summary</h3>
          <p>
            <Sun aria-hidden="true" />
            <span>Latitude</span>
            <b>{lat != null ? `${lat.toFixed(2)}°` : '—'}</b>
          </p>
          <p>
            <Sun aria-hidden="true" />
            <span>Avg daily sunshine</span>
            <b>{dailyAvg}{annualHrs ? ' hrs' : ''}</b>
          </p>
          <strong>
            {annualHrs ? `${Math.round(annualHrs)} hrs` : '—'}{' '}
            <small>Annual sunshine</small>
          </strong>
        </SurfaceCard>
      </div>
    </SurfaceCard>
  );
}

interface ExposureCardProps {
  summary: ClimateSummary | undefined;
}

function ExposureCard({ summary }: ExposureCardProps) {
  const items: Array<[string, string, string]> = [];
  if (summary?.prevailing_wind) {
    items.push([
      'Prevailing wind',
      `Wind from ${summary.prevailing_wind} — plan windbreaks on this edge.`,
      summary.wind_speed_ms != null ? `${(summary.wind_speed_ms * 3.6).toFixed(0)} km/h` : '—',
    ]);
  }
  if (summary?.last_frost_date) {
    items.push([
      'Spring frost window',
      `Last frost average: ${summary.last_frost_date}. Protect tender plants until then.`,
      'Plan',
    ]);
  }
  if (summary?.first_frost_date) {
    items.push([
      'Fall frost window',
      `First frost average: ${summary.first_frost_date}. Harvest before this date.`,
      'Plan',
    ]);
  }
  if (items.length === 0) {
    items.push(['Exposure data pending', 'Awaiting climate layer.', '—']);
  }
  return (
    <SurfaceCard className="solar-panel exposure-panel">
      <h2>Exposure &amp; shelter</h2>
      {items.map(([title, text, rating]) => (
        <p key={title}>
          <Wind aria-hidden="true" />
          <b>
            {title}
            <small>{text}</small>
          </b>
          <em>{rating}</em>
        </p>
      ))}
    </SurfaceCard>
  );
}

function ClimateOpportunitiesCard({ layers }: LayersOnly) {
  const opps = solarOpportunities(layers);
  return (
    <SurfaceCard className="solar-panel opportunities-panel">
      <h2>Climate opportunities &amp; site implications</h2>
      {opps.map(([title, text]) => (
        <p key={title}>
          <Sprout aria-hidden="true" />
          <b>{title}</b>
          <span>{text}</span>
        </p>
      ))}
    </SurfaceCard>
  );
}

function SolarActionRail({ layers }: LayersOnly) {
  const summary = getClimateLayer(layers)?.summary;
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
    <aside className="solar-action-rail">
      <SurfaceCard className="climate-priorities-card">
        <h2>Climate insights &amp; next actions</h2>
        <h3>Top priorities</h3>
        {priorities.map(([title, text], index) => (
          <p key={title}>
            <b>{index + 1}</b>
            <span>
              {title}
              <small>{text}</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </p>
        ))}
        <button className="green-button" type="button">
          Add to design plan <Plus aria-hidden="true" />
        </button>
        <p className="design-tip">
          <Leaf aria-hidden="true" /> Match design ambition to local climate, not aspirational hours.
        </p>
      </SurfaceCard>
    </aside>
  );
}
