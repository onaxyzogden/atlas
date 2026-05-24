import { useMemo, useState } from 'react';
import {
  Beaker,
  Binoculars,
  CheckCircle2,
  Download,
  Droplet,
  FlaskConical,
  Leaf,
  Sprout,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useVegetationStore } from '../../../../store/vegetationStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { api } from '../../../../lib/apiClient.js';
import { pickDefined, pickTruthy } from '@ogden/shared';
import WaterSystemsSnapshot from './WaterSystemsSnapshot.js';
import SpeciesObservationList from './SpeciesObservationList.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
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
  const allZones = useVegetationStore((s) => s.patches);
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

  // Module health: rough average of presence of 4 systems (samples, water, observations, watershed layer)
  const healthPct = useMemo(() => {
    const parts = [
      samples.length > 0 ? 1 : 0,
      wc.total > 0 ? 1 : 0,
      observations.length > 0 ? 1 : 0,
      watershed != null ? 1 : 0,
    ];
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  }, [samples.length, wc.total, observations.length, watershed]);

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
                dominantStage: z.successionStage,
                groundCover: z.groundCover,
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

  const synthArticles: Array<[LucideIcon, string, string]> = [
    [
      Beaker,
      'Soils',
      samples.length > 0
        ? `${samples.length} sample${samples.length === 1 ? '' : 's'} on record — run jar, perc and lab tests to round out the picture.`
        : 'No soil samples yet — start with a jar test and percolation test in each distinct zone.',
    ],
    [
      Droplet,
      'Hydrology',
      wc.total > 0
        ? `${wc.total} water feature${wc.total === 1 ? '' : 's'} mapped — ${wc.earthworks} earthworks, ${wc.storage} storage, ${wc.watercourses} watercourse${wc.watercourses === 1 ? '' : 's'}.`
        : 'No water features mapped yet — trace watercourses, earthworks and storage to see how water moves.',
    ],
    [
      Leaf,
      'Ecology',
      observations.length > 0
        ? `${observations.length} species observation${observations.length === 1 ? '' : 's'} logged across ${zones.length} mapped zone${zones.length === 1 ? '' : 's'}.`
        : 'No observations yet — log flora, fauna and fungi to build a trophic picture.',
    ],
  ];

  const actions: Array<[string, string]> = [];
  if (wc.earthworks === 0) actions.push(['Design and install a contour swale', 'High']);
  if (samples.length === 0) actions.push(['Collect soil samples', 'High']);
  if (observations.length === 0) actions.push(['Log ecology observations', 'Medium']);
  if (wc.storage === 0) actions.push(['Plan water storage', 'Medium']);
  if (actions.length === 0) {
    actions.push(['Deepen hydrology analysis', 'Medium']);
    actions.push(['Protect riparian corridor', 'Medium']);
  }

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-earth-water-ecology-dashboard"
        lede="Understand the living systems of your site. Diagnose soils, hydrology and ecology to reveal opportunities, risks and patterns that inform wise design."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={handleExport}
          disabled={exporting}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generating…' : 'Export earth · water · ecology report'}
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={healthPct} />
            <span className={obsx.label}>Module health</span>
            <span className={obsx.value}>
              {healthPct >= 70 ? 'Strong' : healthPct >= 30 ? 'Forming' : 'Sparse'}
            </span>
            <span className={obsx.note}>
              {samples.length} samples · {observations.length} obs
            </span>
          </div>
          {kpis.slice(0, 3).map((item) => {
            const Icon = ICON_MAP[item.iconKey];
            return (
              <div key={item.label} className={obsx.kpiBlock}>
                <span className={obsx.label}>
                  {Icon ? <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                  {item.label}
                </span>
                <span className={obsx.value}>{item.value}</span>
                <span className={obsx.note}>{item.note}</span>
              </div>
            );
          })}
        </div>
      </section>

      {kpis.length > 3 ? (
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Site diagnostics</h2>
          <div className={obsx.kpiGrid}>
            {kpis.slice(3).map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              return (
                <div key={item.label} className={obsx.kpiBlock}>
                  <span className={obsx.label}>
                    {Icon ? <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                    {item.label}
                  </span>
                  <span className={obsx.value}>{item.value}</span>
                  <span className={obsx.note}>{item.note}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Earth · water · ecology synthesis</h2>
        <div className={obsx.synthesisGrid}>
          {synthArticles.map(([Icon, title, text]) => (
            <div key={title} className={obsx.synthesisBlock}>
              <h3>{title}</h3>
              <p>
                <Icon aria-hidden="true" size={14} />
                <span>{text}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Site map &amp; water systems</h2>
          <WaterSystemsSnapshot
            boundary={project?.location?.boundary}
            caption={project?.name}
            width={320}
            height={200}
            overlays={['contours']}
            earthworks={earthworks}
            watercourses={watercourses}
            storageInfra={storage}
          />
          {watershed?.summary.flow_direction ? (
            <p className={card.hint} style={{ marginTop: 8 }}>
              Primary flow: {String(watershed.summary.flow_direction)}
            </p>
          ) : null}
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Hydrology overview</h2>
          <div className={card.statRow}>
            <span>Runoff direction</span>
            <span>{watershed?.summary.flow_direction ?? '—'}</span>
          </div>
          <div className={card.statRow}>
            <span>Watercourses</span>
            <span>{wc.watercourses}</span>
          </div>
          <div className={card.statRow}>
            <span>Earthworks</span>
            <span>{wc.earthworks}</span>
          </div>
          <div className={card.statRow}>
            <span>Storage</span>
            <span>{wc.storage}</span>
          </div>
          {wc.total === 0 ? (
            <p className={card.hint}>
              <TriangleAlert aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Map watercourses, earthworks and storage to build the water picture.
            </p>
          ) : null}
        </section>
      </div>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Soil diagnostics</h2>
          {samples.length === 0 ? (
            <p className={card.empty}>No soil samples yet — add a sample via the tools panel.</p>
          ) : (
            samples.slice(0, 5).map((s) => (
              <div key={s.id} className={card.statRow}>
                <span>
                  <Beaker aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {s.label}
                </span>
                <span>
                  {s.ph != null ? `pH ${s.ph}` : '—'}
                  {s.organicMatterPct != null ? ` · OM ${s.organicMatterPct}%` : ''}
                </span>
              </div>
            ))
          )}
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Ecology observations</h2>
          <SpeciesObservationList observations={observations} compact />
          {observations.length === 0 ? (
            <p className={card.hint}>
              <Sprout aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Record species observations to build a trophic picture of the site.
            </p>
          ) : null}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Recommended next actions</h2>
        {actions.map(([label, priority]) => (
          <div key={label} className={card.statRow}>
            <span>
              <CheckCircle2 aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {label}
            </span>
            <span
              className={`${card.pill} ${
                priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet
              }`}
            >
              {priority}
            </span>
          </div>
        ))}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Field annotations</h2>
        <AnnotationListCard
          title=""
          projectId={projectId ?? null}
          kinds={['soilSample', 'watercourse', 'vegetation', 'pasture', 'conventionalCrop']}
          emptyHint="No soil samples, watercourses, ecology zones, pastures, or conventional crop fields recorded yet — drop one with the tools panel."
        />
      </section>
    </div>
  );
}
