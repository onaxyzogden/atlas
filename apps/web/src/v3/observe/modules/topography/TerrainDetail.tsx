import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Compass,
  Download,
  Droplet,
  Layers,
  MapPin,
  Mountain,
  Plus,
  Ruler,
  Triangle,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import ElevationHistogram from './ElevationHistogram.js';
import ElevationProfileChart from './ElevationProfileChart.js';
import SlopeLegendStrip from './SlopeLegendStrip.js';
import TerrainSnapshot, { type TerrainOverlay } from './TerrainSnapshot.js';
import {
  featureCounts,
  topographyKpis,
  type KpiItem,
} from './derivations.js';

const ICON_MAP: Record<KpiItem['iconKey'], LucideIcon> = {
  triangle: Triangle,
  mountain: Mountain,
  ruler: Ruler,
  compass: Compass,
  layers: Layers,
  map: MapPin,
};

const OVERLAYS: TerrainOverlay[] = ['slope', 'contours', 'aspect', 'elevation', 'hillshade'];

export default function TerrainDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);
  const allTransects = useTopographyStore((s) => s.transects);
  const allContours = useTopographyStore((s) => s.contours);
  const allHighPoints = useTopographyStore((s) => s.highPoints);
  const allDrainageLines = useTopographyStore((s) => s.drainageLines);
  const transects = useMemo(
    () => allTransects.filter((t) => t.projectId === id),
    [allTransects, id],
  );
  const contours = useMemo(
    () => allContours.filter((c) => c.projectId === id),
    [allContours, id],
  );
  const highPoints = useMemo(
    () => allHighPoints.filter((h) => h.projectId === id),
    [allHighPoints, id],
  );
  const drainageLines = useMemo(
    () => allDrainageLines.filter((d) => d.projectId === id),
    [allDrainageLines, id],
  );
  const counts = featureCounts({ contours, highPoints, drainageLines, transects });

  const [active, setActive] = useState<TerrainOverlay[]>([
    'slope',
    'contours',
    'hillshade',
    'elevation',
  ]);
  const toggle = (k: TerrainOverlay) =>
    setActive((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <div className="detail-page terrain-detail-page">
      <TerrainHeader />
      <TerrainMetrics layers={layers} transects={transects} />
      <section className="terrain-workspace">
        <div className="terrain-main-column">
          <TerrainMapPanel
            boundary={project?.location?.boundary}
            caption={project?.name}
            overlays={active}
            onToggle={toggle}
            contours={contours}
            highPoints={highPoints}
            drainageLines={drainageLines}
          />
          <section className="terrain-lower-grid">
            <ElevationProfilePanel transect={transects[0]} />
            <DetectedFeaturesPanel counts={counts} />
          </section>
        </div>
        <TerrainSidebar
          layers={layers}
          boundary={project?.location?.boundary}
          caption={project?.name}
          counts={counts}
        />
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

interface MetricsProps {
  layers: ReturnType<typeof useSiteDataStore.getState>['dataByProject'][string]['layers'] | undefined;
  transects: ReturnType<typeof useTopographyStore.getState>['transects'];
}

function TerrainMetrics({ layers, transects }: MetricsProps) {
  const items = topographyKpis(layers, transects);
  return (
    <section className="terrain-metric-grid">
      {items.map((item) => {
        const Icon = ICON_MAP[item.iconKey];
        return (
          <SurfaceCard className={`terrain-metric-card tone-${item.tone}`} key={item.label}>
            <Icon aria-hidden="true" />
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.pill ? <em>{item.pill}</em> : null}
            </div>
            <p>{item.note}</p>
          </SurfaceCard>
        );
      })}
    </section>
  );
}

interface MapPanelProps {
  boundary: GeoJSON.Polygon | undefined;
  caption: string | undefined;
  overlays: TerrainOverlay[];
  onToggle: (k: TerrainOverlay) => void;
  contours: ReturnType<typeof useTopographyStore.getState>['contours'];
  highPoints: ReturnType<typeof useTopographyStore.getState>['highPoints'];
  drainageLines: ReturnType<typeof useTopographyStore.getState>['drainageLines'];
}

function TerrainMapPanel({
  boundary,
  caption,
  overlays,
  onToggle,
  contours,
  highPoints,
  drainageLines,
}: MapPanelProps) {
  return (
    <SurfaceCard className="terrain-map-panel">
      <TerrainSnapshot
        boundary={boundary}
        caption={caption}
        width={520}
        height={320}
        overlays={overlays}
        contours={contours}
        highPoints={highPoints}
        drainageLines={drainageLines}
        className="terrain-main-map"
      />
      <div className="terrain-layer-card">
        <h2>Layers</h2>
        {OVERLAYS.map((k) => {
          const enabled = overlays.includes(k);
          return (
            <button
              key={k}
              type="button"
              className={`layer-toggle ${enabled ? 'on' : ''}`}
              onClick={() => onToggle(k)}
              data-overlay={k}
            >
              <b>{enabled ? '✓' : ''}</b>
              <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
              <em>{enabled ? 'On' : 'Off'}</em>
            </button>
          );
        })}
      </div>
      <div className="terrain-legend-card">
        <SlopeLegendStrip />
      </div>
    </SurfaceCard>
  );
}

interface ProfileProps {
  transect: ReturnType<typeof useTopographyStore.getState>['transects'][number] | undefined;
}

function ElevationProfilePanel({ transect }: ProfileProps) {
  return (
    <SurfaceCard className="terrain-panel elevation-profile-panel">
      <header>
        <h2>Elevation profile (A–B transect)</h2>
        <span>
          {transect?.totalDistanceM
            ? `Length: ${Math.round(transect.totalDistanceM)} m`
            : transect
              ? 'Length: —'
              : 'No transect drawn'}
        </span>
      </header>
      <ElevationProfileChart transect={transect} className="elevation-profile-image" />
    </SurfaceCard>
  );
}

interface FeaturesProps {
  counts: ReturnType<typeof featureCounts>;
}

function DetectedFeaturesPanel({ counts }: FeaturesProps) {
  const rows: Array<[string, number, string]> = [
    ['Contour lines', counts.contours, 'User-traced contour annotations'],
    ['Drainage lines', counts.drainageLines, 'Concentration and runoff paths'],
    ['Elevation points', counts.highPoints, 'High and low pinned anchors'],
    ['A–B transects', counts.transects, 'Cross-section samples'],
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
      {counts.total === 0 ? (
        <small className="empty-note">No features traced yet — draw on the map to populate.</small>
      ) : null}
    </SurfaceCard>
  );
}

interface SidebarProps {
  layers: MetricsProps['layers'];
  boundary: GeoJSON.Polygon | undefined;
  caption: string | undefined;
  counts: ReturnType<typeof featureCounts>;
}

function TerrainSidebar({ layers, boundary, caption, counts }: SidebarProps) {
  const insights: string[] = [];
  if (counts.contours > 0)
    insights.push(`${counts.contours} contour line${counts.contours === 1 ? '' : 's'} traced.`);
  if (counts.drainageLines > 0)
    insights.push(
      `${counts.drainageLines} drainage line${counts.drainageLines === 1 ? '' : 's'} mapped — design swales along them.`,
    );
  if (counts.highPoints > 0)
    insights.push(`${counts.highPoints} high/low point${counts.highPoints === 1 ? '' : 's'} pinned.`);
  if (insights.length === 0)
    insights.push('No annotations yet — trace contours, drainage and pin high/low points.');

  const actions: Array<[string, string, string]> = [
    [
      counts.drainageLines > 0 ? 'Plan swale on a drainage line' : 'Trace primary drainage paths',
      counts.drainageLines > 0 ? 'High' : 'High',
      'Capture and infiltrate seasonal runoff.',
    ],
    [
      counts.transects > 0 ? 'Add additional transect' : 'Draw an A–B transect',
      'Medium',
      'Map cross-sections for elevation, water and solar.',
    ],
    ['Verify runoff paths in field', 'Medium', 'Confirm drainage lines and pond opportunities.'],
    ['Evaluate access route', 'Low', 'Walk the suggested route and note constraints.'],
  ];

  return (
    <aside className="terrain-sidebar">
      <SurfaceCard className="terrain-side-panel slope-panel">
        <h2>Slope map</h2>
        <TerrainSnapshot
          boundary={boundary}
          caption={caption}
          width={280}
          height={180}
          overlays={['slope']}
          className="terrain-slope-map"
        />
      </SurfaceCard>
      <SurfaceCard className="terrain-side-panel histogram-panel">
        <header>
          <h2>Elevation distribution</h2>
        </header>
        <ElevationHistogram layers={layers} className="terrain-histogram" />
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
