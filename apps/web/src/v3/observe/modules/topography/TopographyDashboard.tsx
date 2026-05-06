import {
  ArrowRight,
  CheckCircle2,
  Droplet,
  Home,
  Layers,
  Leaf,
  Map,
  Mountain,
  Ruler,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, ProgressRing, SurfaceCard } from '../../_shared/components/index.js';
import { useDetailNav } from '../../components/ModuleSlideUp.js';
import heroTerrain from '../../assets/topography-dashboard/hero-terrain.png';
import terrainPreview from '../../assets/topography-dashboard/terrain-preview.png';
import crossSectionPreview from '../../assets/topography-dashboard/cross-section-preview.png';

export default function TopographyDashboard() {
  return (
    <div className="detail-page topography-page">
      <section className="topography-layout">
        <div className="topography-main">
          <TopographyHeader />
          <TopographyMetrics />
          <TopographySynthesis />
          <section className="topography-tool-grid">
            <TerrainToolCard />
            <CrossSectionToolCard />
          </section>
        </div>
        <TopographySidebar />
      </section>
    </div>
  );
}

function TopographyHeader() {
  return (
    <header className="topography-header">
      <div className="module-title-row">
        <b>3</b>
        <div>
          <h1>Topography &amp; Base Map</h1>
          <p>
            Understand the shape of the land. Explore elevation, slope, aspect and cross-sections
            to design with the terrain, not against it.
          </p>
        </div>
      </div>
      <CroppedArt src={heroTerrain} className="topography-hero-art" />
    </header>
  );
}

function TopographyMetrics() {
  const metrics: Array<[LucideIcon, string, string, string, string]> = [
    [Triangle, 'Mean slope', '4.2 degrees', 'Gentle', 'Predominantly gentle slopes.'],
    [
      Mountain,
      'Elevation range',
      '240-268 m',
      '28 m total range',
      'Lowest to highest point on site.',
    ],
    [Ruler, 'A-B transects', '1', 'Mapped', 'Cross-sections mapped across site.'],
    [SlidersHorizontal, 'Aspect tendency', 'SE', '135 degrees', 'Slopes face mainly SE.'],
    [
      Layers,
      'Dominant landforms',
      'Mid-slopes & lower rises',
      '',
      'Rolling terrain with gentle benches.',
    ],
  ];

  return (
    <section className="topography-metric-grid">
      {metrics.map(([Icon, label, value, pill, note]) => (
        <SurfaceCard className="topography-metric-card" key={label}>
          <Icon aria-hidden="true" />
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
            {pill ? <em>{pill}</em> : null}
          </div>
          <p>{note}</p>
        </SurfaceCard>
      ))}
    </section>
  );
}

function TopographySynthesis() {
  const items: Array<[LucideIcon, string, string]> = [
    [
      Droplet,
      'Water',
      'Natural swales and gentle fall lines support harvesting, infiltration and ponding.',
    ],
    [
      Leaf,
      'Soil & stability',
      'Mostly stable slopes with low erosion risk. Protect exposed ridge lines and swales.',
    ],
    [
      Home,
      'Access & zones',
      'Multiple access points with buildable benches and productive lower slope zones.',
    ],
  ];

  return (
    <SurfaceCard className="topography-synthesis">
      <div className="topography-synthesis-copy">
        <span>Topography synthesis</span>
        <h2>
          A gentle, south-easterly facing landscape with useful water harvesting opportunities.
        </h2>
        <p>
          The site is characterised by gentle mid-slopes and lower rises with a 28 m elevation
          range. Southeast aspect and natural swales create excellent conditions for capturing and
          infiltrating water while offering multiple options for access, building, and productive
          zones.
        </p>
      </div>
      {items.map(([Icon, title, text]) => (
        <article key={title}>
          <Icon aria-hidden="true" />
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </SurfaceCard>
  );
}

function TerrainToolCard() {
  const nav = useDetailNav();
  return (
    <SurfaceCard className="topography-tool-card">
      <header>
        <h2>Terrain detail</h2>
        <span>Primary map</span>
      </header>
      <p>
        Explore the site in detail with contour maps, slope analysis, aspect, and elevation
        layers.
      </p>
      <div className="tool-card-body">
        <dl>
          <div>
            <dt>Contour interval</dt>
            <dd>2 m</dd>
          </div>
          <div>
            <dt>Slope range</dt>
            <dd>0-25 %</dd>
          </div>
          <div>
            <dt>Elevation range</dt>
            <dd>240-268 m</dd>
          </div>
          <div>
            <dt>Parcel boundary</dt>
            <dd>On</dd>
          </div>
        </dl>
        <CroppedArt src={terrainPreview} className="topography-tool-image" />
      </div>
      <div className="tool-card-actions">
        <button className="green-button" type="button" onClick={() => nav.push('terrain-detail')}>
          Open terrain detail <ArrowRight aria-hidden="true" />
        </button>
        <small>Best for: Detailed analysis of slope, aspect, elevation and landforms.</small>
      </div>
    </SurfaceCard>
  );
}

function CrossSectionToolCard() {
  const nav = useDetailNav();
  return (
    <SurfaceCard className="topography-tool-card">
      <header>
        <h2>Cross-section tool</h2>
        <span>Advanced analysis</span>
      </header>
      <p>
        Analyze transects across the site to understand elevation change, water flow and solar
        exposure.
      </p>
      <div className="tool-card-body">
        <dl>
          <div>
            <dt>Active transect</dt>
            <dd>A to B</dd>
          </div>
          <div>
            <dt>Length</dt>
            <dd>612 m</dd>
          </div>
          <div>
            <dt>Elevation drop</dt>
            <dd>27.8 m</dd>
          </div>
          <div>
            <dt>Mean slope</dt>
            <dd>4.2 degrees</dd>
          </div>
          <div>
            <dt>Solar exposure</dt>
            <dd>62 %</dd>
          </div>
        </dl>
        <CroppedArt src={crossSectionPreview} className="topography-tool-image" />
      </div>
      <div className="tool-card-actions">
        <button
          className="green-button"
          type="button"
          onClick={() => nav.push('cross-section')}
        >
          Open cross-section tool <ArrowRight aria-hidden="true" />
        </button>
        <small>
          Best for: Understanding elevation change, solar exposure, drainage swales, dams,
          buildings and cut/fill balance.
        </small>
      </div>
    </SurfaceCard>
  );
}

function TopographySidebar() {
  const implications: Array<[LucideIcon, string, string]> = [
    [
      Droplet,
      'Prime water harvesting potential',
      'Swales and lower slopes are ideal for capturing and slowing water.',
    ],
    [
      ShieldAlert,
      'Low erosion risk overall',
      'Most slopes are gentle; protect exposed ridges and swale entry points.',
    ],
    [
      Sun,
      'Good solar access',
      'Southeast aspect provides strong morning sun and winter warmth.',
    ],
    [
      Home,
      'Multiple buildable options',
      'Benches and lower rises offer flexible locations for buildings and zones.',
    ],
  ];

  const features: Array<[string, string]> = [
    ['Ridges', '1'],
    ['Swales / Drainage lines', '3'],
    ['Gentle benches', '4'],
    ['Steeper slopes (> 15%)', '2'],
    ['Potential water collection zones', '2'],
  ];

  const actions: Array<[string, string]> = [
    ['Map keyline candidates', 'High'],
    ['Design water harvesting system', 'High'],
    ['Identify building sites', 'Medium'],
    ['Plan access & internal routes', 'Medium'],
    ['Estimate earthworks (cut/fill)', 'Low'],
  ];

  return (
    <aside className="topography-sidebar">
      <SurfaceCard className="topography-side-card implications">
        <h2>Design implications</h2>
        {implications.map(([Icon, title, text]) => (
          <p key={title}>
            <Icon aria-hidden="true" />
            <b>{title}</b>
            <span>{text}</span>
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="topography-side-card feature-list">
        <h2>
          Detected terrain features <b>5</b>
        </h2>
        {features.map(([label, value]) => (
          <p key={label}>
            <Map aria-hidden="true" />
            <span>{label}</span>
            <b>{value}</b>
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="topography-side-card actions-list">
        <h2>Recommended next actions</h2>
        {actions.map(([label, priority]) => (
          <p key={label}>
            <CheckCircle2 aria-hidden="true" />
            <span>{label}</span>
            <em>{priority}</em>
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="topography-health-card">
        <h2>
          Module health <strong>Good</strong>
        </h2>
        <i>
          <b />
        </i>
        <p>All key topographic data captured. You&apos;re ready to move into design.</p>
        <ProgressRing value={88} label="88%" />
      </SurfaceCard>
    </aside>
  );
}
