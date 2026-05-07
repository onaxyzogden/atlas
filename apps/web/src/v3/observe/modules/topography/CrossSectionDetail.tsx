import { useMemo, useState } from 'react';
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
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import {
  useTopographyStore,
  type Transect,
} from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import ElevationProfileChart from './ElevationProfileChart.js';
import SeasonalSolarStrip from './SeasonalSolarStrip.js';
import TerrainSnapshot from './TerrainSnapshot.js';
import {
  getElevationLayer,
  polygonCentroid,
  slopeBand,
  transectStats,
} from './derivations.js';

const DASH = '—';

export default function CrossSectionDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);
  const allTransects = useTopographyStore((s) => s.transects);
  const transects = useMemo(
    () => allTransects.filter((t) => t.projectId === id),
    [allTransects, id],
  );
  const removeTransect = useTopographyStore((s) => s.removeTransect);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = transects.find((t) => t.id === activeId) ?? transects[0];
  const stats = transectStats(active);
  const lat = polygonCentroid(project?.location?.boundary)?.lat ?? null;
  const elevationSummary = getElevationLayer(layers)?.summary;

  return (
    <div className="detail-page cross-section-page">
      <section className="cross-layout">
        <div className="cross-main">
          <CrossHeader />
          <CrossKpis transect={active} />
          <CrossChartPanel transect={active} />
          <section className="cross-bottom-grid">
            <ObservationPanel transect={active} />
            <TransectLibrary
              transects={transects}
              activeId={active?.id}
              onSelect={(tid) => setActiveId(tid)}
              onRemove={removeTransect}
            />
            <SeasonalPanel lat={lat} />
          </section>
        </div>
        <CrossSidebar
          boundary={project?.location?.boundary}
          caption={project?.name}
          stats={stats}
          aspect={elevationSummary?.predominant_aspect ?? null}
        />
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

interface KpiProps {
  transect: Transect | undefined;
}

function CrossKpis({ transect }: KpiProps) {
  const stats = transectStats(transect);
  const slope = slopeBand(stats?.meanSlopePct);
  const items: Array<[LucideIcon, string, string, string]> = [
    [
      Ruler,
      'Transect length',
      stats?.totalDistanceM ? `${Math.round(stats.totalDistanceM)} m` : DASH,
      transect ? 'A to B' : 'No transect',
    ],
    [
      Mountain,
      'Elevation change',
      stats ? `${stats.deltaM.toFixed(1)} m` : DASH,
      stats ? 'High to low' : '—',
    ],
    [
      Triangle,
      'Mean slope',
      stats ? `${stats.meanSlopePct.toFixed(1)}%` : DASH,
      stats ? slope.label : '—',
    ],
    [Sun, 'Solar exposure (ann.)', DASH, 'Needs lat × bearing'],
    [Trees, 'Vertical elements', String(transect?.verticalRefs?.length ?? 0), 'Pinned along transect'],
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

function CrossChartPanel({ transect }: KpiProps) {
  return (
    <SurfaceCard className="cross-chart-panel">
      <ElevationProfileChart
        transect={transect}
        showVerticalRefs
        className="cross-chart-image"
      />
      {transect ? null : (
        <p className="empty-note">
          No transects yet — draw an A–B line on the terrain map to start a cross-section.
        </p>
      )}
    </SurfaceCard>
  );
}

function ObservationPanel({ transect }: KpiProps) {
  const items: Array<[string, string, string]> = [];
  if (transect?.notes) {
    items.push(['Field notes', transect.notes, 'green']);
  }
  const verticalRefs = transect?.verticalRefs ?? [];
  if (verticalRefs.length > 0) {
    items.push([
      `${verticalRefs.length} pinned element${verticalRefs.length === 1 ? '' : 's'}`,
      verticalRefs
        .map((r) => `${r.kind} @ ${Math.round(r.distanceAlongTransectM)} m`)
        .join(' · '),
      'green',
    ]);
  }
  if (items.length === 0) {
    items.push([
      transect ? 'No observations yet' : 'No transect selected',
      'Add field notes or pin vertical elements (trees, structures, swales) along the transect.',
      'blue',
    ]);
  }

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

interface LibraryProps {
  transects: Transect[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function TransectLibrary({ transects, activeId, onSelect, onRemove }: LibraryProps) {
  return (
    <SurfaceCard className="cross-panel transect-library">
      <h2>Section library</h2>
      {transects.length === 0 ? (
        <p className="empty-note">No transects drawn yet.</p>
      ) : (
        transects.map((t, idx) => {
          const stats = transectStats(t);
          const note = stats
            ? `${stats.totalDistanceM ? `${Math.round(stats.totalDistanceM)} m` : '—'} · ${stats.deltaM.toFixed(1)} m drop`
            : 'Profile pending';
          const isActive = t.id === activeId;
          return (
            <div className="transect-row" key={t.id}>
              <b>{idx + 1}</b>
              <button
                type="button"
                className="transect-row-select"
                onClick={() => onSelect(t.id)}
              >
                {t.name}
                <small>{note}</small>
              </button>
              {isActive ? <em>Active</em> : null}
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                className="icon-button"
                onClick={() => onRemove(t.id)}
              >
                ×
              </button>
            </div>
          );
        })
      )}
      <button className="outlined-button" type="button">
        <Plus /> New transect
      </button>
    </SurfaceCard>
  );
}

interface SeasonalProps {
  lat: number | null;
}

function SeasonalPanel({ lat }: SeasonalProps) {
  return (
    <SurfaceCard className="cross-panel seasonal-panel">
      <h2>
        Seasonal comparison <small>(solar altitude at noon)</small>
      </h2>
      <SeasonalSolarStrip lat={lat} className="seasonal-chart-image" />
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

interface CrossSidebarProps {
  boundary: GeoJSON.Polygon | undefined;
  caption: string | undefined;
  stats: ReturnType<typeof transectStats>;
  aspect: string | null;
}

function CrossSidebar({ boundary, caption, stats, aspect }: CrossSidebarProps) {
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
        <TerrainSnapshot
          boundary={boundary}
          caption={caption}
          width={280}
          height={180}
          overlays={['contours']}
          className="transect-map-image"
        />
        <small className="transect-aspect">Site aspect: {aspect ?? '—'}</small>
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
            <dd>{DASH}</dd>
          </div>
          <div>
            <dt>Fill</dt>
            <dd>{DASH}</dd>
          </div>
          <div>
            <dt>Net</dt>
            <dd>{stats ? `${stats.deltaM.toFixed(1)} m drop` : DASH}</dd>
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
