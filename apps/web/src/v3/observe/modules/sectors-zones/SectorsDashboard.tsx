import {
  ArrowRight,
  CircleHelp,
  Compass,
  Droplet,
  Layers,
  Leaf,
  Link,
  Route,
  Sun,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import { useDetailNav } from '../../components/ModuleSlideUp.js';
import sectorHero from '../../assets/sectors-dashboard/sector-hero.png';
import sectorCompass from '../../assets/sectors-dashboard/sector-compass.png';
import cartographicPreview from '../../assets/sectors-dashboard/cartographic-preview.png';

export default function SectorsDashboard() {
  return (
    <div className="detail-page sectors-page">
      <section className="sectors-layout">
        <div className="sectors-main">
          <SectorsHero />
          <SectorsMetrics />
          <SynthesisBand />
          <section className="sectors-tool-grid">
            <SectorCompassCard />
            <CartographicCard />
          </section>
        </div>
        <SectorsSidebar />
      </section>
    </div>
  );
}

function SectorsHero() {
  return (
    <section className="sectors-hero">
      <CroppedArt src={sectorHero} className="sectors-hero-art" />
      <div className="sectors-hero-copy">
        <span>5</span>
        <div>
          <h1>Sectors, Microclimates &amp; Zones</h1>
          <p>
            Use sector analysis, microclimate patterns, and zones to inform where and how each
            design element belongs on the land.
          </p>
        </div>
      </div>
    </section>
  );
}

function SectorsMetrics() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Compass, 'Sector arrows placed', '5', 'Active'],
    [Thermometer, 'Microclimates identified', '4', 'Distinct areas'],
    [Layers, 'Zones outlined', '6', 'Functional zones'],
    [Link, 'Circulation links', '3', 'Key connections'],
  ];
  return (
    <section className="sectors-metrics-row">
      {items.map(([Icon, label, value, note]) => (
        <SurfaceCard key={label} className="sector-metric-card">
          <Icon aria-hidden="true" />
          <p>{label}</p>
          <strong>{value}</strong>
          <span>{note}</span>
        </SurfaceCard>
      ))}
      <SurfaceCard className="sector-progress-card">
        <p>Progress status</p>
        <div>
          <b>72%</b>
        </div>
        <span>Complete</span>
      </SurfaceCard>
    </section>
  );
}

function SynthesisBand() {
  return (
    <SurfaceCard className="sectors-synthesis-band">
      <Leaf aria-hidden="true" />
      <div>
        <h2>Synthesis</h2>
        <p>
          Sectors reveal the external forces and influences acting on your site. Microclimates show
          how those forces shape local conditions. Zones organize the land into functional areas
          that support your goals. Together, they guide the placement of buildings, gardens,
          circulation, and protected areas.
        </p>
      </div>
      <button type="button">
        <Route aria-hidden="true" /> How it connects{' '}
        <span>See how this module aligns with your design layers</span>
        <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function SectorCompassCard() {
  const nav = useDetailNav();
  const helps = [
    'Understand incoming forces & opportunities',
    'Protect and enhance positive influences',
    'Reduce or buffer negative impacts',
    'Position key elements with confidence',
  ];
  return (
    <SurfaceCard className="sector-tool-card compass-tool-card">
      <header>
        <h2>
          <span>1</span> Sector compass
        </h2>
      </header>
      <p>Map the forces and influences that arrive at your site.</p>
      <div className="compass-card-body">
        <CroppedArt src={sectorCompass} className="sector-compass-image" />
        <div>
          <h3>This analysis helps you:</h3>
          {helps.map((item) => (
            <p key={item}>
              <Leaf aria-hidden="true" />
              {item}
            </p>
          ))}
        </div>
      </div>
      <button
        className="green-button"
        type="button"
        onClick={() => nav.push('sector-compass')}
      >
        Open Sector compass <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function CartographicCard() {
  const nav = useDetailNav();
  const layers: Array<[string, string]> = [
    ['Microclimate areas', '4'],
    ['Functional zones', '6'],
    ['Circulation links', '3'],
    ['Water features', ''],
    ['Contours & topography', ''],
    ['Sector overlays', '5'],
  ];
  return (
    <SurfaceCard className="sector-tool-card cartographic-tool-card">
      <header>
        <h2>
          <Layers aria-hidden="true" />
          <span>2</span> Cartographic detail
        </h2>
      </header>
      <p>Visualize microclimates, zones, and sector influences on your map.</p>
      <div className="cartographic-card-body">
        <CroppedArt src={cartographicPreview} className="cartographic-preview-image" />
        <div>
          <h3>Layer summary</h3>
          {layers.map(([name, count]) => (
            <p key={name}>
              <span />
              {name}
              <b>{count}</b>
            </p>
          ))}
        </div>
      </div>
      <button
        className="green-button"
        type="button"
        onClick={() => nav.push('cartographic')}
      >
        Open Cartographic detail <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function SectorsSidebar() {
  const implications: Array<[LucideIcon, string]> = [
    [Droplet, 'Buildings on ridges capture breezes and views, away from cold air pockets.'],
    [Sun, 'Gardens in warm, protected microclimates for longer seasons.'],
    [Droplet, 'Water systems follow natural flow and infiltration opportunities.'],
    [Route, 'Circulation aligns with contours, access, and desire lines.'],
    [Leaf, 'Protected areas buffer risks like wind, fire, and noise.'],
  ];
  const opportunities = [
    'Sheltered north-facing growing pockets',
    'Solar access for winter passive gain',
    'Seasonal water capture & infiltration',
    'Strong views to the valley and ranges',
    'Reliable access with low-impact entry',
  ];
  const actions = [
    'Refine zones based on slope & soils',
    'Place key elements using zone logic',
    'Develop access & circulation plan',
    'Plan water systems & storage',
  ];
  return (
    <aside className="sectors-sidebar">
      <SurfaceCard className="sector-side-card implications">
        <h2>
          Design implications <CircleHelp aria-hidden="true" />
        </h2>
        {implications.map(([Icon, text]) => (
          <p key={text}>
            <Icon aria-hidden="true" />
            {text}
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="sector-side-card opportunities">
        <h2>Detected opportunities</h2>
        {opportunities.map((item) => (
          <p key={item}>
            <Leaf aria-hidden="true" />
            {item}
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="sector-side-card next-actions">
        <h2>Recommended next actions</h2>
        {actions.map((item, index) => (
          <p key={item}>
            <b>{index + 1}</b>
            {item}
          </p>
        ))}
        <button className="green-button" type="button">
          Go to next: Site Analysis <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
