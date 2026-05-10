import { useMemo, useState } from 'react';
import {
  Beaker,
  Binoculars,
  Download,
  Droplet,
  FlaskConical,
  Leaf,
  MapPin,
  Sprout,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { api } from '../../../../lib/apiClient.js';
import { pickDefined, pickTruthy } from '@ogden/shared';
import WaterSystemsSnapshot from './WaterSystemsSnapshot.js';
import SpeciesObservationList from './SpeciesObservationList.js';
import {
  earthwaterKpis,
  getCriticalHabitatLayer,
  getSoilsLayer,
  getWatershedLayer,
  getWetlandsLayer,
  waterCounts,
  type KpiIconKey,
} from './derivations.js';

const ICON_MAP: Record<KpiIconKey, LucideIcon> = {
  droplet: Droplet,
  leaf: Leaf,
  layers: Beaker,
  beaker: FlaskConical,
  mountain: Binoculars,
  waves: Waves,
};

export default function EarthWaterEcologyDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);

  const allObservations = useEcologyStore((s) => s.ecology);
  const allZones = useEcologyStore((s) => s.ecologyZones);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allStorage = useWaterSystemsStore((s) => s.storageInfra);
  const allWatercourses = useWaterSystemsStore((s) => s.watercourses);
  const allSamples = useSoilSampleStore((s) => s.samples);
  const successionStage = useEcologyStore((s) => s.successionStageByProject[id]);

  const observations = useMemo(() => allObservations.filter((o) => o.projectId === id), [allObservations, id]);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === id), [allZones, id]);
  const earthworks = useMemo(() => allEarthworks.filter((e) => e.projectId === id), [allEarthworks, id]);
  const storage = useMemo(() => allStorage.filter((s) => s.projectId === id), [allStorage, id]);
  const watercourses = useMemo(() => allWatercourses.filter((w) => w.projectId === id), [allWatercourses, id]);
  const samples = useMemo(() => allSamples.filter((s) => s.projectId === id), [allSamples, id]);

  const kpis = earthwaterKpis(layers, samples, observations, earthworks, storage, watercourses);
  const watershed = getWatershedLayer(layers);
  const wc = waterCounts(earthworks, storage, watercourses);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const wetlands = getWetlandsLayer(layers);
      const habitat = getCriticalHabitatLayer(layers);
      const soils = getSoilsLayer(layers);
      const { data } = await api.exports.generate(id, {
        exportType: 'earth_water_ecology_report',
        payload: {
          earthWaterEcology: {
            soilSamples: samples.map((s) => ({
              id: s.id,
              sampleDate: s.sampleDate,
              label: s.label,
              depth: s.depth,
              ...pickDefined(s, [
                'ph',
                'organicMatterPct',
                'texture',
                'cecMeq100g',
                'ecDsM',
                'bulkDensityGCm3',
                'percolationInPerHr',
                'depthToBedrockM',
              ]),
              ...pickTruthy(s, ['biologicalActivity', 'notes', 'lab', 'location']),
              ...(s.jarTest != null ? { hasJarTest: true } : {}),
              ...(s.roofCatchment != null ? { hasRoofCatchment: true } : {}),
            })),
            waterSystems: {
              earthworks: earthworks.map((e) => ({
                id: e.id,
                type: e.type,
                ...pickDefined(e, ['lengthM']),
                ...pickTruthy(e, ['notes']),
                createdAt: e.createdAt,
              })),
              storageInfra: storage.map((s) => ({
                id: s.id,
                type: s.type,
                center: s.center,
                ...pickDefined(s, ['capacityL']),
                ...pickTruthy(s, ['notes']),
                createdAt: s.createdAt,
              })),
              watercourses: watercourses.map((w) => ({
                id: w.id,
                kind: w.kind,
                ...pickDefined(w, ['perennial']),
                ...pickTruthy(w, ['notes']),
                createdAt: w.createdAt,
              })),
            },
            ecology: {
              observations: observations.map((o) => ({
                id: o.id,
                species: o.species,
                trophicLevel: o.trophicLevel,
                observedAt: o.observedAt,
                ...pickTruthy(o, ['notes', 'location']),
              })),
              zones: zones.map((z) => ({
                id: z.id,
                dominantStage: z.dominantStage,
                ...pickTruthy(z, ['label', 'notes']),
                createdAt: z.createdAt,
              })),
              ...(successionStage ? { successionStage } : {}),
            },
            siteLayers: {
              ...(watershed ? { watershed: watershed.summary as Record<string, unknown> } : {}),
              ...(wetlands ? { wetlandsPresent: (wetlands.summary.wetland_pct ?? 0) > 0 } : {}),
              ...(habitat ? { criticalHabitatPresent: habitat.summary.on_site === true } : {}),
              ...(soils ? { soilsSummary: soils.summary as Record<string, unknown> } : {}),
            },
          },
        },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('Earth · Water · Ecology report export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="detail-page diagnostics-page">
      <ModuleHeader />
      <SurfaceCard className="diagnostic-kpi-strip">
        {kpis.map((item) => {
          const Icon = ICON_MAP[item.iconKey];
          return (
            <div className={`diagnostic-kpi tone-${item.tone}`} key={item.label}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </div>
          );
        })}
      </SurfaceCard>
      <ExportActions onExport={handleExport} exporting={exporting} />
      <section className="diagnostic-grid">
        <SiteMapCard
          boundary={project?.location?.boundary}
          caption={project?.name}
          earthworks={earthworks}
          watercourses={watercourses}
          storage={storage}
          flowDirection={watershed?.summary.flow_direction}
        />
        <SoilDiagnosticsCard samples={samples} />
        <HydrologyCard wc={wc} flowDirection={watershed?.summary.flow_direction ?? null} />
        <EcologyCard observations={observations} />
        <AnnotationListCard
          title="Field annotations"
          projectId={projectId ?? null}
          kinds={['soilSample', 'watercourse', 'ecologyZone']}
          emptyHint="No soil samples, watercourses, or ecology zones recorded yet — drop one with the tools panel."
        />
        <RecommendedActionsCard wc={wc} observationCount={observations.length} sampleCount={samples.length} />
      </section>
    </div>
  );
}

function ModuleHeader() {
  return (
    <header className="module-header">
      <div className="module-title-block">
        <div className="module-title-row">
          <b>4</b>
          <div>
            <h1>Earth, Water &amp; Ecology Diagnostics</h1>
            <p>
              Understand the living systems of your site. Diagnose soils, hydrology and ecology to
              reveal opportunities, risks and patterns that inform wise design.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

interface ExportActionsProps {
  onExport: () => void;
  exporting: boolean;
}

function ExportActions({ onExport, exporting }: ExportActionsProps) {
  return (
    <div className="diagnostic-tabs-row">
      <div className="diagnostic-actions">
        <button
          className="outlined-button"
          type="button"
          onClick={onExport}
          disabled={exporting}
        >
          <Download aria-hidden="true" /> {exporting ? 'Generating…' : 'Export report'}
        </button>
      </div>
    </div>
  );
}

interface SiteMapCardProps {
  boundary: GeoJSON.Polygon | undefined;
  caption: string | undefined;
  earthworks: ReturnType<typeof useWaterSystemsStore.getState>['earthworks'];
  watercourses: ReturnType<typeof useWaterSystemsStore.getState>['watercourses'];
  storage: ReturnType<typeof useWaterSystemsStore.getState>['storageInfra'];
  flowDirection: string | undefined;
}

function SiteMapCard({ boundary, caption, earthworks, watercourses, storage, flowDirection }: SiteMapCardProps) {
  return (
    <SurfaceCard className="diagnostic-panel site-map-panel">
      <header className="panel-header">
        <h2>Site map &amp; observations</h2>
      </header>
      <WaterSystemsSnapshot
        boundary={boundary}
        caption={caption}
        width={320}
        height={200}
        overlays={['contours']}
        className="site-map-image"
        earthworks={earthworks}
        watercourses={watercourses}
        storageInfra={storage}
      />
      <div className="map-legend">
        <span><Droplet /> Water point</span>
        <span><Leaf /> Soil sample</span>
        <span><MapPin /> Erosion risk</span>
        <span><Sprout /> Vegetation</span>
        {flowDirection && <small>Flow: {flowDirection}</small>}
      </div>
    </SurfaceCard>
  );
}

interface SoilCardProps {
  samples: ReturnType<typeof useSoilSampleStore.getState>['samples'];
}

function SoilDiagnosticsCard({ samples }: SoilCardProps) {
  return (
    <SurfaceCard className="diagnostic-panel soil-panel">
      <header className="panel-header">
        <h2>Soil diagnostics</h2>
      </header>
      <div className="soil-row-list">
        {samples.length === 0 ? (
          <p className="empty-note">No soil samples yet — add a sample via the tools panel.</p>
        ) : (
          samples.slice(0, 5).map((s) => (
            <div className="soil-row" key={s.id}>
              <Beaker aria-hidden="true" />
              <div>
                <strong>{s.label}</strong>
                <span>
                  {s.depth}{s.ph != null ? ` · pH ${s.ph}` : ''}{s.organicMatterPct != null ? ` · OM ${s.organicMatterPct}%` : ''}
                </span>
              </div>
              <b className={s.ph != null && s.ph >= 6 && s.ph <= 7.5 ? 'good' : 'moderate'}>
                {s.ph != null ? `pH ${s.ph}` : '—'}
              </b>
              <i><em style={{ left: `${s.ph != null ? Math.min(100, ((s.ph - 4) / 6) * 100) : 50}%` }} /></i>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}

interface HydrologyCardProps {
  wc: ReturnType<typeof waterCounts>;
  flowDirection: string | null;
}

function HydrologyCard({ wc, flowDirection }: HydrologyCardProps) {
  return (
    <SurfaceCard className="diagnostic-panel hydrology-panel">
      <header className="panel-header">
        <h2>Hydrology overview</h2>
      </header>
      <div className="hydrology-layout">
        <dl>
          <div>
            <dt>Runoff direction</dt>
            <dd>{flowDirection ?? '—'}<span>Primary flow path</span></dd>
          </div>
          <div>
            <dt>Watercourses</dt>
            <dd>{wc.watercourses}<span>Mapped</span></dd>
          </div>
          <div>
            <dt>Earthworks</dt>
            <dd>{wc.earthworks}<span>Swales, drains, diversions</span></dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>{wc.storage}<span>Cisterns, ponds, rain gardens</span></dd>
          </div>
        </dl>
      </div>
      {wc.total === 0 && (
        <p className="warning-note">
          <TriangleAlert aria-hidden="true" /> <b>Tip:</b> Map watercourses, earthworks and storage to build the water picture.
        </p>
      )}
    </SurfaceCard>
  );
}

interface EcologyCardProps {
  observations: ReturnType<typeof useEcologyStore.getState>['ecology'];
}

function EcologyCard({ observations }: EcologyCardProps) {
  return (
    <SurfaceCard className="diagnostic-panel ecology-panel">
      <header className="panel-header">
        <h2>Ecology observations</h2>
      </header>
      <SpeciesObservationList observations={observations} compact className="species-image" />
      {observations.length === 0 && (
        <p className="biodiversity-note">
          <Leaf aria-hidden="true" /> <b>Tip:</b> Record species observations to build a trophic picture of the site.
        </p>
      )}
    </SurfaceCard>
  );
}

interface ActionsCardProps {
  wc: ReturnType<typeof waterCounts>;
  observationCount: number;
  sampleCount: number;
}

function RecommendedActionsCard({ wc, observationCount, sampleCount }: ActionsCardProps) {
  const actions: Array<[string, string, string]> = [];
  if (wc.earthworks === 0) actions.push(['Design and install a contour swale', 'Capture runoff and reduce erosion risk.', 'High']);
  if (sampleCount === 0) actions.push(['Collect soil samples', 'Run jar, percolation and lab tests.', 'High']);
  if (observationCount === 0) actions.push(['Log ecology observations', 'Record species and trophic levels.', 'Medium']);
  if (wc.storage === 0) actions.push(['Plan water storage', 'Site a pond, cistern or rain garden.', 'Medium']);
  if (actions.length === 0) {
    actions.push(['Deepen hydrology analysis', 'Model water balance and infiltration.', 'Medium']);
    actions.push(['Protect riparian corridor', 'Fence and revegetate with natives.', 'Medium']);
  }

  return (
    <SurfaceCard className="diagnostic-panel actions-panel">
      <header className="panel-header">
        <h2>Recommended next actions</h2>
      </header>
      <div className="action-list">
        {actions.map(([title, note, priority], index) => (
          <div className="action-item" key={title}>
            <b>{index + 1}</b>
            <div>
              <strong>{title}</strong>
              <span>{note}</span>
            </div>
            <em className={priority.toLowerCase()}>{priority}</em>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
