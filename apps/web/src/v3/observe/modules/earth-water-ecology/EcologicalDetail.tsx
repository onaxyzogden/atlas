import { useMemo, type CSSProperties } from 'react';
import {
  Beaker,
  Binoculars,
  CheckCircle2,
  Droplet,
  FlaskConical,
  Leaf,
  Sprout,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import SpeciesObservationList from './SpeciesObservationList.js';
import SeasonalEcologyStrip from './SeasonalEcologyStrip.js';
import WaterSystemsSnapshot from './WaterSystemsSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
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

function Ring({ value }: { value: number }) {
  const style = { '--progress': `${value}%` } as CSSProperties;
  return (
    <div className={obsx.ring} style={style}>
      <span>{value}%</span>
    </div>
  );
}

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
  const zones = useMemo(() => allZones.filter((z) => z.projectId === id), [allZones, id]);
  const successionStage = successionByProject[id];

  const kpis = ecologyDetailKpis(layers, observations, zones, successionStage);
  const counts = ecologyCounts(observations, zones, successionStage);

  const completenessPct = useMemo(() => {
    const parts = [
      counts.observations > 0 ? 1 : 0,
      counts.zones > 0 ? 1 : 0,
      counts.trophicLevels.length >= 3 ? 1 : 0,
      counts.successionStage ? 1 : 0,
    ];
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  }, [counts.observations, counts.zones, counts.trophicLevels.length, counts.successionStage]);

  const indicators = observations
    .filter((o) => o.trophicLevel === 'tertiary' || o.trophicLevel === 'secondary')
    .slice(0, 4);
  const recent = [...observations]
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 4);

  const actions: Array<[string, string]> = [];
  if (counts.observations === 0) actions.push(['Log species observations', 'High']);
  if (counts.zones === 0) actions.push(['Map ecology zones', 'High']);
  if (counts.trophicLevels.length < 3) actions.push(['Record higher trophic levels', 'Medium']);
  if (!counts.successionStage) actions.push(['Set succession stage', 'Medium']);
  if (actions.length === 0) {
    actions.push(['Enhance riparian planting', 'Medium']);
    actions.push(['Install pollinator habitat', 'Medium']);
  }

  const vulnerabilities: string[] = [];
  if (counts.trophicLevels.length < 3) {
    vulnerabilities.push('Incomplete trophic web — log secondary and tertiary consumers.');
  }
  if (counts.zones === 0) {
    vulnerabilities.push('No ecology zones mapped — outline habitat patches to track succession.');
  }
  if (!counts.successionStage) {
    vulnerabilities.push('Succession stage not set — characterize overall site trajectory.');
  }

  const strengths =
    counts.observations > 0
      ? `${counts.observations} species observation${counts.observations === 1 ? '' : 's'} recorded across ${counts.trophicLevels.length} trophic level${counts.trophicLevels.length === 1 ? '' : 's'}.`
      : 'No species observations yet — begin recording to build a trophic picture.';

  const opportunities = [
    'Expand native plant corridors to connect habitats.',
    'Enhance habitat for pollinators and beneficial insects.',
    'Increase structural complexity with multi-layered plantings.',
  ];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-earth-water-ecology-ecological"
        lede="Explore habitat conditions, species observations, guild indicators and ecosystem health to guide regenerative design and stewardship."
      />

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={completenessPct} />
            <span className={obsx.label}>Ecology coverage</span>
            <span className={obsx.value}>
              {completenessPct >= 70 ? 'Strong' : completenessPct >= 30 ? 'Forming' : 'Sparse'}
            </span>
            <span className={obsx.note}>
              {counts.observations} obs · {counts.zones} zones
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
          <h2 className={card.sectionTitle}>Habitat indicators</h2>
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
        <h2 className={card.sectionTitle}>Habitat map &amp; observation zones</h2>
        <WaterSystemsSnapshot
          boundary={project?.location?.boundary}
          caption={project?.name}
          width={320}
          height={200}
          overlays={[]}
          earthworks={[]}
          watercourses={[]}
          storageInfra={[]}
        />
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {counts.trophicLevels.length === 0 ? (
            <span className={card.empty}>Record observations to populate the habitat map.</span>
          ) : (
            counts.trophicLevels.map((level) => (
              <span key={level} className={`${card.pill} ${card.pillPartial}`}>
                {level}
              </span>
            ))
          )}
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Seasonal ecology calendar</h2>
        <SeasonalEcologyStrip observations={observations} />
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Species observations</h2>
          <SpeciesObservationList observations={observations} />
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Trophic web</h2>
          <SpeciesObservationList observations={observations} compact />
        </section>
      </div>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Succession &amp; zones</h2>
          {zones.length === 0 ? (
            <p className={card.empty}>
              <Sprout aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Map ecology zones via the tools panel to assess habitat structure.
            </p>
          ) : (
            zones.slice(0, 6).map((zone) => (
              <div key={zone.id} className={card.statRow}>
                <span>
                  <Sprout aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {zone.label ?? 'Zone'}
                </span>
                <span>{zone.dominantStage}</span>
              </div>
            ))
          )}
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Indicator species</h2>
          {indicators.length === 0 ? (
            <p className={card.empty}>Log secondary and tertiary consumers as ecological indicators.</p>
          ) : (
            indicators.map((obs) => (
              <div key={obs.id} className={card.statRow}>
                <span>{obs.species}</span>
                <span className={`${card.pill} ${card.pillPartial}`}>{obs.trophicLevel}</span>
              </div>
            ))
          )}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Recent field observations</h2>
        {recent.length === 0 ? (
          <p className={card.empty}>No observations recorded — log species via the tools panel.</p>
        ) : (
          recent.map((obs) => (
            <div key={obs.id} className={card.statRow}>
              <span>
                {new Date(obs.observedAt).toLocaleDateString()} ·{' '}
                <small style={{ opacity: 0.7 }}>{obs.notes ?? obs.species}</small>
              </span>
              <span>{obs.trophicLevel}</span>
            </div>
          ))
        )}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Ecological synthesis</h2>
        <div className={obsx.synthesisGrid}>
          <div className={obsx.synthesisBlock}>
            <h3>Strengths</h3>
            <p>
              <Leaf aria-hidden="true" size={14} />
              <span>{strengths}</span>
            </p>
          </div>
          <div className={obsx.synthesisBlock}>
            <h3>Vulnerabilities</h3>
            {vulnerabilities.length === 0 ? (
              <p>
                <Leaf aria-hidden="true" size={14} />
                <span>No critical gaps identified — keep observing.</span>
              </p>
            ) : (
              vulnerabilities.map((item) => (
                <p key={item}>
                  <TriangleAlert aria-hidden="true" size={14} />
                  <span>{item}</span>
                </p>
              ))
            )}
          </div>
          <div className={obsx.synthesisBlock}>
            <h3>Opportunities</h3>
            {opportunities.map((item) => (
              <p key={item}>
                <Sprout aria-hidden="true" size={14} />
                <span>{item}</span>
              </p>
            ))}
          </div>
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

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Build a thriving ecosystem</h2>
        <p className={card.sectionBody}>
          Use these insights to guide your stewardship plan and track progress over time.
        </p>
      </section>
    </div>
  );
}
