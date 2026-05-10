import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Download,
  Droplet,
  Home,
  Layers,
  Leaf,
  Map,
  Mountain,
  Ruler,
  ShieldAlert,
  Sun,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { CroppedArt, ProgressRing, SurfaceCard } from '../../_shared/components/index.js';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import heroTerrain from '../../assets/topography-dashboard/hero-terrain.png';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import {
  useTopographyStore,
  type Transect,
} from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { api } from '../../../../lib/apiClient.js';
import AspectCompass from './AspectCompass.js';
import ElevationProfileChart from './ElevationProfileChart.js';
import TerrainSnapshot from './TerrainSnapshot.js';
import {
  featureCounts,
  getElevationLayer,
  topographyKpis,
  type KpiItem,
} from './derivations.js';

const ICON_MAP: Record<KpiItem['iconKey'], LucideIcon> = {
  triangle: Triangle,
  mountain: Mountain,
  ruler: Ruler,
  compass: Compass,
  layers: Layers,
  map: Map,
};

export default function TopographyDashboard() {
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
  const elevationSummary = getElevationLayer(layers)?.summary;

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data } = await api.exports.generate(id, {
        exportType: 'topography_report',
        payload: {
          topography: {
            elevationSummary: elevationSummary
              ? {
                  min_elevation_m: elevationSummary.min_elevation_m ?? null,
                  max_elevation_m: elevationSummary.max_elevation_m ?? null,
                  mean_slope_deg: elevationSummary.mean_slope_deg ?? null,
                  max_slope_deg: elevationSummary.max_slope_deg ?? null,
                  predominant_aspect: elevationSummary.predominant_aspect ?? null,
                }
              : null,
            contours: contours.map((c) => ({
              id: c.id,
              ...(c.elevationM != null ? { elevationM: c.elevationM } : {}),
              ...(c.notes ? { notes: c.notes } : {}),
              createdAt: c.createdAt,
            })),
            highPoints: highPoints.map((h) => ({
              id: h.id,
              position: h.position,
              kind: h.kind,
              ...(h.elevationM != null ? { elevationM: h.elevationM } : {}),
              ...(h.label ? { label: h.label } : {}),
              ...(h.notes ? { notes: h.notes } : {}),
              createdAt: h.createdAt,
            })),
            drainageLines: drainageLines.map((d) => ({
              id: d.id,
              ...(d.notes ? { notes: d.notes } : {}),
              createdAt: d.createdAt,
            })),
            transects: transects.map((t) => ({
              id: t.id,
              name: t.name,
              pointA: t.pointA,
              pointB: t.pointB,
              ...(t.sampledAt ? { sampledAt: t.sampledAt } : {}),
              ...(t.sourceApi !== undefined ? { sourceApi: t.sourceApi } : {}),
              ...(t.confidence ? { confidence: t.confidence } : {}),
              ...(t.totalDistanceM != null ? { totalDistanceM: t.totalDistanceM } : {}),
              ...(t.notes ? { notes: t.notes } : {}),
            })),
          },
        },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('Topography report export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="detail-page topography-page">
      <section className="topography-layout">
        <div className="topography-main">
          <TopographyHeader onExport={handleExport} exporting={exporting} />
          <TopographyMetrics layers={layers} transects={transects} />
          <TopographySynthesis summary={elevationSummary} counts={counts} />
          <section className="topography-tool-grid">
            <TerrainToolCard
              boundary={project?.location?.boundary}
              caption={project?.name}
            />
            <CrossSectionToolCard transect={transects[0]} />
          </section>
          <AnnotationListCard
            title="Field annotations"
            projectId={projectId ?? null}
            kinds={['contourLine', 'highPoint', 'drainageLine']}
            emptyHint="No contours, elevation points, or drainage lines yet — trace one with the tools panel."
          />
        </div>
        <TopographySidebar
          summary={elevationSummary}
          counts={counts}
          aspect={elevationSummary?.predominant_aspect ?? null}
        />
      </section>
    </div>
  );
}

interface TopographyHeaderProps {
  onExport: () => void;
  exporting: boolean;
}

function TopographyHeader({ onExport, exporting }: TopographyHeaderProps) {
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
        <button type="button" onClick={onExport} disabled={exporting}>
          <Download aria-hidden="true" />{' '}
          {exporting ? 'Generating…' : 'Export terrain report'}
        </button>
      </div>
      <CroppedArt src={heroTerrain} className="topography-hero-art" />
    </header>
  );
}

interface MetricsProps {
  layers: ReturnType<typeof useSiteDataStore.getState>['dataByProject'][string]['layers'] | undefined;
  transects: Transect[];
}

function TopographyMetrics({ layers, transects }: MetricsProps) {
  const items = topographyKpis(layers, transects);
  return (
    <section className="topography-metric-grid">
      {items.map((item) => {
        const Icon = ICON_MAP[item.iconKey];
        return (
          <SurfaceCard
            className={`topography-metric-card tone-${item.tone}`}
            key={item.label}
          >
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

interface SynthesisProps {
  summary: ReturnType<typeof getElevationLayer> extends infer L
    ? L extends { summary: infer S } ? S : undefined
    : undefined;
  counts: ReturnType<typeof featureCounts>;
}

function TopographySynthesis({ summary, counts }: SynthesisProps) {
  const range =
    summary?.min_elevation_m != null && summary?.max_elevation_m != null
      ? Math.round(summary.max_elevation_m - summary.min_elevation_m)
      : null;
  const aspect = summary?.predominant_aspect;
  const meanSlope = summary?.mean_slope_deg;

  const synopsis = !summary
    ? 'Elevation data pending — once a DEM is sampled, the dashboard will summarise the site shape.'
    : `${meanSlope != null ? `Mean slope ${meanSlope.toFixed(1)}°` : 'Slope data partial'}${
        range != null ? `, ${range} m of total relief` : ''
      }${aspect ? ` and a ${aspect} aspect` : ''}. ${
        counts.total === 0
          ? 'No field annotations yet — trace contours, high points, or drainage lines to start building a base map.'
          : `${counts.total} field annotation${counts.total === 1 ? '' : 's'} so far.`
      }`;

  const items: Array<[LucideIcon, string, string]> = [
    [
      Droplet,
      'Water',
      counts.drainageLines > 0
        ? `${counts.drainageLines} drainage line${counts.drainageLines === 1 ? '' : 's'} traced — use them to plan swales, ponds and infiltration.`
        : 'Trace drainage lines on the map to surface water-harvesting opportunities here.',
    ],
    [
      Leaf,
      'Soil & stability',
      summary?.max_slope_deg != null && summary.max_slope_deg > 25
        ? 'Steep zones present — protect them with vegetation and avoid cut/fill.'
        : 'Mostly stable slopes; protect any exposed ridge lines and swale entries.',
    ],
    [
      Home,
      'Access & zones',
      counts.highPoints > 0
        ? `${counts.highPoints} elevation point${counts.highPoints === 1 ? '' : 's'} pinned — useful anchors for buildings or zones.`
        : 'Pin high and low points to find buildable benches and productive zones.',
    ],
  ];

  return (
    <SurfaceCard className="topography-synthesis">
      <div className="topography-synthesis-copy">
        <span>Topography synthesis</span>
        <h2>
          {summary
            ? `${aspect ? `${aspect}-facing` : 'Site'} terrain with ${
                range != null ? `${range} m relief` : 'partial relief data'
              }.`
            : 'Topography synthesis pending'}
        </h2>
        <p>{synopsis}</p>
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

interface TerrainToolCardProps {
  boundary: GeoJSON.Polygon | undefined;
  caption: string | undefined;
}

function TerrainToolCard({ boundary, caption }: TerrainToolCardProps) {
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
        <TerrainSnapshot
          boundary={boundary}
          caption={caption}
          width={240}
          height={160}
          className="topography-tool-image"
        />
      </div>
      <div className="tool-card-actions">
        <small>Best for: Detailed analysis of slope, aspect, elevation and landforms.</small>
      </div>
    </SurfaceCard>
  );
}

interface CrossSectionToolCardProps {
  transect: Transect | undefined;
}

function CrossSectionToolCard({ transect }: CrossSectionToolCardProps) {
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
        <ElevationProfileChart
          transect={transect}
          compact
          className="topography-tool-image"
        />
      </div>
      <div className="tool-card-actions">
        <small>
          Best for: Understanding elevation change, solar exposure, drainage swales, dams,
          buildings and cut/fill balance.
        </small>
      </div>
    </SurfaceCard>
  );
}

interface SidebarProps {
  summary: SynthesisProps['summary'];
  counts: ReturnType<typeof featureCounts>;
  aspect: string | null;
}

function TopographySidebar({ summary, counts, aspect }: SidebarProps) {
  const implications: Array<[LucideIcon, string, string]> = [];
  if (counts.drainageLines > 0) {
    implications.push([
      Droplet,
      'Drainage lines mapped',
      `${counts.drainageLines} traced — design swales and infiltration along them.`,
    ]);
  } else {
    implications.push([
      Droplet,
      'Trace drainage to plan water',
      'Mark seasonal runoff paths to plan swales and ponds.',
    ]);
  }
  if (summary?.max_slope_deg != null && summary.max_slope_deg > 25) {
    implications.push([
      ShieldAlert,
      'Steep zones present',
      `Max slope ${summary.max_slope_deg.toFixed(1)}° — protect with vegetation, avoid cut/fill.`,
    ]);
  } else {
    implications.push([
      ShieldAlert,
      'Low erosion risk overall',
      'Most slopes are gentle; still protect exposed ridges and swale entries.',
    ]);
  }
  if (aspect) {
    implications.push([
      Sun,
      `Aspect: ${aspect}`,
      'Use aspect to place sun-loving plants and passive-solar buildings.',
    ]);
  }
  if (counts.highPoints > 0) {
    implications.push([
      Home,
      'Buildable anchors pinned',
      `${counts.highPoints} elevation point${counts.highPoints === 1 ? '' : 's'} ready for siting decisions.`,
    ]);
  } else {
    implications.push([
      Home,
      'Pin high and low points',
      'Anchors help locate buildings, zones, and water storage.',
    ]);
  }

  const features: Array<[string, number]> = [
    ['Contour lines', counts.contours],
    ['Elevation points', counts.highPoints],
    ['Drainage lines', counts.drainageLines],
    ['A–B transects', counts.transects],
  ];

  const actions: Array<[string, string]> = [
    [
      counts.drainageLines === 0 ? 'Trace drainage lines' : 'Design water harvesting system',
      'High',
    ],
    [counts.transects === 0 ? 'Draw an A–B transect' : 'Add another transect', 'High'],
    [
      counts.highPoints === 0 ? 'Pin high and low points' : 'Identify building sites',
      'Medium',
    ],
    ['Walk the site to verify drainage', 'Medium'],
    ['Estimate earthworks (cut/fill)', 'Low'],
  ];

  const healthPct = Math.min(100, counts.total * 10 + (summary ? 40 : 0));

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
          Detected terrain features <b>{counts.total}</b>
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
      <SurfaceCard className="topography-side-card aspect-card">
        <h2>Aspect</h2>
        <AspectCompass aspect={aspect} size={96} />
        <strong>{aspect ?? '—'}</strong>
        <small>Predominant facing direction.</small>
      </SurfaceCard>
      <SurfaceCard className="topography-health-card">
        <h2>
          Module health <strong>{healthPct >= 70 ? 'Good' : healthPct >= 40 ? 'Forming' : 'Empty'}</strong>
        </h2>
        <i>
          <b />
        </i>
        <p>
          {healthPct >= 70
            ? 'Topographic data captured. You’re ready to move into design.'
            : healthPct >= 40
              ? 'Some topographic data present. Add annotations to deepen the picture.'
              : 'Trace contours, drainage and pin elevation points to start a base map.'}
        </p>
        <ProgressRing value={healthPct} label={`${healthPct}%`} />
      </SurfaceCard>
    </aside>
  );
}
