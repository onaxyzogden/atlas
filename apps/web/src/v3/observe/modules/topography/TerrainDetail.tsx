import {
  CheckCircle2,
  ChevronDown,
  Download,
  Droplet,
  Layers,
  MapPin,
  Mountain,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Triangle,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import mainTerrainMap from '../../assets/terrain-detail/main-terrain-map.png';
import slopeMap from '../../assets/terrain-detail/slope-map.png';
import elevationHistogram from '../../assets/terrain-detail/elevation-histogram.png';
import elevationProfile from '../../assets/terrain-detail/elevation-profile.png';

export default function TerrainDetail() {
  return (
    <div className="detail-page terrain-detail-page">
      <TerrainHeader />
      <TerrainMetrics />
      <section className="terrain-workspace">
        <div className="terrain-main-column">
          <TerrainMapPanel />
          <section className="terrain-lower-grid">
            <ElevationProfilePanel />
            <DetectedFeaturesPanel />
          </section>
        </div>
        <TerrainSidebar />
      </section>
    </div>
  );
}

function TerrainHeader() {
  return (
    <header className="terrain-header">
      <div>
        <h1>Terrain detail</h1>
        <p>
          Read the shape of the land. Understand elevation, slope, aspect and water movement so
          you can design with the land, not against it.
        </p>
      </div>
      <div className="terrain-header-actions">
        <button className="green-button" type="button">
          <Plus aria-hidden="true" /> Create transect
        </button>
        <button className="outlined-button" type="button">
          <Download aria-hidden="true" /> Export terrain report
        </button>
        <button className="outlined-button" type="button">
          <Layers aria-hidden="true" /> Compare layers
        </button>
      </div>
    </header>
  );
}

function TerrainMetrics() {
  const items: Array<[LucideIcon, string, string, string, string]> = [
    [Triangle, 'Mean slope', '4.2 degrees', 'Gentle', 'Predominantly gentle slopes.'],
    [
      Mountain,
      'Elevation range',
      '240-268 m',
      '28 m total range',
      'Lowest to highest point on site.',
    ],
    [SlidersHorizontal, 'Aspect tendency', 'SE', '135 degrees', 'Slopes face mainly SE.'],
    [
      Waves,
      'Dominant landforms',
      'Mid-slopes & lower rises',
      '',
      'Rolling terrain with gentle benches.',
    ],
    [MapPin, 'A-B transects', '1', 'Mapped', 'Cross-sections mapped across site.'],
  ];

  return (
    <section className="terrain-metric-grid">
      {items.map(([Icon, label, value, pill, note]) => (
        <SurfaceCard className="terrain-metric-card" key={label}>
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

function TerrainMapPanel() {
  const layers: Array<[string, string, boolean]> = [
    ['Slope', 'On', true],
    ['Contours (2 m)', 'On', true],
    ['Hillshade', 'On', true],
    ['Aspect', 'Off', false],
    ['Elevation', 'On', true],
    ['Parcel boundary', 'On', true],
  ];
  return (
    <SurfaceCard className="terrain-map-panel">
      <CroppedArt src={mainTerrainMap} className="terrain-main-map" />
      <div className="terrain-layer-card">
        <h2>Layers</h2>
        {layers.map(([label, state, enabled]) => (
          <p key={label}>
            <b className={enabled ? 'on' : ''}>{enabled ? '✓' : ''}</b>
            <span>{label}</span>
            <em>{state}</em>
          </p>
        ))}
      </div>
      <div className="terrain-legend-card">
        <h2>Legend</h2>
        <p>Slope (%)</p>
        {['> 25', '15-25', '8-15', '4-8', '0-4'].map((item, index) => (
          <span className={`slope-step s${index}`} key={item}>
            {item}
          </span>
        ))}
      </div>
      <div className="terrain-map-tools">
        <button type="button">+</button>
        <button type="button">-</button>
        <button type="button">
          <Settings aria-hidden="true" />
        </button>
        <button type="button">
          <Layers aria-hidden="true" />
        </button>
      </div>
      <button className="reset-view-button" type="button">
        <RotateCcw aria-hidden="true" /> Reset view
      </button>
    </SurfaceCard>
  );
}

function ElevationProfilePanel() {
  return (
    <SurfaceCard className="terrain-panel elevation-profile-panel">
      <header>
        <h2>Elevation profile (A-B transect)</h2>
        <span>Length: 412 m</span>
      </header>
      <CroppedArt src={elevationProfile} className="elevation-profile-image" />
    </SurfaceCard>
  );
}

function DetectedFeaturesPanel() {
  const rows: Array<[string, string, string]> = [
    ['Ridgeline', '1', 'High spine running N-S'],
    ['Valley line / Drainage', '2', 'Concentration zones'],
    ['Keypoint candidates', '4', 'Potential design anchors'],
    ['Erosion-prone zones', '1', 'Steeper slopes, exposed soil'],
    ['Access-friendly route', '1', 'Contours < 8% slope'],
  ];

  return (
    <SurfaceCard className="terrain-panel terrain-features-panel">
      <header>
        <h2>Detected features</h2>
        <button className="outlined-button" type="button">
          View on map <ChevronDown aria-hidden="true" />
        </button>
      </header>
      {rows.map(([label, count, note]) => (
        <p key={label}>
          <Waves aria-hidden="true" />
          <b>{label}</b>
          <em>{count}</em>
          <span>{note}</span>
        </p>
      ))}
    </SurfaceCard>
  );
}

function TerrainSidebar() {
  const insights = [
    'Ridge line runs north-south through the centre of the site.',
    'Mid-slopes on the east face offer good water harvesting opportunities.',
    'Drainage concentrates in the eastern gully system.',
    'Gentle bench areas in the southwest are suitable for dwellings or productive zones.',
  ];

  const actions: Array<[string, string, string]> = [
    [
      'Create swale test line on mid-slope',
      'High',
      'Capture and infiltrate seasonal runoff.',
    ],
    [
      'Add additional transect',
      'Medium',
      'Map another cross-section across the eastern gully.',
    ],
    [
      'Verify runoff paths in field',
      'Medium',
      'Confirm drainage lines and pond opportunities.',
    ],
    ['Evaluate access route', 'Low', 'Walk the suggested route and note constraints.'],
  ];

  return (
    <aside className="terrain-sidebar">
      <SurfaceCard className="terrain-side-panel slope-panel">
        <h2>Slope map</h2>
        <CroppedArt src={slopeMap} className="terrain-slope-map" />
      </SurfaceCard>
      <SurfaceCard className="terrain-side-panel histogram-panel">
        <header>
          <h2>Elevation distribution</h2>
          <span>28 m range</span>
        </header>
        <CroppedArt src={elevationHistogram} className="terrain-histogram" />
      </SurfaceCard>
      <SurfaceCard className="terrain-side-panel insights-panel">
        <h2>Terrain insights</h2>
        {insights.map((item) => (
          <p key={item}>
            <CheckCircle2 aria-hidden="true" />
            {item}
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="terrain-side-panel next-actions-panel">
        <h2>Recommended next actions</h2>
        {actions.map(([title, level, note]) => (
          <p key={title}>
            <Droplet aria-hidden="true" />
            <b>
              {title}
              <small>{note}</small>
            </b>
            <em>{level}</em>
          </p>
        ))}
      </SurfaceCard>
    </aside>
  );
}
