import {
  ArrowRight,
  Binoculars,
  CalendarDays,
  ChevronDown,
  Flower2,
  Leaf,
  Plus,
  Sprout,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import habitatMap from '../../assets/ecological-detail/habitat-map.png';
import speciesStrip from '../../assets/ecological-detail/species-strip.png';
import seasonalCalendar from '../../assets/ecological-detail/seasonal-calendar.png';
import relationshipWeb from '../../assets/ecological-detail/relationship-web.png';
import seedlingCallout from '../../assets/ecological-detail/seedling-callout.png';

export default function EcologicalDetail() {
  return (
    <div className="detail-page ecological-detail-page">
      <section className="ecology-layout">
        <div className="ecology-main">
          <EcologyHeader />
          <EcologyKpis />
          <section className="ecology-content-grid">
            <div className="ecology-left-stack">
              <HabitatMapPanel />
              <section className="ecology-bottom-grid">
                <SeasonalCalendarPanel />
                <IndicatorSpeciesPanel />
              </section>
            </div>
            <div className="ecology-observation-column">
              <SpeciesPanel />
              <div className="ecology-two-up">
                <HabitatHealthPanel />
                <RelationshipPanel />
              </div>
              <div className="ecology-two-up ecology-actions-row">
                <RecentFieldObservations />
                <RecommendedActions />
              </div>
            </div>
          </section>
        </div>
        <EcologySidebar />
      </section>
    </div>
  );
}

function EcologyHeader() {
  return (
    <header className="ecology-header">
      <div className="ecology-title-row">
        <Leaf aria-hidden="true" />
        <div>
          <h1>Ecological detail</h1>
          <p>
            Explore habitat conditions, species observations, guild indicators and ecosystem health
            to guide regenerative design and stewardship.
          </p>
        </div>
      </div>
    </header>
  );
}

function EcologyKpis() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Leaf, 'Biodiversity score', '62 /100', 'Moderate'],
    [Binoculars, 'Observed species', '137', 'Across 6 taxa'],
    [Sprout, 'Habitat types', '5', 'Diverse mosaic'],
    [Flower2, 'Pollinator activity', 'Moderate', '12% vs last season'],
    [TriangleAlert, 'Invasive pressure', 'Low', 'Stable'],
    [Sprout, 'Restoration priority', 'Medium', 'Targeted actions'],
  ];
  return (
    <SurfaceCard className="ecology-kpi-strip">
      {items.map(([Icon, label, value, note]) => (
        <div key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </SurfaceCard>
  );
}

function HabitatMapPanel() {
  const taxa = ['Plants', 'Birds', 'Insects', 'Amphibians', 'Fungi', 'Other'];
  return (
    <SurfaceCard className="ecology-map-panel">
      <header>
        <h2>Habitat map &amp; observation zones</h2>
        <button type="button">
          All observations <ChevronDown aria-hidden="true" />
        </button>
      </header>
      <CroppedArt src={habitatMap} className="ecology-habitat-map" />
      <div className="ecology-map-legend">
        {taxa.map((item) => (
          <span key={item}>{item}</span>
        ))}
        <button type="button">
          View full map <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </SurfaceCard>
  );
}

function SpeciesPanel() {
  const filters = ['All', 'Plants', 'Birds', 'Insects', 'Amphibians', 'Fungi'];
  return (
    <SurfaceCard className="species-panel">
      <header>
        <h2>Species observations</h2>
        <button type="button">
          View all species <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <nav aria-label="Species filters">
        {filters.map((item) => (
          <button key={item} type="button">
            {item}
          </button>
        ))}
      </nav>
      <CroppedArt src={speciesStrip} className="species-strip-image" />
    </SurfaceCard>
  );
}

function HabitatHealthPanel() {
  const rows: Array<[string, string]> = [
    ['Structural complexity', 'Moderate'],
    ['Native plant cover', 'Good'],
    ['Ground cover', 'Moderate'],
    ['Canopy regeneration', 'Low'],
    ['Microclimate stability', 'Good'],
    ['Hydrological function', 'Good'],
  ];
  return (
    <SurfaceCard className="habitat-health-panel">
      <header>
        <h2>Habitat health summary</h2>
        <button type="button">
          Details <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {rows.map(([label, status]) => (
        <p key={label}>
          <Sprout aria-hidden="true" />
          <span>{label}</span>
          <b>{status}</b>
          <i />
        </p>
      ))}
    </SurfaceCard>
  );
}

function RelationshipPanel() {
  return (
    <SurfaceCard className="relationship-panel">
      <header>
        <h2>Ecosystem relationships</h2>
        <button type="button">
          View food web <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <CroppedArt src={relationshipWeb} className="relationship-web-image" />
    </SurfaceCard>
  );
}

function SeasonalCalendarPanel() {
  return (
    <SurfaceCard className="seasonal-ecology-panel">
      <header>
        <h2>Seasonal ecology calendar</h2>
        <button type="button">
          This season <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <CroppedArt src={seasonalCalendar} className="seasonal-calendar-image" />
    </SurfaceCard>
  );
}

function IndicatorSpeciesPanel() {
  const rows: Array<[string, string, string]> = [
    ['Eastern Yellow Robin', 'Eopsaltria australis', 'Good'],
    ['Leaf-cutter Ants', 'Genus: Oecophylla', 'Good'],
    ['Wombat', 'Vombatus ursinus', 'Moderate'],
    ['Tree Frog spp.', 'Litoria spp.', 'Good'],
  ];
  return (
    <SurfaceCard className="indicator-species-panel">
      <header>
        <h2>Indicator species</h2>
        <button type="button">
          View all <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {rows.map(([name, latin, status], index) => (
        <p key={name}>
          <span>{index + 1}</span>
          <b>
            {name}
            <small>{latin}</small>
          </b>
          <em>{status}</em>
        </p>
      ))}
    </SurfaceCard>
  );
}

function RecentFieldObservations() {
  const rows: Array<[string, string, string]> = [
    ['Today, 9:42 AM', 'Noted high pollinator activity in meadow edge.', 'Pollinator'],
    ['Yesterday, 4:15 PM', 'Spotted Eastern Spinebill feeding on tea-tree.', 'Bird'],
    ['2 days ago, 11:08 AM', 'Frog call survey at wet area after rainfall.', 'Amphibian'],
    ['3 days ago, 2:34 PM', 'Leaf litter sample collected for fungi ID.', 'Fungi'],
  ];
  return (
    <SurfaceCard className="field-observations-panel">
      <header>
        <h2>Recent field observations</h2>
        <button type="button">
          View journal <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {rows.map(([time, note, tag]) => (
        <p key={note}>
          <CalendarDays aria-hidden="true" />
          <span>
            {time}
            <small>{note}</small>
          </span>
          <em>{tag}</em>
        </p>
      ))}
      <button className="green-button" type="button">
        <Plus aria-hidden="true" /> Add observation
      </button>
    </SurfaceCard>
  );
}

function RecommendedActions() {
  const rows: Array<[string, string, string, string]> = [
    [
      'Enhance riparian buffer planting',
      'Increase native cover along corridor.',
      'High',
      'Due in 7 days',
    ],
    [
      'Control weeds in meadow',
      'Prioritize early removal of key invasives.',
      'High',
      'Due in 14 days',
    ],
    [
      'Install pollinator habitat',
      'Add native flowering shrubs & logs.',
      'Medium',
      'Due in 14 days',
    ],
    [
      'Monitor frog breeding sites',
      'Check water quality & habitat.',
      'Medium',
      'Due in 30 days',
    ],
  ];
  return (
    <SurfaceCard className="ecology-recommended-panel">
      <header>
        <h2>Recommended actions</h2>
        <button type="button">
          Prioritize <ChevronDown aria-hidden="true" />
        </button>
      </header>
      {rows.map(([title, note, level, due], index) => (
        <p key={title}>
          <b>{index + 1}</b>
          <span>
            {title}
            <small>{note}</small>
          </span>
          <em>
            {level}
            <small>{due}</small>
          </em>
        </p>
      ))}
      <button type="button">View all actions</button>
    </SurfaceCard>
  );
}

function EcologySidebar() {
  const strengths = [
    'Diverse habitat mosaic supporting multiple niches.',
    'Healthy riparian corridor with good regeneration.',
    'Strong pollinator presence across the site.',
  ];
  const vulnerabilities = [
    'Low canopy regeneration in some woodland areas.',
    'High weed pressure in meadow edges.',
    'Erosion risk on slopes near track and drainage lines.',
  ];
  const opportunities = [
    'Expand native plant corridors to connect habitats.',
    'Enhance habitat for frogs and beneficial insects.',
    'Increase structural complexity with understory layers.',
  ];
  return (
    <aside className="ecology-sidebar">
      <SurfaceCard className="module-progress-card ecology-progress">
        <p>Module progress</p>
        <strong>
          18 of 28 tasks complete <span>63%</span>
        </strong>
        <i />
        <button type="button">View module guide</button>
      </SurfaceCard>
      <SurfaceCard className="ecology-insights-card">
        <h2>Ecological insights</h2>
        <section>
          <h3>Strengths</h3>
          {strengths.map((item) => (
            <p key={item}>
              <Leaf aria-hidden="true" />
              {item}
            </p>
          ))}
        </section>
        <section>
          <h3>Vulnerabilities</h3>
          {vulnerabilities.map((item) => (
            <p key={item}>
              <TriangleAlert aria-hidden="true" />
              {item}
            </p>
          ))}
        </section>
        <section>
          <h3>Opportunities</h3>
          {opportunities.map((item) => (
            <p key={item}>
              <Sprout aria-hidden="true" />
              {item}
            </p>
          ))}
        </section>
      </SurfaceCard>
      <SurfaceCard className="ecology-plan-card">
        <h2>Build a thriving ecosystem</h2>
        <p>Use these insights to guide your stewardship plan and track progress over time.</p>
        <button className="green-button" type="button">
          <Sprout aria-hidden="true" /> Add to stewardship plan
        </button>
        <CroppedArt src={seedlingCallout} className="seedling-callout-image" />
      </SurfaceCard>
    </aside>
  );
}
