import { useMemo } from 'react';
import {
  ArrowRight,
  Camera,
  Compass,
  Download,
  Droplet,
  Eye,
  Leaf,
  Map,
  Mountain,
  Route,
  Settings,
  SlidersHorizontal,
  Sun,
  Triangle,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import SlopeLegendStrip from './SlopeLegendStrip.js';
import TerrainSnapshot from './TerrainSnapshot.js';
import {
  featureCounts,
  getElevationLayer,
  slopeBand,
} from './derivations.js';

export default function CartographicDetail() {
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
  const elevation = getElevationLayer(layers)?.summary;

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
      <SurfaceCard className="cartographic-banner">
        Cartographic overlays surface here as you build out later modules. Currently showing
        topography only.
      </SurfaceCard>
      <section className="cartographic-layout">
        <LayerPanel counts={counts} />
        <div className="cartographic-main">
          <CartographicKpis counts={counts} />
          <SurfaceCard className="cartographic-map-card">
            <TerrainSnapshot
              boundary={project?.location?.boundary}
              caption={project?.name}
              width={520}
              height={320}
              overlays={['contours', 'elevation', 'slope']}
              contours={contours}
              highPoints={highPoints}
              drainageLines={drainageLines}
              className="cartographic-main-map"
            />
            <button className="cartographic-workspace-button" type="button">
              Open map workspace <ArrowRight aria-hidden="true" />
              <span>Advanced editing &amp; analysis</span>
            </button>
          </SurfaceCard>
          <SurfaceCard className="cartographic-legend-card">
            <SlopeLegendStrip className="cartographic-legend-image" />
            <button type="button">
              Download legend <Download aria-hidden="true" />
            </button>
          </SurfaceCard>
        </div>
        <CartographicSidebar
          counts={counts}
          aspect={elevation?.predominant_aspect ?? null}
          meanSlope={elevation?.mean_slope_deg ?? null}
        />
      </section>
    </div>
  );
}

interface KpiProps {
  counts: ReturnType<typeof featureCounts>;
}

function CartographicKpis({ counts }: KpiProps) {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Wind, 'Sectors mapped', '—', 'Wired in module 5'],
    [Triangle, 'Microclimate areas', '—', 'Wired in module 4'],
    [Leaf, 'Zone allocations', '—', 'Wired in design phase'],
    [Route, 'Circulation routes', '—', 'Wired in design phase'],
    [Mountain, 'Topography annotations', String(counts.total), 'Contours, points, drainage'],
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

function LayerPanel({ counts }: KpiProps) {
  const layers: Array<[LucideIcon, string, string, boolean]> = [
    [Map, 'Contours', `${counts.contours} traced`, counts.contours > 0],
    [Waves, 'Drainage', `${counts.drainageLines} traced`, counts.drainageLines > 0],
    [Mountain, 'Elevation points', `${counts.highPoints} pinned`, counts.highPoints > 0],
    [Compass, 'Transects', `${counts.transects} drawn`, counts.transects > 0],
    [Wind, 'Sectors', 'Module 5', false],
    [Triangle, 'Microclimates', 'Module 4', false],
    [Leaf, 'Vegetation', 'Module 4', false],
    [Droplet, 'Water features', 'Module 4', false],
    [SlidersHorizontal, 'Soils', 'Module 4', false],
    [Camera, 'Photos & notes', 'Field tools', false],
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

interface SidebarProps {
  counts: ReturnType<typeof featureCounts>;
  aspect: string | null;
  meanSlope: number | null;
}

function CartographicSidebar({ counts, aspect, meanSlope }: SidebarProps) {
  const slope = slopeBand(meanSlope);
  const patterns: Array<[string, string]> = [];
  if (aspect) {
    patterns.push([
      `${aspect} aspect`,
      `Slopes face ${aspect} — useful for siting passive-solar elements and sun-loving plants.`,
    ]);
  }
  if (meanSlope != null) {
    patterns.push([
      `${slope.label.toLowerCase()} mean slope`,
      `Mean ${meanSlope.toFixed(1)}° — design swales and access along this grade.`,
    ]);
  }
  if (counts.drainageLines > 0) {
    patterns.push([
      'Drainage paths',
      `${counts.drainageLines} traced — converge points are good infiltration sites.`,
    ]);
  }
  if (counts.highPoints > 0) {
    patterns.push([
      'Elevation anchors',
      `${counts.highPoints} pinned — useful for zone, building or storage placement.`,
    ]);
  }
  if (patterns.length === 0) {
    patterns.push([
      'No patterns yet',
      'Add elevation data and trace topographic features to surface site patterns.',
    ]);
  }

  const recommendations: string[] = [];
  if (counts.contours === 0) recommendations.push('Trace contours along the slope.');
  if (counts.drainageLines === 0) recommendations.push('Mark seasonal drainage paths.');
  if (counts.highPoints === 0) recommendations.push('Pin high and low points as anchors.');
  if (counts.transects === 0) recommendations.push('Draw at least one A–B transect.');
  if (recommendations.length === 0) {
    recommendations.push('Topography baseline is solid — move into module 4 (Earth, Water & Ecology).');
  }

  return (
    <aside className="cartographic-sidebar">
      <SurfaceCard className="cartographic-side-card patterns">
        <h2>
          Detected patterns <b>{patterns.length}</b>
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
      </SurfaceCard>
      <SurfaceCard className="cartographic-side-card recommendations">
        <h2>
          Recommended next actions <b>{recommendations.length}</b>
        </h2>
        {recommendations.map((item) => (
          <p key={item}>
            <Leaf aria-hidden="true" />
            <span>{item}</span>
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="cartographic-side-card map-info">
        <h2>Map information</h2>
        <dl>
          <div>
            <dt>Projection</dt>
            <dd>WGS 84</dd>
          </div>
          <div>
            <dt>Annotations</dt>
            <dd>{counts.total}</dd>
          </div>
          <div>
            <dt>Aspect</dt>
            <dd>{aspect ?? '—'}</dd>
          </div>
          <div>
            <dt>Mean slope</dt>
            <dd>{meanSlope != null ? `${meanSlope.toFixed(1)}°` : '—'}</dd>
          </div>
        </dl>
        <button className="green-button" type="button">
          <Download aria-hidden="true" /> Export map <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
