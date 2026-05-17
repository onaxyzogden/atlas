/**
 * RegenerationMonitorCard — PLAN · Regeneration Monitor.
 *
 * Turns the project's free-form `regeneration_events` into a
 * longitudinal soil/water/biology dashboard, charted against the
 * regenerative-farm goal tree (the MDPI Apricot Lane study's Year
 * 0/5/9 monitoring discipline). Pure client-side aggregation over the
 * existing list endpoint — no DB migration, no new route. A future
 * server-side pivot endpoint + JSONB index is the documented
 * optimization once sample volume warrants it (see folder notes).
 */

import { useEffect, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useGoalTreeStore } from '../../store/goalTreeStore.js';
import { useRegenerationEventsForProject } from '../regeneration/useRegenerationEvents.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';
import {
  buildTrajectories,
  flattenGoalTargets,
  type Verdict,
} from './regenerationMonitor/aggregate.js';
import TrajectoryChart from './regenerationMonitor/TrajectoryChart.js';
import SampleEntryForm from './regenerationMonitor/SampleEntryForm.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const VERDICT_META: Record<
  Verdict,
  { label: string; color: string; bg: string }
> = {
  'on-track': { label: 'On track', color: '#bdf0d4', bg: 'rgba(127,209,174,0.16)' },
  lagging: { label: 'Lagging', color: '#f0c0b0', bg: 'rgba(217,139,111,0.16)' },
  'no-target': { label: 'Trend only', color: 'rgba(232,220,200,0.7)', bg: 'rgba(255,255,255,0.05)' },
  'insufficient-data': { label: 'Need more samples', color: 'rgba(232,220,200,0.6)', bg: 'rgba(255,255,255,0.04)' },
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 999,
        color: m.color,
        background: m.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {m.label}
    </span>
  );
}

export default function RegenerationMonitorCard({ project }: Props) {
  const apiProjectId = project.serverId ?? project.id;
  const projectEvents = useRegenerationEventsForProject(apiProjectId);

  const ensureDefault = useGoalTreeStore((s) => s.ensureDefault);
  const goalTree = useGoalTreeStore(
    (s) => s.goalTreesByProject[project.id] ?? null,
  );

  useEffect(() => {
    ensureDefault(project.id, project.projectType);
  }, [ensureDefault, project.id, project.projectType]);

  const trajectories = useMemo(() => {
    const events = projectEvents?.events ?? [];
    const goalTargets = goalTree
      ? flattenGoalTargets(goalTree.subGoals)
      : {};
    return buildTrajectories(events, goalTargets);
  }, [projectEvents?.events, goalTree]);

  const summary = useMemo(() => {
    let onTrack = 0;
    let lagging = 0;
    let scored = 0;
    let totalSamples = 0;
    for (const t of trajectories) {
      totalSamples += t.series.reduce((s, z) => s + z.points.length, 0);
      if (t.target == null) continue;
      scored += 1;
      if (t.verdict === 'on-track') onTrack += 1;
      else if (t.verdict === 'lagging') lagging += 1;
    }
    return { onTrack, lagging, scored, totalSamples };
  }, [trajectories]);

  const loading = projectEvents?.status === 'loading';
  const fetchError =
    projectEvents?.status === 'error' ? projectEvents.error : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Regeneration Monitor</span>
        <h1 className={styles.title}>Regeneration monitor</h1>
        <p className={styles.lede}>
          Longitudinal soil, water, and biology trajectories from your
          logged monitoring samples — charted against the goal tree's
          targets and deadlines, the way the MDPI Apricot Lane study
          tracked Year 0 / 5 / 9. Each sample is an observation event;
          group readings by zone and sampling round.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>At a glance</h2>
        <div className={styles.statRow}>
          <span>
            Goal-scored metrics on track{' '}
            <span className={styles.listMeta}>· {summary.scored} scored</span>
          </span>
          <span>
            {summary.onTrack} on track · {summary.lagging} lagging
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Samples logged</span>
          <span>{summary.totalSamples}</span>
        </div>
      </section>

      <section className={styles.section}>
        <SampleEntryForm projectId={apiProjectId} />
      </section>

      {loading && summary.totalSamples === 0 && (
        <section className={styles.section}>
          <p className={styles.empty}>Loading monitoring samples…</p>
        </section>
      )}

      {fetchError && (
        <section className={styles.section}>
          <p className={styles.empty}>
            Couldn't load samples: {fetchError}
          </p>
        </section>
      )}

      {!loading && summary.totalSamples === 0 && !fetchError && (
        <section className={styles.section}>
          <p className={styles.empty}>
            No monitoring samples yet. Log a baseline reading above — that
            becomes "Year 0", and every later sample is measured against
            it and the goal-tree target line.
          </p>
        </section>
      )}

      {trajectories
        .filter((t) => t.series.length > 0)
        .map((t) => {
          const pct =
            t.baseline && t.latest && t.baseline.date !== t.latest.date
              ? t.latest.value - t.baseline.value
              : null;
          return (
            <section key={t.key} className={styles.section}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                  {t.label}{' '}
                  <span className={styles.listMeta}>
                    · {t.higherIsBetter ? 'higher is better' : 'lower is better'}
                  </span>
                </h2>
                <VerdictBadge verdict={t.verdict} />
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(232,220,200,0.55)',
                  margin: '0 0 12px',
                  lineHeight: 1.5,
                }}
              >
                Baseline{' '}
                {t.baseline
                  ? `${t.baseline.value}${t.unit} (${t.baseline.date})`
                  : '—'}{' '}
                → latest{' '}
                {t.latest
                  ? `${t.latest.value}${t.unit} (${t.latest.date})`
                  : '—'}
                {pct != null && (
                  <>
                    {' '}
                    · net {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}
                    {t.unit}
                  </>
                )}
                {t.expectedNow != null && (
                  <>
                    {' '}
                    · pace target now {t.expectedNow.toFixed(2)}
                    {t.unit}
                  </>
                )}
              </p>

              <TrajectoryChart traj={t} />
            </section>
          );
        })}
    </div>
  );
}
