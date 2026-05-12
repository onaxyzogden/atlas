import { useMemo, type CSSProperties } from 'react';
import {
  Beaker,
  Binoculars,
  CheckCircle2,
  Droplet,
  FlaskConical,
  Leaf,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import WaterSystemsSnapshot from './WaterSystemsSnapshot.js';
import WaterBalanceBar from './WaterBalanceBar.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import {
  hydrologyKpis,
  waterCounts,
  getWatershedLayer,
  getWetlandsLayer,
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

function Ring({ value }: { value: number }) {
  const style = { '--progress': `${value}%` } as CSSProperties;
  return (
    <div className={obsx.ring} style={style}>
      <span>{value}%</span>
    </div>
  );
}

export default function HydrologyDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);

  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allStorage = useWaterSystemsStore((s) => s.storageInfra);
  const allWatercourses = useWaterSystemsStore((s) => s.watercourses);

  const earthworks = useMemo(() => allEarthworks.filter((e) => e.projectId === id), [allEarthworks, id]);
  const storage = useMemo(() => allStorage.filter((s) => s.projectId === id), [allStorage, id]);
  const watercourses = useMemo(() => allWatercourses.filter((w) => w.projectId === id), [allWatercourses, id]);

  const kpis = hydrologyKpis(layers, earthworks, storage, watercourses);
  const watershed = getWatershedLayer(layers);
  const wetlands = getWetlandsLayer(layers);
  const wc = waterCounts(earthworks, storage, watercourses);

  const coveragePct = useMemo(() => {
    const parts = [
      wc.earthworks > 0 ? 1 : 0,
      wc.storage > 0 ? 1 : 0,
      wc.watercourses > 0 ? 1 : 0,
      watershed != null ? 1 : 0,
    ];
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  }, [wc.earthworks, wc.storage, wc.watercourses, watershed]);

  interface RiskFlag {
    icon: LucideIcon;
    title: string;
    note: string;
    level: 'High' | 'Medium' | 'Low';
  }
  const risks: RiskFlag[] = [];
  if (wc.earthworks === 0) {
    risks.push({
      icon: TriangleAlert,
      title: 'No earthworks mapped',
      note: 'Design swales and diversions to manage runoff.',
      level: 'High',
    });
  }
  if (wc.storage === 0) {
    risks.push({
      icon: TriangleAlert,
      title: 'No water storage mapped',
      note: 'Cisterns, ponds, or rain gardens not yet placed.',
      level: 'Medium',
    });
  }
  if (wetlands?.summary.flood_zone && wetlands.summary.flood_zone !== 'X') {
    risks.push({
      icon: TriangleAlert,
      title: `Flood zone: ${wetlands.summary.flood_zone}`,
      note: 'Site may be subject to flood risk. Review design with surveyor.',
      level: 'High',
    });
  }
  if (risks.length === 0) {
    risks.push({
      icon: Leaf,
      title: 'No critical risk flags',
      note: 'Continue monitoring and map additional features.',
      level: 'Low',
    });
  }

  const actions: Array<[string, string]> = [];
  if (wc.earthworks === 0) actions.push(['Map earthworks (swales, drains)', 'High']);
  if (wc.storage === 0) actions.push(['Place water storage features', 'High']);
  if (wc.watercourses === 0) actions.push(['Trace watercourses', 'Medium']);
  if (actions.length === 0) {
    actions.push(['Deepen hydrology analysis', 'Medium']);
    actions.push(['Establish riparian buffer', 'Medium']);
  }

  const synthArticles: Array<[LucideIcon, string, string]> = [
    [
      Leaf,
      'Insights',
      'Map watercourses and earthworks to build a full picture of site hydrology. Use the watershed layer to understand drainage patterns and capture opportunities.',
    ],
    [
      Droplet,
      'Design moves',
      'Install contour swales along key drainage paths. Protect riparian corridor with a 20 m buffer. Design pond or cistern placement for water storage.',
    ],
    [
      Waves,
      'Next steps',
      'Add roof catchment data via the Jar/Perc/Roof module to estimate annual harvest. Use keyline pattern to naturally disperse water.',
    ],
  ];

  return (
    <div className={card.page}>
      <div className={card.hero} data-stage="observe">
        <div className={obsx.heroRow}>
          <div>
            <p className={card.lede}>
              Understand how water moves across your site. Analyze runoff, infiltration, drainage
              patterns and harvesting opportunities to design with water, not against it.
            </p>
          </div>
        </div>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={coveragePct} />
            <span className={obsx.label}>Hydrology coverage</span>
            <span className={obsx.value}>
              {coveragePct >= 70 ? 'Strong' : coveragePct >= 30 ? 'Forming' : 'Sparse'}
            </span>
            <span className={obsx.note}>{wc.total} water features mapped</span>
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
          <h2 className={card.sectionTitle}>Watershed &amp; coverage</h2>
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
        <h2 className={card.sectionTitle}>Site hydrology map</h2>
        <WaterSystemsSnapshot
          boundary={project?.location?.boundary}
          caption={project?.name}
          width={320}
          height={220}
          overlays={['contours']}
          earthworks={earthworks}
          watercourses={watercourses}
          storageInfra={storage}
        />
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Watershed profile</h2>
          <div className={card.statRow}>
            <span>Flow direction</span>
            <span>{watershed?.summary.flow_direction ?? '—'}</span>
          </div>
          <div className={card.statRow}>
            <span>Catchment area</span>
            <span>
              {watershed?.summary.catchment_area_ha != null
                ? `${watershed.summary.catchment_area_ha} ha`
                : '—'}
            </span>
          </div>
          <div className={card.statRow}>
            <span>Stream order</span>
            <span>{watershed?.summary.stream_order ?? '—'}</span>
          </div>
          <div className={card.statRow}>
            <span>Nearest stream</span>
            <span>
              {watershed?.summary.nearest_stream_m != null
                ? `${watershed.summary.nearest_stream_m} m`
                : '—'}
            </span>
          </div>
          <div className={card.statRow}>
            <span>Watershed name</span>
            <span>{watershed?.summary.watershed_name ?? '—'}</span>
          </div>
          <div className={card.statRow}>
            <span>HUC code</span>
            <span>{watershed?.summary.huc_code ?? '—'}</span>
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Wetlands &amp; coverage</h2>
          <div className={card.statRow}>
            <span>Flood zone</span>
            <span>{wetlands?.summary.flood_zone ?? '—'}</span>
          </div>
          <div className={card.statRow}>
            <span>Wetland cover</span>
            <span>
              {wetlands?.summary.wetland_pct != null ? `${wetlands.summary.wetland_pct}%` : '—'}
            </span>
          </div>
          <div className={card.statRow}>
            <span>Riparian buffer</span>
            <span>
              {wetlands?.summary.riparian_buffer_m != null
                ? `${wetlands.summary.riparian_buffer_m} m`
                : '—'}
            </span>
          </div>
          <div className={card.statRow}>
            <span>Regulated area</span>
            <span>
              {wetlands?.summary.regulated_area_pct != null
                ? `${wetlands.summary.regulated_area_pct}%`
                : '—'}
            </span>
          </div>
          <div className={card.statRow}>
            <span>Earthworks mapped</span>
            <span>{wc.earthworks}</span>
          </div>
          <div className={card.statRow}>
            <span>Storage</span>
            <span>{wc.storage}</span>
          </div>
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Water capture estimate (roof catchment)</h2>
        <WaterBalanceBar roofCatchment={null} variant="capture" />
        <p className={card.hint}>
          <TriangleAlert aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Add roof catchment data via the Jar/Perc/Roof module to estimate water harvest potential.
        </p>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Risk flags</h2>
        {risks.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.title} className={card.statRow}>
              <span>
                <Icon aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {r.title} <small style={{ opacity: 0.6 }}>· {r.note}</small>
              </span>
              <span
                className={`${card.pill} ${
                  r.level === 'High' ? card.pillFail : r.level === 'Medium' ? card.pillPartial : card.pillMet
                }`}
              >
                {r.level}
              </span>
            </div>
          );
        })}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Hydrology synthesis</h2>
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
    </div>
  );
}
