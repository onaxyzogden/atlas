/**
 * ActObjectiveMonitoringPanel -- the Act-side LIVE monitoring stream for an
 * executing objective. The Plan stage authored each Mode-4 (Design) objective's
 * `monitoringProtocol` (>=2 Key Indicators, >=1 Response Trigger, one Observe
 * `feeds` destination) as DISPLAY-ONLY chrome. This panel makes that protocol
 * live during Act: it renders the same indicators / triggers / feed, surfaces
 * the LATEST recorded reading per indicator, and lets the executing steward
 * record a new reading that lands in the Observe substrate as a real
 * `ObserveDataPoint` -- the same write the panel's own "Record observation"
 * button performs, but scoped to a single named indicator.
 *
 * Mirrors the Plan renderer MonitoringStreamPanel for the read half (Gauge /
 * Telescope, UNIVERSAL_DOMAIN_LABELS[feeds]) and reuses ActTierExecutionPanel's
 * exact ObserveDataPoint literal for the write half (domainId = the protocol's
 * `feeds`, sourceObjectiveId = the objective, capturedBy 'act-tier').
 *
 * COVENANT: the reading `note` is the one new free-text Act surface here. It is
 * guarded on BOTH boundaries with the shared `detectCsaLikeText` +
 * `CSA_ADVISORY_COPY` (no new regex authored) -- the Record control disables and
 * an advisory shows while the text resembles advance-purchase or capital-
 * offering framing, AND the write hard-rejects (no-op) before recordDataPoint.
 *
 * Display + append-only: it never gates or freezes the Act loop, never mutates
 * the catalogue objective. Self-gates to null when the objective carries no
 * `monitoringProtocol`. Own green register CSS.
 */

import { useMemo, useState } from 'react';
import {
  UNIVERSAL_DOMAIN_LABELS,
  type ObserveDataPoint,
  type PlanStratumObjective,
} from '@ogden/shared';
import { AlertTriangle, ClipboardCheck, Gauge, Telescope } from 'lucide-react';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';
import {
  formatActyTimestamp,
  readNote,
} from '../../observe/dashboard/observationDisplay.js';
import {
  CSA_ADVISORY_COPY,
  detectCsaLikeText,
} from '../../plan/threshold/coherenceCheckModel.js';
import styles from './ActObjectiveMonitoringPanel.module.css';

export interface ActObjectiveMonitoringPanelProps {
  projectId: string;
  objective: PlanStratumObjective;
}

/** Stable empty reference so the store selector never churns when a project has
 *  recorded nothing yet. */
const NO_POINTS: readonly ObserveDataPoint[] = Object.freeze([]);

export default function ActObjectiveMonitoringPanel({
  projectId,
  objective,
}: ActObjectiveMonitoringPanelProps) {
  const protocol = objective.monitoringProtocol;

  // --- hooks run unconditionally (self-gate happens AFTER) ---
  const projectPoints = useObserveDataPointStore(
    (s) => s.byProject[projectId] ?? NO_POINTS,
  );
  const recordDataPoint = useObserveDataPointStore((s) => s.recordDataPoint);

  const [metric, setMetric] = useState(
    () => protocol?.indicators[0]?.metric ?? '',
  );
  const [note, setNote] = useState('');

  // Newest recorded reading per indicator metric, matched by the same
  // `measurementValue.label` the write uses. capturedAt is an ISO string, so a
  // lexicographic compare orders the readings.
  const latestByMetric = useMemo(() => {
    const map = new Map<string, ObserveDataPoint>();
    for (const p of projectPoints) {
      if (p.sourceObjectiveId !== objective.id) continue;
      const label = (p.measurementValue as { label?: string } | null)?.label;
      if (!label) continue;
      const prev = map.get(label);
      if (!prev || p.capturedAt > prev.capturedAt) map.set(label, p);
    }
    return map;
  }, [projectPoints, objective.id]);

  // Self-gate: only an objective that carries a monitoring protocol has a stream.
  if (!protocol) return null;

  const flagged = detectCsaLikeText(note);
  const canRecord = note.trim().length > 0 && metric.length > 0 && !flagged;

  function handleRecordReading() {
    if (!protocol) return;
    const trimmed = note.trim();
    if (trimmed.length === 0 || metric.length === 0) return;
    // Hard covenant boundary: never persist advance-purchase or capital-
    // offering framing, even if the UI guard were bypassed.
    if (detectCsaLikeText(trimmed)) return;
    const point: ObserveDataPoint = {
      id: crypto.randomUUID(),
      projectId,
      domainId: protocol.feeds,
      sourceType: 'manual_observation',
      sourceActionId: null,
      sourceFeedEntryId: null,
      sourceObjectiveId: objective.id,
      sourceFeatureRef: null,
      locationGeometry: null,
      cycleId: 0,
      isSuperseded: false,
      supersededBy: null,
      statusOutput: 'clear',
      measurementValue: { label: metric, note: trimmed },
      proofItems: [],
      capturedAt: new Date().toISOString(),
      capturedBy: 'act-tier',
    };
    recordDataPoint(point);
    setNote('');
  }

  return (
    <section
      className={styles.panel}
      data-testid="act-execution-monitoring"
      aria-label="Live monitoring stream"
    >
      <div className={styles.head}>
        <Gauge size={14} aria-hidden="true" className={styles.icon} />
        <p className={styles.title}>Live monitoring</p>
      </div>

      <div className={styles.group}>
        <p className={styles.groupLabel}>Key indicators</p>
        <ul className={styles.list}>
          {protocol.indicators.map(({ metric: m, frequency }) => {
            const latest = latestByMetric.get(m);
            const latestNote = latest ? readNote(latest.measurementValue) : null;
            return (
              <li key={m} className={styles.item}>
                <span className={styles.bullet} aria-hidden="true" />
                <span className={styles.metricWrap}>
                  <span className={styles.metric}>
                    {m}
                    <span className={styles.freq}>{frequency}</span>
                  </span>
                  {latest ? (
                    <span
                      className={styles.reading}
                      data-testid="monitoring-latest-reading"
                    >
                      Last: {latestNote ?? 'recorded'}
                      <span className={styles.readingMeta}>
                        {formatActyTimestamp(latest.capturedAt)} &middot;{' '}
                        {latest.capturedBy}
                      </span>
                    </span>
                  ) : (
                    <span className={styles.readingEmpty}>No reading yet.</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.group}>
        <p className={styles.groupLabel}>Response triggers</p>
        <ul className={styles.list}>
          {protocol.triggers.map((text) => (
            <li key={text} className={`${styles.item} ${styles.itemTrigger}`}>
              <span className={styles.bullet} aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.feeds} data-testid="monitoring-feeds">
        <Telescope size={13} aria-hidden="true" className={styles.icon} />
        <span className={styles.feedsLabel}>Feeds</span>
        {/* feeds is type- and Zod-schema-constrained to a known UniversalDomain,
            so the label resolves; the widened lookup + ?? is a defensive guard
            against un-validated/legacy protocol data so this can't render blank. */}
        <span>
          {(UNIVERSAL_DOMAIN_LABELS as Record<string, string | undefined>)[
            protocol.feeds
          ] ?? protocol.feeds}
        </span>
      </p>

      {/* Record a reading: writes a real ObserveDataPoint for the chosen
          indicator. The note is covenant-guarded on both boundaries. */}
      <div className={styles.record}>
        <p className={styles.groupLabel}>Record a reading</p>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Indicator</span>
          <select
            className={styles.select}
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            aria-label="Indicator"
          >
            {protocol.indicators.map(({ metric: m }) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Reading</span>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Observed value or condition (e.g. flow steady, 2cm growth)."
            aria-label="Reading note"
            data-testid="monitoring-note-input"
          />
        </label>

        {flagged && (
          <div className={styles.advisory} data-testid="monitoring-note-advisory">
            <AlertTriangle size={13} aria-hidden="true" />
            <span>
              <strong>{CSA_ADVISORY_COPY.title}.</strong> {CSA_ADVISORY_COPY.body}
            </span>
          </div>
        )}

        <button
          type="button"
          className={styles.recordBtn}
          disabled={!canRecord}
          onClick={handleRecordReading}
          data-testid="record-reading-btn"
        >
          <ClipboardCheck size={14} aria-hidden="true" />
          Record reading
        </button>
      </div>
    </section>
  );
}
