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
  Sun,
  Trees,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import {
  useTopographyStore,
  type Transect,
} from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import ElevationProfileChart from './ElevationProfileChart.js';
import SeasonalSolarStrip from './SeasonalSolarStrip.js';
import TerrainSnapshot from './TerrainSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
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
  const aspect = elevationSummary?.predominant_aspect ?? null;
  const slope = slopeBand(stats?.meanSlopePct);

  const kpis: Array<[LucideIcon, string, string, string]> = [
    [
      Ruler,
      'Transect length',
      stats?.totalDistanceM ? `${Math.round(stats.totalDistanceM)} m` : DASH,
      active ? 'A to B' : 'No transect',
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
    [Sun, 'Solar exposure', DASH, 'Needs lat × bearing'],
    [Trees, 'Vertical elements', String(active?.verticalRefs?.length ?? 0), 'Along transect'],
  ];

  const observations: Array<[string, string]> = [];
  if (active?.notes) observations.push(['Field notes', active.notes]);
  const verticalRefs = active?.verticalRefs ?? [];
  if (verticalRefs.length > 0) {
    observations.push([
      `${verticalRefs.length} pinned element${verticalRefs.length === 1 ? '' : 's'}`,
      verticalRefs.map((r) => `${r.kind} @ ${Math.round(r.distanceAlongTransectM)} m`).join(' · '),
    ]);
  }
  if (observations.length === 0) {
    observations.push([
      active ? 'No observations yet' : 'No transect selected',
      'Add field notes or pin vertical elements (trees, structures, swales) along the transect.',
    ]);
  }

  const overlays: Array<[LucideIcon, string]> = [
    [Sun, 'Sun path'],
    [Triangle, 'Slope segments'],
    [Droplet, 'Water flow'],
    [Layers, 'Soil horizons'],
    [Trees, 'Vegetation'],
    [Eye, 'Structures'],
    [Beaker, 'Cut / fill'],
  ];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-topography-cross-section"
        lede="Analyze terrain profiles along transects to understand land form, place design elements, evaluate solar geometry, and test section-based interventions with confidence."
      />

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          {kpis.map(([Icon, label, value, note]) => (
            <div key={label} className={obsx.kpiBlock}>
              <span className={obsx.label}>
                <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {label}
              </span>
              <span className={obsx.value}>{value}</span>
              <span className={obsx.note}>{note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Elevation profile</h2>
        <ElevationProfileChart transect={active} showVerticalRefs />
        {active ? null : (
          <p className={card.empty} style={{ marginTop: 8 }}>
            No transects yet — draw an A–B line on the terrain map to start a cross-section.
          </p>
        )}
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Section observations</h2>
          <div className={obsx.synthesisBlock}>
            {observations.map(([title, text]) => (
              <p key={title}>
                <Leaf aria-hidden="true" size={14} />
                <span><b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {text}</span>
              </p>
            ))}
          </div>
          <div className={card.btnRow} style={{ marginTop: 12 }}>
            <button type="button" className={card.btn}>
              <Plus aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Add observation
            </button>
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Section library</h2>
          {transects.length === 0 ? (
            <p className={card.empty}>No transects drawn yet.</p>
          ) : (
            transects.map((t, idx) => {
              const tStats = transectStats(t);
              const note = tStats
                ? `${tStats.totalDistanceM ? `${Math.round(tStats.totalDistanceM)} m` : '—'} · ${tStats.deltaM.toFixed(1)} m drop`
                : 'Profile pending';
              const isActive = t.id === active?.id;
              return (
                <div key={t.id} className={card.statRow}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      flex: 1,
                    }}
                  >
                    {idx + 1}. {t.name} <span className={card.hint} style={{ marginLeft: 6 }}>{note}</span>
                  </button>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {isActive ? <span className={`${card.pill} ${card.pillMet}`}>Active</span> : null}
                    <button
                      type="button"
                      aria-label={`Remove ${t.name}`}
                      onClick={() => removeTransect(t.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(232,220,200,0.7)',
                        cursor: 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                </div>
              );
            })
          )}
          <div className={card.btnRow} style={{ marginTop: 12 }}>
            <button type="button" className={card.btn}>
              <Plus aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              New transect
            </button>
          </div>
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Seasonal comparison <span className={card.hint} style={{ marginLeft: 8 }}>solar altitude at noon</span></h2>
        <SeasonalSolarStrip lat={lat} />
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Transect map</h2>
          <TerrainSnapshot
            boundary={project?.location?.boundary}
            caption={project?.name}
            width={280}
            height={180}
            overlays={['contours']}
          />
          <p className={card.hint} style={{ marginTop: 8 }}>Site aspect: {aspect ?? '—'}</p>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Overlays &amp; tools</h2>
          {overlays.map(([Icon, title]) => (
            <div key={title} className={card.statRow}>
              <span><Icon aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {title}</span>
              <span className={card.pill}>Off</span>
            </div>
          ))}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Estimated earthworks</h2>
        <div className={card.statRow}><span>Cut</span><span>{DASH}</span></div>
        <div className={card.statRow}><span>Fill</span><span>{DASH}</span></div>
        <div className={card.statRow}><span>Net</span><span>{stats ? `${stats.deltaM.toFixed(1)} m drop` : DASH}</span></div>
      </section>

      <section className={card.section}>
        <div className={card.btnRow}>
          <button type="button" className={card.btn}>
            <Plus aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Add design element
          </button>
          <button type="button" className={card.btn}>
            <Sun aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Toggle solar overlay
          </button>
          <button type="button" className={card.btn}>
            <Droplet aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Run water simulation
          </button>
          <button type="button" className={card.btn}>
            <Save aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Save transect
          </button>
          <button type="button" className={card.btn}>
            <Download aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Export section
          </button>
        </div>
      </section>
    </div>
  );
}
