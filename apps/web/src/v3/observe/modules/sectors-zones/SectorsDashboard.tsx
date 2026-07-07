import { useMemo, useState } from 'react';
import {
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
import { api } from '../../../../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../../../../app/demoSession.js';
import {
  useServerProjectId,
  NOT_SYNCED_EXPORT_TITLE,
} from '../../../../hooks/useServerProjectId.js';
import SectorRadiusControl from '../../components/SectorRadiusControl.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import SectorCompassDiagram from './SectorCompassDiagram.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
import {
  sectorsKpis,
  zoneCounts,
  sectorCounts,
  dominantWindDir,
  type KpiIconKey,
} from './derivations.js';
import { polygonCentroid } from '../macroclimate-hazards/derivations.js';

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
  // The exports API addresses the SERVER project UUID; `id` is the local
  // store id (H4, deep-audit 2026-07-03). Null → not yet synced → disable.
  const serverProjectId = useServerProjectId(id);
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
  const wind = dominantWindDir(layers);

  // Module health: 0 sectors+0 zones = 0%, scaled up to a soft cap.
  const healthPct = Math.min(
    100,
    Math.round(((sc.total * 10) + (zc.total * 15))),
  );
  const healthLabel =
    healthPct >= 70 ? 'Well-mapped' : healthPct >= 30 ? 'Forming' : 'Just getting started';

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting || serverProjectId === null) return;
    setExporting(true);
    try {
      const totalAreaM2 = zones.reduce((acc, z) => acc + (z.areaM2 || 0), 0);
      const { data } = await api.exports.generate(serverProjectId, {
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

  const synopsis =
    sc.total === 0 && zc.total === 0
      ? 'No sectors or zones traced yet — start by dropping sector arrows for the dominant forces (wind, sun, fire), then outline functional zones.'
      : `${sc.total} sector arrow${sc.total === 1 ? '' : 's'} and ${zc.total} zone${zc.total === 1 ? '' : 's'} mapped — sector + zone analysis guides where each design element belongs.`;

  const synthArticles: Array<[LucideIcon, string, string]> = [
    [
      Wind,
      'External forces',
      sc.total > 0
        ? `${sc.total} arrow${sc.total === 1 ? '' : 's'} captured — wind, sun, fire, and view sectors shape placement decisions.`
        : 'Drop sector arrows for wind, sun, and fire — they cap where buildings and gardens belong.',
    ],
    [
      Layers,
      'Functional zones',
      zc.total > 0
        ? `${zc.total} zone${zc.total === 1 ? '' : 's'} outlined — organize land into functional areas that support stewardship goals.`
        : 'Outline zones to group activities by proximity to the homestead and care intensity.',
    ],
    [
      Leaf,
      'Design implications',
      sc.fire > 0
        ? `${sc.fire} fire/hazard sector${sc.fire === 1 ? '' : 's'} — keep tall vegetation and structures out of the fall zone.`
        : sc.sun > 0
          ? 'Solar sectors logged — site warm-season gardens and passive-gain glazing accordingly.'
          : 'Once sectors are placed, design responses surface here.',
    ],
  ];

  const implications: Array<[LucideIcon, string, string]> = [
    [Wind, 'Buildings on ridges', 'Capture breezes and views, away from cold air pockets.'],
    [Sun, 'Gardens in warm pockets', 'Protected microclimates extend the growing season.'],
    [Layers, 'Water follows the land', 'Systems align with natural flow and infiltration.'],
    [Route, 'Circulation on contour', 'Follow desire lines, slope, and access constraints.'],
    [Leaf, 'Protected areas buffer', 'Wind, fire, and noise sectors define buffer zones.'],
  ];

  const actions: Array<[string, string]> = [
    [sc.total === 0 ? 'Place sector arrows for dominant forces' : 'Refine sector intensities', 'High'],
    [zc.total === 0 ? 'Outline core functional zones' : 'Refine zones based on slope & soils', 'High'],
    ['Place key elements using zone logic', 'Medium'],
    ['Develop access & circulation plan', 'Medium'],
    ['Plan water systems & storage', 'Low'],
  ];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-sectors-zones-dashboard"
        lede="Use sector analysis, microclimate patterns, and zones to inform where and how each design element belongs on the land."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={handleExport}
          disabled={exporting || DEMO_OFFLINE_ENABLED || serverProjectId === null}
          title={!DEMO_OFFLINE_ENABLED && serverProjectId === null ? NOT_SYNCED_EXPORT_TITLE : undefined}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generating…' : 'Export sectors report'}
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={healthPct} />
            <span className={obsx.label}>Module health</span>
            <span className={obsx.value}>{healthLabel}</span>
            <span className={obsx.note}>{sc.total + zc.total} features mapped</span>
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
          <h2 className={card.sectionTitle}>Sector & climate signals</h2>
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
        <h2 className={card.sectionTitle}>Sectors & zones synthesis</h2>
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

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          <Compass aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Sector compass
          {sc.total > 0 ? (
            <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{sc.total}</span>
          ) : null}
        </h2>
        <p className={card.sectionBody} style={{ marginBottom: 12 }}>
          Map the forces and influences that arrive at your site.
        </p>
        <SectorCompassDiagram
          sectors={sectors}
          centroid={centroidTuple}
          compact
        />
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Sector wedge calibration</h2>
        <SectorRadiusControl projectId={id} />
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Design implications</h2>
          <div className={obsx.synthesisBlock}>
            {implications.map(([Icon, title, text]) => (
              <p key={title}>
                <Icon aria-hidden="true" size={14} />
                <span>
                  <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {text}
                </span>
              </p>
            ))}
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Detected features</h2>
          <div className={card.statRow}>
            <span><Compass aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Sector arrows</span>
            <span>{sc.total}</span>
          </div>
          <div className={card.statRow}>
            <span><Wind aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Wind sectors</span>
            <span>{sc.wind}</span>
          </div>
          <div className={card.statRow}>
            <span><Sun aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Sun sectors</span>
            <span>{sc.sun}</span>
          </div>
          <div className={card.statRow}>
            <span><Flame aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Fire / hazard</span>
            <span>{sc.fire}</span>
          </div>
          <div className={card.statRow}>
            <span><Mountain aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> View sectors</span>
            <span>{sc.view}</span>
          </div>
          <div className={card.statRow}>
            <span><Layers aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Zones outlined</span>
            <span>{zc.total}</span>
          </div>
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Recommended next actions</h2>
        {actions.map(([label, priority]) => (
          <div key={label} className={card.statRow}>
            <span>{label}</span>
            <span className={`${card.pill} ${priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet}`}>
              {priority}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
