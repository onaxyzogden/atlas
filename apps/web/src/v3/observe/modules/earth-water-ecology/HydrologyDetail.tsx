import {
  ArrowRight,
  ChevronDown,
  Download,
  Droplet,
  Leaf,
  Plus,
  RotateCcw,
  Sun,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import hydrologyMap from '../../assets/hydrology-detail/site-hydrology-map.png';
import hydrologyProfile from '../../assets/hydrology-detail/hydrology-profile.png';
import waterBalance from '../../assets/hydrology-detail/water-balance.png';
import flowAccumulation from '../../assets/hydrology-detail/flow-accumulation.png';

export default function HydrologyDetail() {
  return (
    <div className="detail-page hydrology-detail-page">
      <section className="hydrology-layout">
        <div className="hydrology-main">
          <HydrologyHeader />
          <HydrologyKpis />
          <section className="hydrology-content-grid">
            <HydrologyMapPanel />
            <div className="hydrology-analysis-column">
              <HydrologyProfilePanel />
              <InfiltrationPanel />
            </div>
          </section>
          <section className="hydrology-bottom-grid">
            <WaterBalancePanel />
            <WatershedSummaryPanel />
            <RiskFlagsPanel />
          </section>
        </div>
        <HydrologySidebar />
      </section>
    </div>
  );
}

function HydrologyHeader() {
  return (
    <header className="hydrology-header">
      <div className="hydrology-title-row">
        <Droplet aria-hidden="true" />
        <div>
          <h1>Hydrology detail</h1>
          <p>
            Understand how water moves across your site. Analyze runoff, infiltration, drainage
            patterns and harvesting opportunities to design with water, not against it.
          </p>
        </div>
      </div>
    </header>
  );
}

function HydrologyKpis() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Waves, 'Runoff direction', 'SE (125 degrees)', 'Primary flow path'],
    [Droplet, 'Water points', '3', 'Perennial & seasonal'],
    [Leaf, 'Infiltration status', 'Moderate', '15 mm/hr avg.'],
    [Waves, 'Watershed pattern', 'Dendritic', 'Good flow distribution'],
    [Droplet, 'Capture opportunities', '4', 'Swales, ponds, keylines'],
    [Sun, 'Seasonal water stress', 'Moderate', 'Dry season (Jun-Sep)'],
  ];
  return (
    <SurfaceCard className="hydrology-kpi-strip">
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

function HydrologyMapPanel() {
  return (
    <SurfaceCard className="hydrology-map-panel">
      <header>
        <h2>Site hydrology map</h2>
        <button type="button">
          Flow visualization <ChevronDown aria-hidden="true" />
        </button>
      </header>
      <div className="hydrology-map-wrap">
        <CroppedArt src={hydrologyMap} className="hydrology-detail-map" />
        <button className="hydrology-reset" type="button">
          <RotateCcw aria-hidden="true" /> Map layers
        </button>
      </div>
    </SurfaceCard>
  );
}

function HydrologyProfilePanel() {
  return (
    <SurfaceCard className="hydrology-small-panel hydrology-profile-panel">
      <h2>
        Hydrology profile <small>(primary flow path)</small>
      </h2>
      <p>
        Length: 380 m <span>Elev. drop: 24.8 m</span> <span>Avg. slope: 6.5%</span>
      </p>
      <CroppedArt src={hydrologyProfile} className="hydrology-profile-image" />
    </SurfaceCard>
  );
}

function InfiltrationPanel() {
  return (
    <SurfaceCard className="hydrology-small-panel infiltration-panel">
      <header>
        <h2>Infiltration &amp; runoff</h2>
        <button type="button">
          Details <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <div className="infiltration-content">
        <div className="runoff-donut">
          <b>42%</b>
          <span>Runoff</span>
          <em>58% Infiltration</em>
        </div>
        <dl>
          <div>
            <dt>Infiltration rate (avg.)</dt>
            <dd>
              15 mm/hr <span>Moderate</span>
            </dd>
          </div>
          <div>
            <dt>Runoff coefficient (C)</dt>
            <dd>
              0.42 <span>Moderate</span>
            </dd>
          </div>
          <div>
            <dt>Time to ponding</dt>
            <dd>&gt; 45 min</dd>
          </div>
          <div>
            <dt>Soil texture</dt>
            <dd>Loam / Clay loam</dd>
          </div>
        </dl>
      </div>
    </SurfaceCard>
  );
}

function RiskFlagsPanel() {
  const rows: Array<[string, string, string]> = [
    ['Erosion risk on slopes > 15%', 'Where bare soil and runoff converge.', 'High'],
    ['Concentrated flow near access track', 'Potential gully formation.', 'Medium'],
    ['Low infiltration in upper paddock', 'Compaction and surface sealing.', 'Medium'],
    ['Dry season water stress', 'Jun-Sep likely water shortage.', 'Medium'],
  ];
  return (
    <SurfaceCard className="hydrology-small-panel risk-flags-panel">
      <h2>Risk flags</h2>
      {rows.map(([title, note, level]) => (
        <p key={title}>
          <TriangleAlert aria-hidden="true" />
          <b>
            {title}
            <small>{note}</small>
          </b>
          <em>{level}</em>
        </p>
      ))}
      <button className="green-button" type="button">
        View all risks <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function WaterBalancePanel() {
  return (
    <SurfaceCard className="hydrology-bottom-panel water-balance-panel">
      <header>
        <h2>
          Water balance <small>(long-term average)</small>
        </h2>
        <button type="button">
          Monthly <ChevronDown aria-hidden="true" />
        </button>
      </header>
      <CroppedArt src={waterBalance} className="water-balance-image" />
      <div className="water-balance-stats">
        <span>
          Annual rainfall <b>1,032 mm</b>
        </span>
        <span>
          Annual ET <b>842 mm</b>
        </span>
        <span>
          Surplus <b>+190 mm</b>
        </span>
        <span>
          Dry season deficit <b>-68 mm</b>
        </span>
      </div>
    </SurfaceCard>
  );
}

function WatershedSummaryPanel() {
  return (
    <SurfaceCard className="hydrology-bottom-panel watershed-panel">
      <header>
        <h2>Watershed summary</h2>
        <button type="button">
          Details <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <div className="watershed-content">
        <dl>
          <div>
            <dt>Watershed area</dt>
            <dd>14.2 ha</dd>
          </div>
          <div>
            <dt>Longest flow path</dt>
            <dd>420 m</dd>
          </div>
          <div>
            <dt>Relief (max-min)</dt>
            <dd>48 m</dd>
          </div>
          <div>
            <dt>Drainage density</dt>
            <dd>1.28 km/ha</dd>
          </div>
          <div>
            <dt>Contributing area</dt>
            <dd>14.2 ha (100%)</dd>
          </div>
        </dl>
        <CroppedArt src={flowAccumulation} className="flow-accumulation-image" />
      </div>
    </SurfaceCard>
  );
}

function HydrologySidebar() {
  const insights = [
    'Water flows primarily to the SE, following a dendritic drainage pattern to the main creek.',
    'Good opportunity to slow, spread and sink water with swales along the 320-330 m contour.',
    'Three reliable water points support biodiversity and can be anchors for water harvesting.',
    'Moderate infiltration - improve soil structure and protect ground cover on key slopes.',
  ];
  const recommendations = [
    'Install contour swales on 320-330 m contour.',
    'Create 2-3 ponds in low-lying capture zones.',
    'Protect riparian zone along the creek (20 m buffer).',
    'Use keyline pattern to naturally disperse water.',
  ];
  const actions: Array<[string, string, string, string]> = [
    [
      'Create contour swale (upper paddock)',
      'Reduce runoff and increase infiltration.',
      'High',
      'Due in 7 days',
    ],
    [
      'Install check dams on main flow path',
      'Slow water and reduce erosion.',
      'High',
      'Due in 14 days',
    ],
    [
      'Establish riparian buffer planting',
      'Stabilize banks and improve water quality.',
      'Medium',
      'Due in 21 days',
    ],
    [
      'Add organic mulch to bare slopes',
      'Improve infiltration and soil health.',
      'Low',
      'Due in 30 days',
    ],
  ];

  return (
    <aside className="hydrology-sidebar">
      <SurfaceCard className="hydrology-side-card insights">
        <h2>
          Hydrology insights{' '}
          <button type="button">
            View full report <ArrowRight aria-hidden="true" />
          </button>
        </h2>
        {insights.map((item) => (
          <p key={item}>
            <Leaf aria-hidden="true" />
            {item}
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="hydrology-side-card recommendations">
        <h2>Design recommendations</h2>
        {recommendations.map((item) => (
          <p key={item}>
            <Droplet aria-hidden="true" />
            {item}
            <ArrowRight aria-hidden="true" />
          </p>
        ))}
        <button className="green-button" type="button">
          View design overlay <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
      <SurfaceCard className="hydrology-side-card hydrology-actions">
        <h2>
          Recommended actions{' '}
          <button type="button">
            Prioritize <ChevronDown aria-hidden="true" />
          </button>
        </h2>
        {actions.map(([title, note, level, due], index) => (
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
        <button className="green-button" type="button">
          <Plus aria-hidden="true" /> Add to design plan
        </button>
      </SurfaceCard>
      <SurfaceCard className="hydrology-export-card">
        <button type="button">
          <Download aria-hidden="true" /> Export hydrology data <ChevronDown aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
