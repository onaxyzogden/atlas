import {
  ArrowRight,
  Beaker,
  Binoculars,
  CalendarDays,
  ChevronDown,
  Download,
  Droplet,
  FlaskConical,
  Leaf,
  MapPin,
  Settings,
  Sprout,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import { useDetailNav } from '../../components/ModuleSlideUp.js';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import siteMap from '../../assets/earth-water-ecology/site-observations-map.png';
import hydrologyMap from '../../assets/earth-water-ecology/hydrology-map.png';
import speciesThumbs from '../../assets/earth-water-ecology/species-thumbnails.png';

export default function EarthWaterEcologyDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  return (
    <div className="detail-page diagnostics-page">
      <ModuleHeader />
      <KpiStrip />
      <TabsAndActions />
      <section className="diagnostic-grid">
        <SiteMapCard />
        <SoilDiagnosticsCard />
        <HydrologyCard />
        <EcologyCard />
        <AnnotationListCard
          title="Field annotations"
          projectId={projectId ?? null}
          kinds={['soilSample', 'watercourse', 'ecologyZone']}
          emptyHint="No soil samples, watercourses, or ecology zones recorded yet — drop one with the tools panel."
        />
        <RecommendedActionsCard />
      </section>
    </div>
  );
}

function ModuleHeader() {
  return (
    <header className="module-header">
      <div className="module-title-block">
        <div className="module-title-row">
          <b>4</b>
          <div>
            <h1>Earth, Water &amp; Ecology Diagnostics</h1>
            <p>
              Understand the living systems of your site. Diagnose soils, hydrology and ecology to
              reveal opportunities, risks and patterns that inform wise design.
            </p>
          </div>
          <span className="status-pill">In progress</span>
        </div>
      </div>
      <SurfaceCard className="module-progress-card">
        <span>Module progress</span>
        <strong>18 of 28 tasks complete</strong>
        <div className="thin-progress">
          <i style={{ width: '63%' }} />
        </div>
        <em>63%</em>
        <button className="outlined-button" type="button">
          View module guide
        </button>
      </SurfaceCard>
    </header>
  );
}

function KpiStrip() {
  const items: Array<[LucideIcon, string, string, string, string]> = [
    [Sprout, 'Latest soil pH', '6.8', 'Slightly acidic', 'green'],
    [Settings, 'Soil health score', '65 /100', 'Moderate', 'gold'],
    [Leaf, 'Biodiversity score', '62 /100', 'Moderate', 'gold'],
    [Droplet, 'Water security', 'Low', 'Improve capture', 'blue'],
    [Binoculars, 'Field observations', '24', 'This season', 'gold'],
    [FlaskConical, 'Tests & samples', '11', 'Across site', 'gold'],
  ];

  return (
    <SurfaceCard className="diagnostic-kpi-strip">
      {items.map(([Icon, label, value, note, tone]) => (
        <div className={`diagnostic-kpi ${tone}`} key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </SurfaceCard>
  );
}

function TabsAndActions() {
  const tabs = ['Overview', 'Soil', 'Water', 'Ecology', 'Lab Results', 'Trends'];
  return (
    <div className="diagnostic-tabs-row">
      <nav className="diagnostic-tabs" aria-label="Diagnostics sections">
        {tabs.map((tab, index) => (
          <button className={index === 0 ? 'is-active' : ''} type="button" key={tab}>
            {tab}
          </button>
        ))}
      </nav>
      <div className="diagnostic-actions">
        <button className="outlined-button" type="button">
          <Download aria-hidden="true" /> Export report{' '}
          <ChevronDown aria-hidden="true" />
        </button>
        <button className="outlined-button" type="button">
          <CalendarDays aria-hidden="true" /> This season{' '}
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

function PanelHeader({ title, action, onAction }: PanelHeaderProps) {
  return (
    <header className="panel-header">
      <h2>{title}</h2>
      {action ? (
        <button className="outlined-button" type="button" onClick={onAction}>
          {action} <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </header>
  );
}

function SiteMapCard() {
  return (
    <SurfaceCard className="diagnostic-panel site-map-panel">
      <PanelHeader title="Site map & observations" />
      <div className="site-map-wrap">
        <CroppedArt src={siteMap} className="site-map-image" />
      </div>
      <div className="map-legend">
        <span>
          <Droplet /> Water point
        </span>
        <span>
          <Leaf /> Soil sample
        </span>
        <span>
          <MapPin /> Erosion risk
        </span>
        <span>
          <Sprout /> Vegetation
        </span>
        <button type="button">
          View full map <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </SurfaceCard>
  );
}

function SoilDiagnosticsCard() {
  const nav = useDetailNav();
  const rows: Array<[string, string, string, string, number]> = [
    ['pH (H2O)', '6.8', 'Slightly acidic', 'Good', 72],
    ['Infiltration rate', '15 mm/hr', 'Moderate infiltration', 'Moderate', 55],
    ['Compaction', '320 kPa', 'Moderate compaction', 'Moderate', 68],
    ['Organic matter', '3.2%', 'Moderate', 'Moderate', 58],
    ['Soil texture', 'Loam', 'Balanced', 'Good', 64],
  ];

  return (
    <SurfaceCard className="diagnostic-panel soil-panel">
      <PanelHeader
        title="Soil diagnostics"
        action="View all tests"
        onAction={() => nav.push('jar-perc-roof')}
      />
      <div className="soil-row-list">
        {rows.map(([name, value, note, rating, position]) => (
          <div className="soil-row" key={name}>
            <Beaker aria-hidden="true" />
            <div>
              <strong>{name}</strong>
              <span>
                {value} · {note}
              </span>
            </div>
            <b className={rating === 'Good' ? 'good' : 'moderate'}>{rating}</b>
            <i>
              <em style={{ left: `${position}%` }} />
            </i>
          </div>
        ))}
      </div>
      <p className="interpretation">
        <Sprout aria-hidden="true" /> <b>Interpretation:</b> Good pH and OM for soil life. Moderate
        infiltration and compaction - consider biological aeration and organic amendments.
      </p>
    </SurfaceCard>
  );
}

function HydrologyCard() {
  const nav = useDetailNav();
  return (
    <SurfaceCard className="diagnostic-panel hydrology-panel">
      <PanelHeader title="Hydrology overview" action="Details" onAction={() => nav.push('hydrology')} />
      <div className="hydrology-layout">
        <dl>
          <div>
            <dt>Runoff direction</dt>
            <dd>
              SE (125°)<span>Primary flow path</span>
            </dd>
          </div>
          <div>
            <dt>Water points</dt>
            <dd>
              3<span>Perennial & seasonal</span>
            </dd>
          </div>
          <div>
            <dt>Drainage pattern</dt>
            <dd>
              Dendritic<span>Good landscape flow</span>
            </dd>
          </div>
          <div>
            <dt>Capture opportunities</dt>
            <dd>
              4<span>Swales, ponds, keylines</span>
            </dd>
          </div>
        </dl>
        <CroppedArt src={hydrologyMap} className="hydrology-image" />
      </div>
      <div className="flow-legend">
        <span>Surface flow</span>
        <span>Intermittent flow</span>
        <span>Watershed divide</span>
      </div>
      <p className="warning-note">
        <TriangleAlert aria-hidden="true" /> <b>Insight:</b> Possible erosion risk on lower slope.
        Prioritize slow, spread, sink strategies and protect riparian corridor.
      </p>
    </SurfaceCard>
  );
}

function EcologyCard() {
  const nav = useDetailNav();
  const tabs = ['All', 'Flora', 'Fauna', 'Fungi'];
  return (
    <SurfaceCard className="diagnostic-panel ecology-panel">
      <PanelHeader
        title="Ecology observations"
        action="View all species"
        onAction={() => nav.push('ecological')}
      />
      <div className="species-tabs">
        {tabs.map((tab, index) => (
          <button className={index === 0 ? 'is-active' : ''} type="button" key={tab}>
            {tab}
          </button>
        ))}
      </div>
      <CroppedArt src={speciesThumbs} className="species-image" />
      <p className="biodiversity-note">
        <Leaf aria-hidden="true" /> <b>Biodiversity insight:</b> Moderate diversity for this
        landscape. Riparian corridor supports valuable habitat - worth protecting and enhancing.
      </p>
    </SurfaceCard>
  );
}

function RecommendedActionsCard() {
  const actions: Array<[string, string, string, string]> = [
    [
      'Install contour swale on mid-slope',
      'Capture runoff and reduce erosion risk.',
      'High',
      'Due in 7 days',
    ],
    [
      'Apply compost + mulch to garden beds',
      'Build organic matter and soil biology.',
      'Medium',
      'Due in 14 days',
    ],
    [
      'Protect riparian corridor',
      'Fence and revegetate with natives.',
      'High',
      'Due in 21 days',
    ],
    [
      'Conduct biological aeration',
      'Reduce compaction, improve infiltration.',
      'Medium',
      'Due in 30 days',
    ],
  ];

  return (
    <SurfaceCard className="diagnostic-panel actions-panel">
      <PanelHeader title="Recommended next actions" action="Prioritize" />
      <div className="action-list">
        {actions.map(([title, note, priority, due], index) => (
          <div className="action-item" key={title}>
            <b>{index + 1}</b>
            <div>
              <strong>{title}</strong>
              <span>{note}</span>
            </div>
            <em className={priority.toLowerCase()}>{priority}</em>
            <small>{due}</small>
          </div>
        ))}
      </div>
      <button className="text-link" type="button">
        View all actions <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}
