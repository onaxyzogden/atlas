import { useMemo } from 'react';
import {
  ArrowRight,
  Beaker,
  Binoculars,
  ChevronDown,
  Download,
  Droplet,
  FlaskConical,
  Leaf,
  Plus,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import WaterSystemsSnapshot from './WaterSystemsSnapshot.js';
import WaterBalanceBar from './WaterBalanceBar.js';
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

  return (
    <div className="detail-page hydrology-detail-page">
      <section className="hydrology-layout">
        <div className="hydrology-main">
          <HydrologyHeader />
          <SurfaceCard className="hydrology-kpi-strip">
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
          <section className="hydrology-content-grid">
            <SurfaceCard className="hydrology-map-panel">
              <header>
                <h2>Site hydrology map</h2>
                <button type="button">
                  Flow visualization <ChevronDown aria-hidden="true" />
                </button>
              </header>
              <div className="hydrology-map-wrap">
                <WaterSystemsSnapshot
                  boundary={project?.location?.boundary}
                  caption={project?.name}
                  width={320}
                  height={220}
                  overlays={['contours']}
                  className="hydrology-detail-map"
                  earthworks={earthworks}
                  watercourses={watercourses}
                  storageInfra={storage}
                />
              </div>
            </SurfaceCard>
            <div className="hydrology-analysis-column">
              <SurfaceCard className="hydrology-small-panel hydrology-profile-panel">
                <h2>
                  Watershed profile <small>(primary flow path)</small>
                </h2>
                <dl className="watershed-stats-dl">
                  <div>
                    <dt>Flow direction</dt>
                    <dd>{watershed?.summary.flow_direction ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Catchment area</dt>
                    <dd>{watershed?.summary.catchment_area_ha != null ? `${watershed.summary.catchment_area_ha} ha` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Stream order</dt>
                    <dd>{watershed?.summary.stream_order ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Nearest stream</dt>
                    <dd>{watershed?.summary.nearest_stream_m != null ? `${watershed.summary.nearest_stream_m} m` : '—'}</dd>
                  </div>
                </dl>
              </SurfaceCard>
              <SurfaceCard className="hydrology-small-panel infiltration-panel">
                <header>
                  <h2>Hydrology &amp; coverage</h2>
                  <button type="button">
                    Details <ArrowRight aria-hidden="true" />
                  </button>
                </header>
                <div className="infiltration-content">
                  <dl>
                    <div>
                      <dt>Flood zone</dt>
                      <dd>{wetlands?.summary.flood_zone ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Wetland cover</dt>
                      <dd>{wetlands?.summary.wetland_pct != null ? `${wetlands.summary.wetland_pct}%` : '—'}</dd>
                    </div>
                    <div>
                      <dt>Riparian buffer</dt>
                      <dd>{wetlands?.summary.riparian_buffer_m != null ? `${wetlands.summary.riparian_buffer_m} m` : '—'}</dd>
                    </div>
                    <div>
                      <dt>Regulated area</dt>
                      <dd>{wetlands?.summary.regulated_area_pct != null ? `${wetlands.summary.regulated_area_pct}%` : '—'}</dd>
                    </div>
                  </dl>
                </div>
              </SurfaceCard>
            </div>
          </section>
          <section className="hydrology-bottom-grid">
            <SurfaceCard className="hydrology-bottom-panel water-balance-panel">
              <header>
                <h2>
                  Water capture estimate <small>(roof catchment)</small>
                </h2>
                <button type="button">
                  Monthly <ChevronDown aria-hidden="true" />
                </button>
              </header>
              <WaterBalanceBar roofCatchment={null} variant="capture" className="water-balance-image" />
              <p className="warning-note">
                <TriangleAlert aria-hidden="true" /> Add roof catchment data via the Jar/Perc/Roof module to estimate water harvest potential.
              </p>
            </SurfaceCard>
            <SurfaceCard className="hydrology-bottom-panel watershed-panel">
              <header>
                <h2>Watershed summary</h2>
                <button type="button">
                  Details <ArrowRight aria-hidden="true" />
                </button>
              </header>
              <div className="watershed-content">
                <dl>
                  <div>
                    <dt>Watershed name</dt>
                    <dd>{watershed?.summary.watershed_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Catchment area</dt>
                    <dd>{watershed?.summary.catchment_area_ha != null ? `${watershed.summary.catchment_area_ha} ha` : '—'}</dd>
                  </div>
                  <div>
                    <dt>HUC code</dt>
                    <dd>{watershed?.summary.huc_code ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Earthworks mapped</dt>
                    <dd>{wc.earthworks}</dd>
                  </div>
                  <div>
                    <dt>Storage infrastructure</dt>
                    <dd>{wc.storage}</dd>
                  </div>
                </dl>
                <WaterSystemsSnapshot
                  boundary={project?.location?.boundary}
                  caption={project?.name}
                  width={180}
                  height={120}
                  overlays={[]}
                  className="flow-accumulation-image"
                  earthworks={earthworks}
                  watercourses={watercourses}
                  storageInfra={storage}
                />
              </div>
            </SurfaceCard>
            <SurfaceCard className="hydrology-bottom-panel risk-flags-panel">
              <h2>Risk flags</h2>
              {wc.earthworks === 0 && (
                <p>
                  <TriangleAlert aria-hidden="true" />
                  <b>
                    No earthworks mapped
                    <small>Design swales and diversions to manage runoff.</small>
                  </b>
                  <em>High</em>
                </p>
              )}
              {wc.storage === 0 && (
                <p>
                  <TriangleAlert aria-hidden="true" />
                  <b>
                    No water storage mapped
                    <small>Cisterns, ponds, or rain gardens not yet placed.</small>
                  </b>
                  <em>Medium</em>
                </p>
              )}
              {wetlands?.summary.flood_zone && wetlands.summary.flood_zone !== 'X' && (
                <p>
                  <TriangleAlert aria-hidden="true" />
                  <b>
                    Flood zone: {wetlands.summary.flood_zone}
                    <small>Site may be subject to flood risk. Review design with surveyor.</small>
                  </b>
                  <em>High</em>
                </p>
              )}
              {wc.earthworks > 0 && wc.storage > 0 && (!wetlands?.summary.flood_zone || wetlands.summary.flood_zone === 'X') && (
                <p>
                  <Leaf aria-hidden="true" />
                  <b>
                    No critical risk flags
                    <small>Continue monitoring and map additional features.</small>
                  </b>
                  <em>Low</em>
                </p>
              )}
              <button className="green-button" type="button">
                View all risks <ArrowRight aria-hidden="true" />
              </button>
            </SurfaceCard>
          </section>
        </div>
        <HydrologySidebar wc={wc} />
      </section>
    </div>
  );
}

function HydrologyHeader() {
  return (
    <header className="hydrology-header">
      <div className="hydrology-title-row">
        <Droplet aria-hidden="true" />
        <div>
          <h1>Hydrology detail</h1>
          <p>
            Understand how water moves across your site. Analyze runoff, infiltration, drainage
            patterns and harvesting opportunities to design with water, not against it.
          </p>
        </div>
      </div>
    </header>
  );
}

interface SidebarProps {
  wc: ReturnType<typeof waterCounts>;
}

function HydrologySidebar({ wc }: SidebarProps) {
  const insights = [
    'Map watercourses and earthworks to build a full picture of site hydrology.',
    'Add roof catchment data via the Jar/Perc/Roof module to estimate annual water harvest.',
    'Use the watershed layer to understand drainage patterns and capture opportunities.',
    'Protect riparian zones and install earthworks to slow, spread, and sink water.',
  ];
  const recommendations = [
    'Install contour swales along key drainage paths.',
    'Protect riparian corridor with a 20 m buffer.',
    'Design pond or cistern placement for water storage.',
    'Use keyline pattern to naturally disperse water.',
  ];

  const actions: Array<[string, string, string]> = [];
  if (wc.earthworks === 0) actions.push(['Map earthworks (swales, drains)', 'Trace existing features on the site map.', 'High']);
  if (wc.storage === 0) actions.push(['Place water storage features', 'Add cisterns, ponds, or rain gardens.', 'High']);
  if (wc.watercourses === 0) actions.push(['Trace watercourses', 'Map streams, creeks, and drainage lines.', 'Medium']);
  if (actions.length === 0) {
    actions.push(['Deepen hydrology analysis', 'Model water balance and infiltration rates.', 'Medium']);
    actions.push(['Establish riparian buffer', 'Fence and revegetate with native species.', 'Medium']);
  }

  return (
    <aside className="hydrology-sidebar">
      <SurfaceCard className="hydrology-side-card insights">
        <h2>
          Hydrology insights{' '}
          <button type="button">
            View full report <ArrowRight aria-hidden="true" />
          </button>
        </h2>
        {insights.map((item) => (
          <p key={item}>
            <Leaf aria-hidden="true" />
            {item}
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="hydrology-side-card recommendations">
        <h2>Design recommendations</h2>
        {recommendations.map((item) => (
          <p key={item}>
            <Droplet aria-hidden="true" />
            {item}
            <ArrowRight aria-hidden="true" />
          </p>
        ))}
        <button className="green-button" type="button">
          View design overlay <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
      <SurfaceCard className="hydrology-side-card hydrology-actions">
        <h2>
          Recommended actions{' '}
          <button type="button">
            Prioritize <ChevronDown aria-hidden="true" />
          </button>
        </h2>
        {actions.map(([title, note, level], index) => (
          <p key={title}>
            <b>{index + 1}</b>
            <span>
              {title}
              <small>{note}</small>
            </span>
            <em>{level}</em>
          </p>
        ))}
        <button className="green-button" type="button">
          <Plus aria-hidden="true" /> Add to design plan
        </button>
      </SurfaceCard>
      <SurfaceCard className="hydrology-export-card">
        <button type="button">
          <Download aria-hidden="true" /> Export hydrology data <ChevronDown aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
