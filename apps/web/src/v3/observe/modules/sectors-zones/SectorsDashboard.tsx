import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Compass,
  Download,
  Flame,
  Layers,
  Leaf,
  Mountain,
  Route,
  Shield,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { pickTruthy } from '@ogden/shared';
import { SurfaceCard } from '../../_shared/components/index.js';
import { api } from '../../../../lib/apiClient.js';
import SectorRadiusControl from '../../components/SectorRadiusControl.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import TerrainSnapshot from '../topography/TerrainSnapshot.js';
import SectorCompassDiagram from './SectorCompassDiagram.js';
import {
  sectorsKpis,
  zoneCounts,
  sectorCounts,
  dominantWindDir,
  type KpiIconKey,
  type KpiItem,
} from './derivations.js';
import { polygonCentroid } from '../macroclimate-hazards/derivations.js';
import sectorHero from '../../assets/sectors-dashboard/sector-hero.png';

const ICON_MAP: Record<KpiIconKey, LucideIcon> = {
  compass: Compass,
  layers: Layers,
  wind: Wind,
  sun: Sun,
  flame: Flame,
  mountain: Mountain,
  shield: Shield,
};

export default function SectorsDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);

  const allSectors = useExternalForcesStore((s) => s.sectors);
  const sectors = useMemo(() => allSectors.filter((s) => s.projectId === id), [allSectors, id]);
  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === id), [allZones, id]);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);

  const centroid = polygonCentroid(project?.location?.boundary);
  const centroidTuple: [number, number] | null = centroid
    ? [centroid.lng, centroid.lat]
    : null;

  const kpis = sectorsKpis(sectors, zones, layers);
  const sc = sectorCounts(sectors);
  const zc = zoneCounts(zones);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const wind = dominantWindDir(layers);
      const totalAreaM2 = zones.reduce((acc, z) => acc + (z.areaM2 || 0), 0);
      const { data } = await api.exports.generate(id, {
        exportType: 'sectors_zones_report',
        payload: {
          sectorsZones: {
            sectors: sectors.map((s) => ({
              id: s.id,
              type: s.type,
              bearingDeg: s.bearingDeg,
              arcDeg: s.arcDeg,
              ...pickTruthy(s, ['intensity', 'notes']),
            })),
            zones: zones.map((z) => ({
              id: z.id,
              name: z.name,
              category: z.category,
              areaM2: z.areaM2,
              ...pickTruthy(z, ['primaryUse', 'secondaryUse', 'notes']),
              ...(z.invasivePressure ? { invasivePressure: z.invasivePressure } : {}),
              ...(z.successionStage ? { successionStage: z.successionStage } : {}),
              ...(z.seasonality ? { seasonality: z.seasonality } : {}),
              ...(z.permacultureZone != null
                ? { permacultureZone: z.permacultureZone }
                : {}),
            })),
            sectorCounts: {
              total: sc.total,
              wind: sc.wind,
              sun: sc.sun,
              fire: sc.fire,
              noise: sc.noise,
              wildlife: sc.wildlife,
              view: sc.view,
            },
            zoneCounts: {
              total: zc.total,
              byCategory: zc.byCategory as Record<string, number>,
              totalAreaM2,
            },
            ...(wind && wind !== '—' ? { prevailingWind: wind } : {}),
          },
        },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('Sectors & Zones report export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="detail-page sectors-page">
      <section className="sectors-layout">
        <div className="sectors-main">
          <SectorsHero onExport={handleExport} exporting={exporting} />
          <SectorsMetrics kpis={kpis} />
          <SynthesisBand />
          <SurfaceCard className="sector-radius-card">
            <h2 style={{ margin: 0, fontSize: 14 }}>Sector wedge calibration</h2>
            <SectorRadiusControl projectId={id} />
          </SurfaceCard>
          <section className="sectors-tool-grid">
            <SectorCompassCard sectors={sectors} centroid={centroidTuple} arrowCount={sc.total} />
            <CartographicCard
              boundary={project?.location?.boundary}
              sc={sc}
              zc={zc}
              windDir={dominantWindDir(layers)}
            />
          </section>
        </div>
        <SectorsSidebar />
      </section>
    </div>
  );
}

interface SectorsHeroProps {
  onExport: () => void;
  exporting: boolean;
}

function SectorsHero({ onExport, exporting }: SectorsHeroProps) {
  return (
    <section className="sectors-hero">
      <img src={sectorHero} className="sectors-hero-art" alt="" aria-hidden="true" />
      <div className="sectors-hero-copy">
        <span>5</span>
        <div>
          <h1>Sectors, Microclimates &amp; Zones</h1>
          <p>
            Use sector analysis, microclimate patterns, and zones to inform where and how each
            design element belongs on the land.
          </p>
        </div>
        <button type="button" onClick={onExport} disabled={exporting}>
          <Download aria-hidden="true" />{' '}
          {exporting ? 'Generating…' : 'Export sectors report'}
        </button>
      </div>
    </section>
  );
}

interface SectorsMetricsProps {
  kpis: KpiItem[];
}

function SectorsMetrics({ kpis }: SectorsMetricsProps) {
  return (
    <section className="sectors-metrics-row">
      {kpis.map((item) => {
        const Icon = ICON_MAP[item.iconKey];
        return (
          <SurfaceCard key={item.label} className={`sector-metric-card ${item.tone}`}>
            <Icon aria-hidden="true" />
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </SurfaceCard>
        );
      })}
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

interface SectorCompassCardProps {
  sectors: ReturnType<typeof useExternalForcesStore.getState>['sectors'];
  centroid: [number, number] | null;
  arrowCount: number;
}

function SectorCompassCard({ sectors, centroid, arrowCount }: SectorCompassCardProps) {
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
        {arrowCount > 0 && <em>{arrowCount} arrows</em>}
      </header>
      <p>Map the forces and influences that arrive at your site.</p>
      <div className="compass-card-body">
        <SectorCompassDiagram
          sectors={sectors}
          centroid={centroid}
          compact
          className="sector-compass-image"
        />
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
    </SurfaceCard>
  );
}

interface CartographicCardProps {
  boundary?: GeoJSON.Polygon;
  sc: ReturnType<typeof sectorCounts>;
  zc: ReturnType<typeof zoneCounts>;
  windDir: string;
}

function CartographicCard({ boundary, sc, zc }: CartographicCardProps) {
  const layers: Array<[string, string]> = [
    ['Microclimate areas', '—'],
    ['Functional zones', zc.total > 0 ? String(zc.total) : '—'],
    ['Circulation links', '—'],
    ['Water features', '—'],
    ['Contours & topography', '—'],
    ['Sector overlays', sc.total > 0 ? String(sc.total) : '—'],
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
        <TerrainSnapshot
          boundary={boundary}
          width={200}
          height={150}
          className="cartographic-preview-image"
        />
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
    </SurfaceCard>
  );
}

function SectorsSidebar() {
  const implications: Array<[LucideIcon, string]> = [
    [Wind, 'Buildings on ridges capture breezes and views, away from cold air pockets.'],
    [Sun, 'Gardens in warm, protected microclimates for longer seasons.'],
    [Layers, 'Water systems follow natural flow and infiltration opportunities.'],
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
        <h2>Design implications</h2>
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
      </SurfaceCard>
    </aside>
  );
}
