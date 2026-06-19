import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Download,
  Droplet,
  Home,
  Layers,
  Leaf,
  Map as MapIcon,
  Mountain,
  Ruler,
  ShieldAlert,
  Sun,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import {
  useTopographyStore,
} from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { api } from '../../../../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../../../../app/demoSession.js';
import { pickDefined, pickTruthy } from '@ogden/shared';
import AspectCompass from './AspectCompass.js';
import ElevationProfileChart from './ElevationProfileChart.js';
import TerrainSnapshot from './TerrainSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
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
  map: MapIcon,
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
  const kpis = topographyKpis(layers, transects);

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
              ...pickDefined(c, ['elevationM']),
              ...pickTruthy(c, ['notes']),
              createdAt: c.createdAt,
            })),
            highPoints: highPoints.map((h) => ({
              id: h.id,
              position: h.position,
              kind: h.kind,
              ...pickDefined(h, ['elevationM']),
              ...pickTruthy(h, ['label', 'notes']),
              createdAt: h.createdAt,
            })),
            drainageLines: drainageLines.map((d) => ({
              id: d.id,
              ...pickTruthy(d, ['notes']),
              createdAt: d.createdAt,
            })),
            transects: transects.map((t) => ({
              id: t.id,
              name: t.name,
              pointA: t.pointA,
              pointB: t.pointB,
              ...pickDefined(t, ['sourceApi', 'totalDistanceM']),
              ...pickTruthy(t, ['sampledAt', 'confidence', 'notes']),
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

  const range =
    elevationSummary?.min_elevation_m != null && elevationSummary?.max_elevation_m != null
      ? Math.round(elevationSummary.max_elevation_m - elevationSummary.min_elevation_m)
      : null;
  const aspect = elevationSummary?.predominant_aspect ?? null;
  const meanSlope = elevationSummary?.mean_slope_deg;

  const synopsis = !elevationSummary
    ? 'Elevation data pending — once a DEM is sampled, the dashboard will summarise the site shape.'
    : `${meanSlope != null ? `Mean slope ${meanSlope.toFixed(1)}°` : 'Slope data partial'}${
        range != null ? `, ${range} m of total relief` : ''
      }${aspect ? ` and a ${aspect} aspect` : ''}. ${
        counts.total === 0
          ? 'No field annotations yet — trace contours, high points, or drainage lines to start building a base map.'
          : `${counts.total} field annotation${counts.total === 1 ? '' : 's'} so far.`
      }`;

  const synthArticles: Array<[LucideIcon, string, string]> = [
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
      elevationSummary?.max_slope_deg != null && elevationSummary.max_slope_deg > 25
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
  if (elevationSummary?.max_slope_deg != null && elevationSummary.max_slope_deg > 25) {
    implications.push([
      ShieldAlert,
      'Steep zones present',
      `Max slope ${elevationSummary.max_slope_deg.toFixed(1)}° — protect with vegetation, avoid cut/fill.`,
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

  const healthPct = Math.min(100, counts.total * 10 + (elevationSummary ? 40 : 0));
  const healthLabel = healthPct >= 70 ? 'Good' : healthPct >= 40 ? 'Forming' : 'Empty';

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-topography-dashboard"
        lede="Understand the shape of the land. Explore elevation, slope, aspect and cross-sections to design with the terrain, not against it."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={handleExport}
          disabled={exporting || DEMO_OFFLINE_ENABLED}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generating…' : 'Export terrain report'}
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={healthPct} />
            <span className={obsx.label}>Module health</span>
            <span className={obsx.value}>{healthLabel}</span>
            <span className={obsx.note}>{counts.total} annotations</span>
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
          <h2 className={card.sectionTitle}>Terrain metrics</h2>
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
        <h2 className={card.sectionTitle}>Topography synthesis</h2>
        <p className={card.sectionBody} style={{ marginBottom: 14 }}>{synopsis}</p>
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
          <h2 className={card.sectionTitle}>Terrain detail</h2>
          <p className={card.sectionBody} style={{ marginBottom: 12 }}>
            Explore contour maps, slope analysis, aspect, and elevation layers.
          </p>
          <TerrainSnapshot
            boundary={project?.location?.boundary}
            caption={project?.name}
            width={520}
            height={220}
          />
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Cross-section</h2>
          <p className={card.sectionBody} style={{ marginBottom: 12 }}>
            Transects across the site reveal elevation change, water flow and solar exposure.
          </p>
          <ElevationProfileChart transect={transects[0]} compact />
        </section>
      </div>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Design implications</h2>
          <div className={obsx.synthesisBlock}>
            {implications.map(([Icon, title, text]) => (
              <p key={title}>
                <Icon aria-hidden="true" size={14} />
                <span><b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {text}</span>
              </p>
            ))}
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            Detected terrain features <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{counts.total}</span>
          </h2>
          {features.map(([label, value]) => (
            <div key={label} className={card.statRow}>
              <span><MapIcon aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>
      </div>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Aspect</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <AspectCompass aspect={aspect} size={96} />
            <strong style={{ color: 'rgba(var(--color-gold-rgb), 0.95)' }}>{aspect ?? '—'}</strong>
            <small className={card.hint}>Predominant facing direction.</small>
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Recommended next actions</h2>
          {actions.map(([label, priority]) => (
            <div key={label} className={card.statRow}>
              <span><CheckCircle2 aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {label}</span>
              <span className={`${card.pill} ${priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet}`}>{priority}</span>
            </div>
          ))}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Field annotations</h2>
        <AnnotationListCard
          title=""
          projectId={projectId ?? null}
          kinds={['contourLine', 'highPoint', 'drainageLine']}
          emptyHint="No contours, elevation points, or drainage lines yet — trace one with the tools panel."
        />
      </section>
    </div>
  );
}
