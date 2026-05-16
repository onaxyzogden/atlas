import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Droplet,
  Layers,
  MapPin,
  Mountain,
  Ruler,
  Triangle,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import ElevationHistogram from './ElevationHistogram.js';
import ElevationProfileChart from './ElevationProfileChart.js';
import SlopeLegendStrip from './SlopeLegendStrip.js';
import TerrainSnapshot, { type TerrainOverlay } from './TerrainSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
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
  const kpis = topographyKpis(layers, transects);

  const [active, setActive] = useState<TerrainOverlay[]>([
    'slope',
    'contours',
    'hillshade',
    'elevation',
  ]);
  const toggle = (k: TerrainOverlay) =>
    setActive((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

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

  const actions: Array<[string, string]> = [
    [
      counts.drainageLines > 0 ? 'Plan swale on a drainage line' : 'Trace primary drainage paths',
      'High',
    ],
    [counts.transects > 0 ? 'Add additional transect' : 'Draw an A–B transect', 'Medium'],
    ['Verify runoff paths in field', 'Medium'],
    ['Evaluate access route', 'Low'],
  ];

  const featureRows: Array<[string, number]> = [
    ['Contour lines', counts.contours],
    ['Drainage lines', counts.drainageLines],
    ['Elevation points', counts.highPoints],
    ['A–B transects', counts.transects],
  ];

  const transect = transects[0];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-topography-terrain"
        lede="Read the shape of the land. Understand elevation, slope, aspect and water movement so you can design with the land, not against it."
      />

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          {kpis.map((item) => {
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

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Terrain map</h2>
        <TerrainSnapshot
          boundary={project?.location?.boundary}
          caption={project?.name}
          width={520}
          height={320}
          overlays={active}
          contours={contours}
          highPoints={highPoints}
          drainageLines={drainageLines}
        />
        <div style={{ marginTop: 14 }}>
          <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>Layers</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {OVERLAYS.map((k) => {
              const enabled = active.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  className={`${card.pill} ${enabled ? card.pillMet : ''}`}
                  onClick={() => toggle(k)}
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  {enabled ? '✓ ' : ''}{k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <SlopeLegendStrip />
        </div>
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            Elevation profile (A–B transect)
            {transect?.totalDistanceM ? (
              <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8, fontSize: 12 }}>
                {Math.round(transect.totalDistanceM)} m
              </span>
            ) : null}
          </h2>
          <ElevationProfileChart transect={transect} />
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            Detected features <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{counts.total}</span>
          </h2>
          {featureRows.map(([label, count]) => (
            <div key={label} className={card.statRow}>
              <span><Waves aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {label}</span>
              <span>{count}</span>
            </div>
          ))}
          {counts.total === 0 ? (
            <p className={card.empty} style={{ marginTop: 8 }}>No features traced yet — draw on the map to populate.</p>
          ) : null}
        </section>
      </div>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Slope map</h2>
          <TerrainSnapshot
            boundary={project?.location?.boundary}
            caption={project?.name}
            width={280}
            height={180}
            overlays={['slope']}
          />
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Elevation distribution</h2>
          <ElevationHistogram layers={layers} />
        </section>
      </div>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Terrain insights</h2>
          {insights.map((item) => (
            <p key={item} className={card.sectionBody} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '6px 0' }}>
              <CheckCircle2 aria-hidden="true" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{item}</span>
            </p>
          ))}
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Recommended next actions</h2>
          {actions.map(([label, priority]) => (
            <div key={label} className={card.statRow}>
              <span><Droplet aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {label}</span>
              <span className={`${card.pill} ${priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet}`}>{priority}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
