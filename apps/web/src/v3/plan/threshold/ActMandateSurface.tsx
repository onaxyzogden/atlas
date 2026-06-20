/**
 * ActMandateSurface -- the center-canvas takeover for Threshold 3 (The Act
 * Mandate), mounted by PlanTierShell on the `plan/threshold/$thresholdId` route
 * (when `thresholdId === 'threshold-3'`) in place of the editable map (so NO
 * WebGL mounts here). Mirrors CoherenceCheckSurface (the Threshold-2 template).
 *
 * Threshold 3 is the FINAL Plan-stage surface, after `s7-phasing-resourcing`. It
 * is an assembly + ceremony, not an audit. It gathers, from records that already
 * exist:
 *   - the three KEY DOCUMENTS that travel into Act (Planning Direction Statement,
 *     Coherence Record, and the full Resolved Integrated Design);
 *   - the handoff inventory -- every objective's `actHandoff`, grouped by stratum,
 *     plus the two prior threshold records as synthetic packages;
 *   - an ADVISORY readiness (T1 approved, T2 sealed, Launch Preparation complete).
 *
 * NOTHING IS DESIGNED HERE. The single deliberate act is BEGIN ACT: it stamps the
 * Act mandate (`beginAct`, idempotent) which arms `planReadOnly`, then navigates
 * to the Act tier shell. Begin Act is ALWAYS enabled (operator decision) --
 * readiness is shown as advice and never blocks. This surface is terminal: there
 * is no downstream gate banner.
 *
 * AMANAH: every OLOS-authored string lives in `ACT_MANDATE_COPY` (banned-term
 * scanned in the model test). This surface accepts no steward free-text -- the
 * covenant guard (`detectCsaLikeText`) lives on the concern fields raised against
 * a locked objective (planConcernsStore), not here.
 */

import { useNavigate } from '@tanstack/react-router';
import {
  findPlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { ArrowRight, Check, CheckCircle2, Circle, FileText, Minus } from 'lucide-react';
import {
  EMPTY_REALITY_CHECK,
  useRealityCheckStore,
} from '../../../store/realityCheckStore.js';
import {
  EMPTY_COHERENCE_CHECK,
  useCoherenceCheckStore,
} from '../../../store/coherenceCheckStore.js';
import { useActMandateStore } from '../../../store/actMandateStore.js';
import {
  ACT_MANDATE_COPY,
  assembleActMandate,
  type HandoffPackage,
  type KeyDocument,
} from './actMandateModel.js';
import ConcernGovernancePanel from './ConcernGovernancePanel.js';
import styles from './ActMandate.module.css';

export interface ActMandateSurfaceProps {
  projectId: string;
  projectName: string;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
}

function PresenceBadge({ present }: { present: boolean }) {
  return (
    <span className={styles.presence} data-present={present || undefined}>
      {present ? (
        <CheckCircle2 size={12} aria-hidden="true" />
      ) : (
        <Circle size={12} aria-hidden="true" />
      )}
      {present ? 'In hand' : 'Pending'}
    </span>
  );
}

function DocumentCard({ doc }: { doc: KeyDocument }) {
  return (
    <li className={styles.docCard} data-present={doc.present || undefined}>
      <div className={styles.docHead}>
        <PresenceBadge present={doc.present} />
        <div className={styles.docTitleWrap}>
          <span className={styles.docName}>{doc.name}</span>
        </div>
      </div>
      <p className={styles.docDesc}>{doc.desc}</p>
      <p className={styles.docState}>{doc.stateLine}</p>
    </li>
  );
}

function HandoffCard({ pkg }: { pkg: HandoffPackage }) {
  const badge =
    pkg.kind === 'synthetic'
      ? ACT_MANDATE_COPY.handoffs.syntheticBadge
      : ACT_MANDATE_COPY.handoffs.derivedBadge;
  return (
    <li className={styles.handoffCard} data-kind={pkg.kind}>
      <div className={styles.handoffHead}>
        <span className={styles.kindBadge} data-kind={pkg.kind}>
          {pkg.kind === 'synthetic' ? (
            <FileText size={11} aria-hidden="true" />
          ) : (
            <ArrowRight size={11} aria-hidden="true" />
          )}
          {badge}
        </span>
        <div className={styles.handoffTitleWrap}>
          {pkg.ref && <span className={styles.handoffRef}>{pkg.ref}</span>}
          <span className={styles.handoffTitle}>{pkg.title}</span>
        </div>
      </div>
      <p className={styles.handoffText}>{pkg.handoff}</p>
    </li>
  );
}

export default function ActMandateSurface({
  projectId,
  projectName,
  objectives,
  objectiveStatuses,
}: ActMandateSurfaceProps) {
  const navigate = useNavigate();

  const realityRecord = useRealityCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_REALITY_CHECK,
  );
  const coherenceRecord = useCoherenceCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_COHERENCE_CHECK,
  );
  const beginAct = useActMandateStore((s) => s.beginAct);

  const model = assembleActMandate({
    objectives,
    statuses: objectiveStatuses,
    planningDirection: realityRecord,
    coherenceRecord,
    stratumTitleFor: (stratumId) => findPlanStratum(stratumId)?.title ?? stratumId,
  });

  const { keyDocuments, handoffGroups, planningDirectionPackage, coherenceRecordPackage, readiness } =
    model;

  // The two synthetic threshold records lead the handoff inventory (they carry
  // the whole project's direction + quality record), then the derived
  // per-objective handoffs grouped by stratum.
  const syntheticPackages: HandoffPackage[] = [
    ...(planningDirectionPackage ? [planningDirectionPackage] : []),
    ...(coherenceRecordPackage ? [coherenceRecordPackage] : []),
  ];
  const hasHandoffs = syntheticPackages.length > 0 || handoffGroups.length > 0;

  const begin = ACT_MANDATE_COPY.begin;
  const launchMet =
    readiness.launchPrep.total > 0 &&
    readiness.launchPrep.complete === readiness.launchPrep.total;

  const readinessRows: {
    key: string;
    label: string;
    met: boolean;
    tally?: string;
  }[] = [
    { key: 't1', label: begin.readinessItems.t1, met: readiness.t1Approved },
    { key: 't2', label: begin.readinessItems.t2, met: readiness.t2Sealed },
    {
      key: 'launch',
      label: begin.readinessItems.launch,
      met: launchMet,
      tally: `${readiness.launchPrep.complete}/${readiness.launchPrep.total}`,
    },
  ];

  const handleBeginAct = () => {
    beginAct(projectId);
    navigate({
      to: '/v3/project/$projectId/act/tier-shell',
      params: { projectId },
    } as never);
  };

  return (
    <div
      className={styles.surface}
      data-testid="act-mandate-surface"
      data-ready={readiness.ready || undefined}
      aria-label={`The Act Mandate for ${projectName}`}
    >
      <header className={styles.modeHeader}>
        <div className={styles.modeBar}>
          <span className={styles.modePill}>{ACT_MANDATE_COPY.modeLabel}</span>
          <h1 className={styles.modeTitle}>{ACT_MANDATE_COPY.title}</h1>
        </div>
        <p className={styles.modeTagline}>{ACT_MANDATE_COPY.tagline}</p>
        <ul className={styles.readinessTrack} aria-label="Act readiness">
          {readinessRows.map((row) => (
            <li
              key={row.key}
              className={styles.readinessTrackItem}
              data-met={row.met || undefined}
            >
              <span className={styles.readinessTrackDot}>
                {row.met ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  <Circle size={11} aria-hidden="true" />
                )}
              </span>
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className={styles.body}>
        <p className={styles.intro}>{ACT_MANDATE_COPY.intro}</p>

        {/* Layer 1 -- the three key documents that travel into Act. */}
        <section className={styles.section} aria-label="Key documents">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionHeading}>
              {ACT_MANDATE_COPY.documents.heading}
            </h2>
          </div>
          <p className={styles.sectionBlurb}>
            {ACT_MANDATE_COPY.documents.blurb}
          </p>
          <ul className={styles.docList}>
            {keyDocuments.map((doc) => (
              <DocumentCard key={doc.kind} doc={doc} />
            ))}
          </ul>
        </section>

        {/* Layer 2 -- the grouped handoff inventory. */}
        <section className={styles.section} aria-label="What carries into Act">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionHeading}>
              {ACT_MANDATE_COPY.handoffs.heading}
            </h2>
            <span className={styles.sectionTallyChip}>
              {readiness.handoffCount}{' '}
              {readiness.handoffCount === 1 ? 'package' : 'packages'}
            </span>
          </div>
          <p className={styles.sectionBlurb}>{ACT_MANDATE_COPY.handoffs.blurb}</p>

          {!hasHandoffs ? (
            <p className={styles.sectionEmpty}>
              {ACT_MANDATE_COPY.handoffs.emptyNote}
            </p>
          ) : (
            <>
              {syntheticPackages.length > 0 && (
                <div className={styles.handoffGroup}>
                  <div className={styles.handoffGroupHead}>
                    <span>Threshold records</span>
                    <span className={styles.handoffGroupTally}>
                      {syntheticPackages.length}
                    </span>
                  </div>
                  <ul className={styles.handoffList}>
                    {syntheticPackages.map((pkg) => (
                      <HandoffCard key={pkg.id} pkg={pkg} />
                    ))}
                  </ul>
                </div>
              )}

              {handoffGroups.map((group) => (
                <div key={group.stratumId} className={styles.handoffGroup}>
                  <div className={styles.handoffGroupHead}>
                    <span>{group.label}</span>
                    <span className={styles.handoffGroupTally}>
                      {group.packages.length}
                    </span>
                  </div>
                  <ul className={styles.handoffList}>
                    {group.packages.map((pkg) => (
                      <HandoffCard key={pkg.id} pkg={pkg} />
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </section>

        {/* Layer 3 -- Begin Act (the only hard gate of the Plan stage). */}
        <section className={styles.beginPanel} aria-label="Begin Act">
          <div className={styles.beginHead}>
            <h2 className={styles.beginTitle}>{begin.heading}</h2>
            <span className={styles.readyPill} data-ready={readiness.ready || undefined}>
              {readiness.ready ? 'Ready' : 'Advisory'}
            </span>
          </div>
          <p className={styles.beginBlurb}>{begin.blurb}</p>

          <p className={styles.readinessHeading}>{begin.readinessHeading}</p>
          <ul className={styles.readinessList}>
            {readinessRows.map((row) => (
              <li
                key={row.key}
                className={styles.readinessItem}
                data-met={row.met || undefined}
              >
                {row.met ? (
                  <CheckCircle2
                    size={14}
                    aria-hidden="true"
                    className={styles.readinessIcon}
                  />
                ) : (
                  <Circle
                    size={14}
                    aria-hidden="true"
                    className={styles.readinessIcon}
                  />
                )}
                <span>{row.label}</span>
                {row.tally && (
                  <span className={styles.readinessTally}>{row.tally}</span>
                )}
              </li>
            ))}
          </ul>

          {readiness.ready ? (
            <p className={styles.readyNote}>{begin.readyNote}</p>
          ) : (
            <p className={styles.advisoryNote}>{begin.advisoryNote}</p>
          )}

          <div className={styles.beginActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleBeginAct}
              data-testid="begin-act-button"
            >
              {begin.button}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <p className={styles.lockNote}>{begin.lockNote}</p>
        </section>

        {/*
         * Governance review queue (Plan-only). Self-gates to null until a concern
         * exists, so the ceremony stays clean pre-mandate. Approve here lifts the
         * lock just long enough to append an amendment ALONGSIDE the original, then
         * re-locks -- the catalogue objective is never overwritten.
         */}
        <ConcernGovernancePanel
          projectId={projectId}
          objectiveTitleFor={(id) =>
            objectives.find((o) => o.id === id)?.title ?? id
          }
        />

        <ul className={styles.notList} aria-label="What this threshold does not do">
          {ACT_MANDATE_COPY.notList.map((line) => (
            <li key={line} className={styles.notItem}>
              <Minus size={13} aria-hidden="true" className={styles.notDot} />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
