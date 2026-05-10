import { useMemo } from 'react';
import {
  ArrowRight,
  Beaker,
  Binoculars,
  CalendarDays,
  ChevronDown,
  Droplet,
  FlaskConical,
  Leaf,
  Plus,
  Sprout,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import SpeciesObservationList from './SpeciesObservationList.js';
import SeasonalEcologyStrip from './SeasonalEcologyStrip.js';
import WaterSystemsSnapshot from './WaterSystemsSnapshot.js';
import {
  ecologyDetailKpis,
  ecologyCounts,
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

export default function EcologicalDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);

  const allObservations = useEcologyStore((s) => s.ecology);
  const allZones = useEcologyStore((s) => s.ecologyZones);
  const successionByProject = useEcologyStore((s) => s.successionStageByProject);

  const observations = useMemo(
    () => allObservations.filter((o) => o.projectId === id),
    [allObservations, id],
  );
  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === id),
    [allZones, id],
  );
  const successionStage = successionByProject[id];

  const kpis = ecologyDetailKpis(layers, observations, zones, successionStage);
  const counts = ecologyCounts(observations, zones, successionStage);

  return (
    <div className="detail-page ecological-detail-page">
      <section className="ecology-layout">
        <div className="ecology-main">
          <EcologyHeader />
          <SurfaceCard className="ecology-kpi-strip">
            {kpis.map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              return (
                <div className={`diagnostic-kpi tone-${item.tone}`} key={item.label}>
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                  {item.pill && <em className={`kpi-pill tone-${item.tone}`}>{item.pill}</em>}
                </div>
              );
            })}
          </SurfaceCard>
          <section className="ecology-content-grid">
            <div className="ecology-left-stack">
              <SurfaceCard className="ecology-map-panel">
                <header>
                  <h2>Habitat map &amp; observation zones</h2>
                  <button type="button">
                    All observations <ChevronDown aria-hidden="true" />
                  </button>
                </header>
                <WaterSystemsSnapshot
                  boundary={project?.location?.boundary}
                  caption={project?.name}
                  width={320}
                  height={200}
                  overlays={[]}
                  className="ecology-habitat-map"
                  earthworks={[]}
                  watercourses={[]}
                  storageInfra={[]}
                />
                <div className="ecology-map-legend">
                  {counts.trophicLevels.length === 0 ? (
                    <span className="empty-note">Record observations to populate the habitat map.</span>
                  ) : (
                    counts.trophicLevels.map((level) => (
                      <span key={level}>{level}</span>
                    ))
                  )}
                  <button type="button">
                    View full map <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </SurfaceCard>
              <section className="ecology-bottom-grid">
                <SurfaceCard className="seasonal-ecology-panel">
                  <header>
                    <h2>Seasonal ecology calendar</h2>
                    <button type="button">
                      This season <ArrowRight aria-hidden="true" />
                    </button>
                  </header>
                  <SeasonalEcologyStrip
                    observations={observations}
                    className="seasonal-calendar-image"
                  />
                </SurfaceCard>
                <IndicatorSpeciesPanel observations={observations} />
              </section>
            </div>
            <div className="ecology-observation-column">
              <SurfaceCard className="species-panel">
                <header>
                  <h2>Species observations</h2>
                  <button type="button">
                    View all species <ArrowRight aria-hidden="true" />
                  </button>
                </header>
                <SpeciesObservationList
                  observations={observations}
                  className="species-strip-image"
                />
              </SurfaceCard>
              <div className="ecology-two-up">
                <SurfaceCard className="habitat-health-panel">
                  <header>
                    <h2>Succession &amp; zones</h2>
                    <button type="button">
                      Details <ArrowRight aria-hidden="true" />
                    </button>
                  </header>
                  {zones.length === 0 ? (
                    <p className="empty-note">
                      <Sprout aria-hidden="true" /> Map ecology zones via the tools panel to assess habitat structure.
                    </p>
                  ) : (
                    zones.slice(0, 6).map((zone) => (
                      <p key={zone.id}>
                        <Sprout aria-hidden="true" />
                        <span>{zone.label ?? 'Zone'}</span>
                        <b>{zone.dominantStage}</b>
                        <i />
                      </p>
                    ))
                  )}
                </SurfaceCard>
                <SurfaceCard className="relationship-panel">
                  <header>
                    <h2>Trophic web</h2>
                    <button type="button">
                      View food web <ArrowRight aria-hidden="true" />
                    </button>
                  </header>
                  <SpeciesObservationList
                    observations={observations}
                    compact
                    className="relationship-web-image"
                  />
                </SurfaceCard>
              </div>
              <div className="ecology-two-up ecology-actions-row">
                <RecentFieldObservations observations={observations} />
                <RecommendedActions counts={counts} />
              </div>
            </div>
          </section>
        </div>
        <EcologySidebar counts={counts} />
      </section>
    </div>
  );
}

function EcologyHeader() {
  return (
    <header className="ecology-header">
      <div className="ecology-title-row">
        <Leaf aria-hidden="true" />
        <div>
          <h1>Ecological detail</h1>
          <p>
            Explore habitat conditions, species observations, guild indicators and ecosystem health
            to guide regenerative design and stewardship.
          </p>
        </div>
      </div>
    </header>
  );
}

interface IndicatorProps {
  observations: ReturnType<typeof useEcologyStore.getState>['ecology'];
}

function IndicatorSpeciesPanel({ observations }: IndicatorProps) {
  const indicators = observations.filter((o) =>
    o.trophicLevel === 'tertiary' || o.trophicLevel === 'secondary',
  ).slice(0, 4);
  return (
    <SurfaceCard className="indicator-species-panel">
      <header>
        <h2>Indicator species</h2>
        <button type="button">
          View all <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {indicators.length === 0 ? (
        <p className="empty-note">Log secondary and tertiary consumers as ecological indicators.</p>
      ) : (
        indicators.map((obs, index) => (
          <p key={obs.id}>
            <span>{index + 1}</span>
            <b>
              {obs.species}
              <small>{obs.trophicLevel}</small>
            </b>
            <em>Observed</em>
          </p>
        ))
      )}
    </SurfaceCard>
  );
}

interface RecentObsProps {
  observations: ReturnType<typeof useEcologyStore.getState>['ecology'];
}

function RecentFieldObservations({ observations }: RecentObsProps) {
  const recent = [...observations]
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 4);
  return (
    <SurfaceCard className="field-observations-panel">
      <header>
        <h2>Recent field observations</h2>
        <button type="button">
          View journal <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {recent.length === 0 ? (
        <p className="empty-note">No observations recorded — log species via the tools panel.</p>
      ) : (
        recent.map((obs) => (
          <p key={obs.id}>
            <CalendarDays aria-hidden="true" />
            <span>
              {new Date(obs.observedAt).toLocaleDateString()}
              <small>{obs.notes ?? obs.species}</small>
            </span>
            <em>{obs.trophicLevel}</em>
          </p>
        ))
      )}
      <button className="green-button" type="button">
        <Plus aria-hidden="true" /> Add observation
      </button>
    </SurfaceCard>
  );
}

interface ActionsProps {
  counts: ReturnType<typeof ecologyCounts>;
}

function RecommendedActions({ counts }: ActionsProps) {
  const actions: Array<[string, string, string]> = [];
  if (counts.observations === 0) actions.push(['Log species observations', 'Record flora, fauna and fungi sightings.', 'High']);
  if (counts.zones === 0) actions.push(['Map ecology zones', 'Outline distinct habitat patches on the map.', 'High']);
  if (counts.trophicLevels.length < 3) actions.push(['Record higher trophic levels', 'Log birds, reptiles, and predators.', 'Medium']);
  if (!counts.successionStage) actions.push(['Set succession stage', 'Describe overall site successional context.', 'Medium']);
  if (actions.length === 0) {
    actions.push(['Enhance riparian planting', 'Increase native cover along water corridors.', 'Medium']);
    actions.push(['Install pollinator habitat', 'Add native flowering shrubs and logs.', 'Medium']);
  }
  return (
    <SurfaceCard className="ecology-recommended-panel">
      <header>
        <h2>Recommended actions</h2>
      </header>
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
    </SurfaceCard>
  );
}

interface SidebarProps {
  counts: ReturnType<typeof ecologyCounts>;
}

function EcologySidebar({ counts }: SidebarProps) {
  const strengths = counts.observations > 0
    ? [`${counts.observations} species observations recorded across ${counts.trophicLevels.length} trophic level${counts.trophicLevels.length === 1 ? '' : 's'}.`]
    : ['No species observations yet — begin recording to build a trophic picture.'];

  const vulnerabilities: string[] = [];
  if (counts.trophicLevels.length < 3) vulnerabilities.push('Incomplete trophic web — log secondary and tertiary consumers.');
  if (counts.zones === 0) vulnerabilities.push('No ecology zones mapped — outline habitat patches to track succession.');
  if (!counts.successionStage) vulnerabilities.push('Succession stage not set — characterize overall site trajectory.');

  const opportunities = [
    'Expand native plant corridors to connect habitats.',
    'Enhance habitat for pollinators and beneficial insects.',
    'Increase structural complexity with multi-layered plantings.',
  ];

  return (
    <aside className="ecology-sidebar">
      <SurfaceCard className="module-progress-card ecology-progress">
        <p>Observations</p>
        <strong>
          {counts.observations} recorded{' '}
          <span>{counts.trophicLevels.length} trophic levels</span>
        </strong>
        <i />
        <button type="button">View module guide</button>
      </SurfaceCard>
      <SurfaceCard className="ecology-insights-card">
        <h2>Ecological insights</h2>
        <section>
          <h3>Strengths</h3>
          {strengths.map((item) => (
            <p key={item}>
              <Leaf aria-hidden="true" />
              {item}
            </p>
          ))}
        </section>
        <section>
          <h3>Vulnerabilities</h3>
          {vulnerabilities.length === 0 ? (
            <p>
              <Leaf aria-hidden="true" />
              No critical gaps identified — keep observing.
            </p>
          ) : (
            vulnerabilities.map((item) => (
              <p key={item}>
                <TriangleAlert aria-hidden="true" />
                {item}
              </p>
            ))
          )}
        </section>
        <section>
          <h3>Opportunities</h3>
          {opportunities.map((item) => (
            <p key={item}>
              <Sprout aria-hidden="true" />
              {item}
            </p>
          ))}
        </section>
      </SurfaceCard>
      <SurfaceCard className="ecology-plan-card">
        <h2>Build a thriving ecosystem</h2>
        <p>Use these insights to guide your stewardship plan and track progress over time.</p>
        <button className="green-button" type="button">
          <Sprout aria-hidden="true" /> Add to stewardship plan
        </button>
      </SurfaceCard>
    </aside>
  );
}
