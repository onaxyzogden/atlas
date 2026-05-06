import {
  Beaker,
  Download,
  Droplet,
  Eye,
  Layers,
  Leaf,
  Mountain,
  Plus,
  Ruler,
  Save,
  Settings,
  SlidersHorizontal,
  Sun,
  Trees,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import crossSectionChart from '../../assets/cross-section-tool/cross-section-chart.png';
import transectMap from '../../assets/cross-section-tool/transect-map.png';
import seasonalChart from '../../assets/cross-section-tool/seasonal-chart.png';

export default function CrossSectionDetail() {
  return (
    <div className="detail-page cross-section-page">
      <section className="cross-layout">
        <div className="cross-main">
          <CrossHeader />
          <CrossKpis />
          <CrossChartPanel />
          <section className="cross-bottom-grid">
            <ObservationPanel />
            <TransectLibrary />
            <SeasonalPanel />
          </section>
        </div>
        <CrossSidebar />
      </section>
      <CrossActionBar />
    </div>
  );
}

function CrossHeader() {
  return (
    <header className="cross-header">
      <div className="module-title-row">
        <b>3</b>
        <div>
          <h1>Cross-section tool</h1>
          <p>
            Analyze terrain profiles along transects to understand land form, place design
            elements, evaluate solar geometry, and test section-based interventions with
            confidence.
          </p>
        </div>
      </div>
    </header>
  );
}

function CrossKpis() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Ruler, 'Transect length', '612 m', 'A to B'],
    [Mountain, 'Elevation change', '27.8 m', 'High to low'],
    [Triangle, 'Average slope', '4.2°', 'Overall grade'],
    [Sun, 'Solar exposure (ann.)', '62%', 'Good exposure'],
    [Trees, 'Vertical elements', '32', 'Trees & structures'],
  ];

  return (
    <SurfaceCard className="cross-kpi-strip">
      {items.map(([Icon, label, value, note]) => (
        <div className="cross-kpi" key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </SurfaceCard>
  );
}

function CrossChartPanel() {
  const segments: Array<[string, string, string, string]> = [
    ['1', '0-132 m', 'Slope 5.6°', 'Drop 7.4 m'],
    ['2', '132-286 m', 'Slope 3.1°', 'Drop 4.8 m'],
    ['3', '286-452 m', 'Slope 2.2°', 'Drop 3.6 m'],
    ['4', '452-612 m', 'Slope 3.8°', 'Drop 12.0 m'],
  ];
  return (
    <SurfaceCard className="cross-chart-panel">
      <CroppedArt src={crossSectionChart} className="cross-chart-image" />
      <div className="segment-strip">
        <span>
          <b>Segment stats</b>Click a segment on chart
        </span>
        {segments.map(([n, range, slope, drop]) => (
          <span key={n}>
            <b>{n}</b>
            {range}
            <small>
              {slope} · {drop}
            </small>
          </span>
        ))}
      </div>
    </SurfaceCard>
  );
}

function ObservationPanel() {
  const items: Array<[string, string, string]> = [
    ['Ideal swale zone', 'A swale at 140-180 m will capture runoff from 5.2 ha.', 'green'],
    ['Best tree belt zone', 'Plant a windbreak between 80-120 m on the ridge.', 'green'],
    ['Frost pocket risk', 'Low basin near 540-590 m may collect cold air.', 'blue'],
    ['Access path option', 'Gentle grade between 250-320 m is ideal for access.', 'green'],
  ];

  return (
    <SurfaceCard className="cross-panel">
      <h2>Section observations</h2>
      {items.map(([title, text, tone]) => (
        <p className={tone} key={title}>
          <Leaf /> <b>{title}</b>
          <span>{text}</span>
        </p>
      ))}
      <button className="outlined-button" type="button">
        <Plus /> Add observation
      </button>
    </SurfaceCard>
  );
}

function TransectLibrary() {
  const rows: Array<[string, string, string, string]> = [
    ['1', 'A-B Main Transect', '612 m · 27.8 m drop · Today', 'Active'],
    ['2', 'C-D Upper Ridge', '498 m · 18.1 m drop · 2 days ago', ''],
    ['3', 'E-F Lower Valley', '723 m · 35.6 m drop · 5 days ago', ''],
  ];
  return (
    <SurfaceCard className="cross-panel transect-library">
      <h2>Section library</h2>
      {rows.map(([n, title, note, tag]) => (
        <div className="transect-row" key={title}>
          <b>{n}</b>
          <span>
            {title}
            <small>{note}</small>
          </span>
          {tag ? <em>{tag}</em> : null}
        </div>
      ))}
      <button className="outlined-button" type="button">
        <Plus /> New transect
      </button>
    </SurfaceCard>
  );
}

function SeasonalPanel() {
  const tabs = ['Jun 21', 'Sep 21', 'Dec 21', 'Mar 21'];
  return (
    <SurfaceCard className="cross-panel seasonal-panel">
      <h2>
        Seasonal comparison <small>(solar exposure)</small>
      </h2>
      <div className="season-tabs">
        {tabs.map((tab, index) => (
          <button className={index === 0 ? 'is-active' : ''} type="button" key={tab}>
            {tab}
          </button>
        ))}
      </div>
      <CroppedArt src={seasonalChart} className="seasonal-chart-image" />
    </SurfaceCard>
  );
}

interface ToggleRowProps {
  icon: LucideIcon;
  title: string;
  note: string;
}

function ToggleRow({ icon: Icon, title, note }: ToggleRowProps) {
  return (
    <div className="toggle-row">
      <Icon />
      <span>
        {title}
        <small>{note}</small>
      </span>
      <button type="button" aria-label={`${title} enabled`}>
        <i />
      </button>
    </div>
  );
}

function CrossSidebar() {
  const overlays: Array<[LucideIcon, string, string]> = [
    [Sun, 'Sun path', 'Show solar geometry'],
    [Triangle, 'Slope segments', 'Color by slope grade'],
    [Droplet, 'Water flow', 'Flow direction & pathways'],
    [Layers, 'Soil horizons', 'Soil depth & layers'],
    [Trees, 'Vegetation', 'Existing & proposed'],
    [Eye, 'Structures & elements', 'Design features'],
    [Beaker, 'Cut / fill estimate', 'Volume & balance'],
  ];
  return (
    <aside className="cross-sidebar">
      <SurfaceCard className="transect-map-card">
        <h2>Transect map</h2>
        <CroppedArt src={transectMap} className="transect-map-image" />
        <button className="outlined-button" type="button">
          <Settings /> Center on map
        </button>
      </SurfaceCard>
      <SurfaceCard className="tools-panel">
        <h2>Overlays &amp; tools</h2>
        {overlays.map(([Icon, title, note]) => (
          <ToggleRow key={title} icon={Icon} title={title} note={note} />
        ))}
      </SurfaceCard>
      <SurfaceCard className="tools-panel analysis-panel">
        <h2>Seasonal &amp; analysis</h2>
        <button type="button">
          <Sun /> Seasonal comparison <b>Compare</b>
        </button>
        <button type="button">
          <Droplet /> Water simulation <b>Simulate</b>
        </button>
        <button type="button">
          <Download /> Export section <b>Export</b>
        </button>
      </SurfaceCard>
      <SurfaceCard className="earthworks-panel">
        <h2>Estimated earthworks</h2>
        <dl>
          <div>
            <dt>Cut</dt>
            <dd>82.4 m³</dd>
          </div>
          <div>
            <dt>Fill</dt>
            <dd>61.7 m³</dd>
          </div>
          <div>
            <dt>Net</dt>
            <dd>20.7 m³ cut</dd>
          </div>
        </dl>
        <button className="outlined-button" type="button">
          Details
        </button>
      </SurfaceCard>
    </aside>
  );
}

function CrossActionBar() {
  return (
    <SurfaceCard className="cross-action-bar">
      <button type="button">
        <Plus /> Add design element
      </button>
      <button type="button">
        <Sun /> Toggle solar overlay
      </button>
      <button type="button">
        <Droplet /> Run water simulation
      </button>
      <button className="green-button" type="button">
        <Save /> Save transect
      </button>
      <button type="button">Save as...</button>
      <button type="button" aria-label="More options">
        <SlidersHorizontal />
      </button>
    </SurfaceCard>
  );
}
