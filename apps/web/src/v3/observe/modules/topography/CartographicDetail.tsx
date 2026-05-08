import {
  ArrowRight,
  Briefcase,
  Camera,
  Compass,
  Download,
  Droplet,
  Eye,
  Leaf,
  Map,
  Route,
  Settings,
  SlidersHorizontal,
  Sun,
  Thermometer,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import mainMap from '../../assets/cartographic-detail/main-map.png';
import legendStrip from '../../assets/cartographic-detail/legend-strip.png';

export default function CartographicDetail() {
  return (
    <div className="detail-page cartographic-page">
      <header className="cartographic-header">
        <div>
          <h1>Cartographic detail</h1>
          <p>
            Explore the full spatial context of your site. Toggle layers, interrogate patterns,
            and understand how sectors, microclimates and zones work together.
          </p>
        </div>
        <button type="button">Project settings</button>
      </header>
      <section className="cartographic-layout">
        <LayerPanel />
        <div className="cartographic-main">
          <CartographicKpis />
          <SurfaceCard className="cartographic-map-card">
            <CroppedArt src={mainMap} className="cartographic-main-map" />
            <button className="cartographic-workspace-button" type="button">
              Open map workspace <ArrowRight aria-hidden="true" />
              <span>Advanced editing &amp; analysis</span>
            </button>
            <div className="cartographic-map-tools">
              {['+', '-', 'layers', 'target', 'measure'].map((item) => (
                <button key={item} type="button">
                  {item}
                </button>
              ))}
            </div>
          </SurfaceCard>
          <SurfaceCard className="cartographic-legend-card">
            <CroppedArt src={legendStrip} className="cartographic-legend-image" />
            <button type="button">
              Download legend <Download aria-hidden="true" />
            </button>
          </SurfaceCard>
        </div>
        <CartographicSidebar />
      </section>
    </div>
  );
}

function CartographicKpis() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Wind, 'Sectors mapped', '5', 'Primary sectors'],
    [Thermometer, 'Microclimate areas', '7', 'Distinct areas'],
    [Leaf, 'Zone allocations', '12', 'Zone types'],
    [Route, 'Circulation routes', '8', 'Paths & access'],
    [Sun, 'Opportunity hotspots', '6', 'High potential areas'],
  ];
  return (
    <SurfaceCard className="cartographic-kpi-strip">
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

function LayerPanel() {
  const layers: Array<[LucideIcon, string, string, boolean]> = [
    [Wind, 'Sectors', 'Sun, wind, fire, view & access', true],
    [Thermometer, 'Microclimates', 'Temperature, moisture, wind', true],
    [Leaf, 'Zones', 'Permaculture zone allocations', true],
    [Route, 'Circulation', 'Paths, tracks & access points', true],
    [Briefcase, 'Structures', 'Existing & proposed', true],
    [Map, 'Contours', '2 m interval', true],
    [Leaf, 'Vegetation', 'Canopy & key species', true],
    [Droplet, 'Water features', 'Hydrology & flows', true],
    [Compass, 'Soils', 'Texture & drainage', false],
    [SlidersHorizontal, 'Utilities', 'Services & infrastructure', false],
    [Camera, 'Photos & notes', 'Field observations', false],
  ];
  return (
    <SurfaceCard className="cartographic-layer-panel">
      <header>
        <h2>Map layers</h2>
        <button type="button">
          Reset <Settings aria-hidden="true" />
        </button>
      </header>
      {layers.map(([Icon, title, note, active]) => (
        <p className={active ? 'is-active' : ''} key={title}>
          <Icon aria-hidden="true" />
          <span>
            {title}
            <small>{note}</small>
          </span>
          <Eye aria-hidden="true" />
        </p>
      ))}
      <button className="green-button" type="button">
        Edit layers <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function CartographicSidebar() {
  const patterns: Array<[string, string]> = [
    [
      'Solar gradient',
      'Strong north exposure creates excellent warming potential for Zones 1 & 2.',
    ],
    [
      'Sheltered core',
      'Central low area offers wind protection and water harvesting potential.',
    ],
    [
      'Water flow convergence',
      'Multiple swales converge near the pond - ideal for infiltration systems.',
    ],
    [
      'Access efficiency',
      'Primary access provides good reach to main zones; minor path upgrades recommended.',
    ],
    [
      'Ridge lines',
      'Ridgetops are exposed - consider wind breaks or low-profile plantings.',
    ],
  ];

  const recommendations = [
    'Refine Zone 1 layout and bed placement',
    'Design swale network along contours',
    'Plan windbreaks on western boundary',
    'Add additional water storage near Zone 3',
    'Validate access for machinery & vehicles',
  ];

  return (
    <aside className="cartographic-sidebar">
      <SurfaceCard className="cartographic-side-card patterns">
        <h2>
          Detected patterns <b>7</b>
        </h2>
        {patterns.map(([title, note]) => (
          <p key={title}>
            <Sun aria-hidden="true" />
            <span>
              {title}
              <small>{note}</small>
            </span>
          </p>
        ))}
        <button type="button">
          View all patterns <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
      <SurfaceCard className="cartographic-side-card recommendations">
        <h2>
          Recommended next actions <b>5</b>
        </h2>
        {recommendations.map((item) => (
          <p key={item}>
            <Leaf aria-hidden="true" />
            <span>{item}</span>
          </p>
        ))}
        <button className="green-button" type="button">
          View detailed recommendations <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
      <SurfaceCard className="cartographic-side-card map-info">
        <h2>Map information</h2>
        <dl>
          <div>
            <dt>Projection</dt>
            <dd>WGS 84 / UTM Zone 56S</dd>
          </div>
          <div>
            <dt>Contour interval</dt>
            <dd>2 m</dd>
          </div>
          <div>
            <dt>Map date</dt>
            <dd>12 Apr 2025</dd>
          </div>
          <div>
            <dt>Data sources</dt>
            <dd>LiDAR, Imagery, Field Survey</dd>
          </div>
        </dl>
        <button className="green-button" type="button">
          <Download aria-hidden="true" /> Export map <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
