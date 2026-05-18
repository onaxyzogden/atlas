/**
 * Goal Compass tab 3/5 — runs the sequencing engine and displays the
 * proposal (BuildPhase + PhaseTask rows), with an Impact Preview gate
 * before any row deletion commits.
 *
 * Generated rows are written into the shared `phaseStore`, so they also
 * appear in the existing Phasing & Budgeting module (live-linked).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useGoalTreeStore } from '../../../../store/goalTreeStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import { useProjectStore } from '../../../../store/projectStore.js';
import { usePhaseStore } from '../../../../store/phaseStore.js';
import { runSequencingEngine } from '../../engine/goalCompass/sequencingEngine.js';
import type { SequencingResult } from '../../engine/goalCompass/sequencingEngine.js';
import { scheduleTasksToCalendar } from '../../engine/goalCompass/scheduleTasksToCalendar.js';
import { pushGoalCompassToSpine } from '../../engine/goalCompass/goalCompassSpineSync.js';
import { computeImpactPreview } from '../../engine/goalCompass/impactPreview.js';
import type { ImpactPreview } from '../../engine/goalCompass/impactPreview.js';
import { INTERVENTION_CATALOG } from '../../data/interventionCatalog.js';
import GenerateSiteDesignBar from './GenerateSiteDesignBar.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

export default function GeneratedPlanTab({ project }: Props) {
  const goalTree = useGoalTreeStore((s) => s.goalTreesByProject[project.id] ?? null);
  const excludedIds = useGoalTreeStore(
    (s) => s.excludedInterventionsByProject[project.id],
  );
  const excludeIntervention = useGoalTreeStore((s) => s.excludeIntervention);
  const clearExclusions = useGoalTreeStore((s) => s.clearExclusions);
  const siteProfile = useSiteProfileStore(
    (s) => s.profilesByProject[project.id] ?? null,
  );
  const replaceGoalCompassRows = usePhaseStore((s) => s.replaceGoalCompassRows);
  const allPhases = usePhaseStore((s) => s.phases);
  const projectStartDate = useProjectStore(
    (s) => s.projects.find((p) => p.id === project.id)?.startDate ?? null,
  );

  const filteredCatalog = useMemo(() => {
    const excluded = new Set(excludedIds ?? []);
    if (excluded.size === 0) return INTERVENTION_CATALOG;
    return INTERVENTION_CATALOG.filter((i) => !excluded.has(i.id));
  }, [excludedIds]);

  const [lastResult, setLastResult] = useState<SequencingResult | null>(null);
  const [preview, setPreview] = useState<ImpactPreview | null>(null);

  const generatedPhases = useMemo(
    () =>
      allPhases
        .filter((p) => p.projectId === project.id && p.generatedFromGoalCompass)
        .sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const canGenerate = goalTree !== null && siteProfile !== null;

  const handleGenerate = () => {
    if (!goalTree || !siteProfile) return;
    const result = runSequencingEngine(goalTree, siteProfile, project.id, filteredCatalog);
    setLastResult(result);
    const scheduledTasks = scheduleTasksToCalendar(
      result.generatedPhases,
      result.generatedTasks,
      projectStartDate,
    );
    replaceGoalCompassRows(project.id, result.generatedPhases, scheduledTasks);
    pushGoalCompassToSpine(project.id, result.generatedPhases, scheduledTasks);
  };

  const handleRequestRemove = (interventionId: string) => {
    if (!goalTree || !siteProfile) return;
    const baseline =
      lastResult ??
      runSequencingEngine(goalTree, siteProfile, project.id, filteredCatalog);
    setLastResult(baseline);
    const p = computeImpactPreview(
      goalTree,
      siteProfile,
      project.id,
      baseline,
      interventionId,
      excludedIds ?? [],
    );
    setPreview(p);
  };

  const handleConfirmRemove = () => {
    if (!preview || !goalTree || !siteProfile) return;
    const nextExcluded = new Set<string>([
      ...(excludedIds ?? []),
      preview.removedInterventionId,
    ]);
    excludeIntervention(project.id, preview.removedInterventionId);
    const nextCatalog = INTERVENTION_CATALOG.filter((i) => !nextExcluded.has(i.id));
    const result = runSequencingEngine(goalTree, siteProfile, project.id, nextCatalog);
    setLastResult(result);
    const scheduledTasks = scheduleTasksToCalendar(
      result.generatedPhases,
      result.generatedTasks,
      projectStartDate,
    );
    replaceGoalCompassRows(project.id, result.generatedPhases, scheduledTasks);
    pushGoalCompassToSpine(project.id, result.generatedPhases, scheduledTasks);
    setPreview(null);
  };

  const handleRestoreAll = () => {
    if (!goalTree || !siteProfile) return;
    clearExclusions(project.id);
    const result = runSequencingEngine(goalTree, siteProfile, project.id, INTERVENTION_CATALOG);
    setLastResult(result);
    const scheduledTasks = scheduleTasksToCalendar(
      result.generatedPhases,
      result.generatedTasks,
      projectStartDate,
    );
    replaceGoalCompassRows(project.id, result.generatedPhases, scheduledTasks);
    pushGoalCompassToSpine(project.id, result.generatedPhases, scheduledTasks);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Goal Compass · 3 of 5</span>
        <h2 className={styles.title}>Proposal</h2>
        <p className={styles.lede}>
          Deterministic sequencing engine reads the Goal tree + Site profile
          against the curated intervention catalog and emits a phased,
          costed, labor-budgeted proposal into the shared phase store.
        </p>
      </div>

      <section className={styles.section}>
        <div className={styles.btnRow}>
          <button
            type="button"
            className={styles.btn}
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            Generate proposal
          </button>
          {excludedIds && excludedIds.length > 0 ? (
            <button
              type="button"
              className={styles.btn}
              onClick={handleRestoreAll}
              title={excludedIds.join(', ')}
            >
              Restore {excludedIds.length} excluded
            </button>
          ) : null}
          {!canGenerate ? (
            <span className={styles.hint}>
              Fill Goal tree + Site profile tabs first.
            </span>
          ) : null}
        </div>
      </section>

      <GenerateSiteDesignBar project={project} />

      {generatedPhases.length === 0 ? (
        <div className={styles.empty}>
          No proposal yet — click <strong>Generate proposal</strong>.
        </div>
      ) : (
        generatedPhases.map((phase) => (
          <section key={phase.id} className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {phase.name}{' '}
              <span style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>
                {phase.timeframe}
              </span>
            </h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Intervention</th>
                  <th>Status</th>
                  <th className="num">Labor hrs</th>
                  <th className="num">Cost</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(phase.tasks ?? []).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                    </td>
                    <td>
                      {t.status === 'overridden' ? (
                        <span className={`${styles.pill} ${styles.pillPartial}`}>
                          Overridden
                        </span>
                      ) : (
                        <span className={`${styles.pill} ${styles.pillMet}`}>
                          Generated
                        </span>
                      )}
                    </td>
                    <td className="num">{t.laborHrs}</td>
                    <td className="num">{fmtUSD(t.costUSD)}</td>
                    <td>
                      {t.generatedFromIntervention && t.status !== 'overridden' ? (
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => handleRequestRemove(t.generatedFromIntervention!)}
                        >
                          Preview removal
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      {preview ? (
        <ImpactPreviewPanel
          preview={preview}
          onCancel={() => setPreview(null)}
          onConfirm={handleConfirmRemove}
        />
      ) : null}
    </div>
  );
}

function ImpactPreviewPanel({
  preview,
  onCancel,
  onConfirm,
}: {
  preview: ImpactPreview;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Impact preview"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: 22,
          borderRadius: 12,
          background: '#1a1714',
          border: '1px solid rgba(212,182,99,0.45)',
          color: 'rgba(232,220,200,0.92)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(245,225,170,0.95)',
          }}
        >
          Impact preview — remove "{preview.removedInterventionName}"
        </h2>
        <ul style={{ margin: '12px 0 18px', paddingLeft: 18, fontSize: 13, lineHeight: 1.55 }}>
          {preview.summaryLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        {preview.cascadingRemovals.length > 0 ? (
          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,220,200,0.55)' }}>
              Cascading removals
            </h3>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
              {preview.cascadingRemovals.map((c) => (
                <li key={c.id}>
                  {c.name} <em style={{ color: 'rgba(232,220,200,0.5)' }}>({c.reason})</em>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,220,200,0.55)' }}>
            Forecast deltas at Year 10
          </h3>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
            {preview.deltas.map((d) => {
              const y10 = d.byYear.find((y) => y.year === 10);
              if (!y10) return null;
              const delta = y10.delta;
              const arrow = delta < 0 ? '↓' : delta > 0 ? '↑' : '·';
              return (
                <li key={d.criterionId}>
                  {d.criterionDescription} ({d.unit}): {y10.before.toFixed(0)} →{' '}
                  {y10.after.toFixed(0)} {arrow} {Math.abs(delta).toFixed(0)}
                  {d.meetsByDeadlineBefore && !d.meetsByDeadlineAfter ? (
                    <span className={styles.pillUnmet} style={{ marginLeft: 8 }}>
                      misses deadline
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} className={styles.btn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={styles.btn}
            style={{ background: 'rgba(220,80,80,0.2)', borderColor: 'rgba(220,80,80,0.5)' }}
          >
            Confirm removal
          </button>
        </div>
      </div>
    </div>
  );
}
