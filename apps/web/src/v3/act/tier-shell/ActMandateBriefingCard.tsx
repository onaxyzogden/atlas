/**
 * ActMandateBriefingCard -- the Act-side READ-ONLY briefing of the Threshold-3
 * handoff. When a project has crossed into Act ("Begin Act" stamped
 * `mandatedAt`), this card surfaces, in the Act operations dashboard, the
 * mandate the project was handed: the Planning Direction approved at the
 * Reality Check (T1), the Coherence Record sealed at the Coherence Check (T2),
 * the resolved design, and the per-objective handoff inventory grouped by
 * stratum -- plus the advisory readiness reading from the crossing.
 *
 * The Plan stage ASSEMBLES this mandate and the steward crosses with a
 * deliberate "Begin Act"; the Act stage, until now, consumed NONE of it. This
 * card closes that gap: the executing steward sees the briefing they are
 * working against. It reuses the SAME pure assembler (assembleActMandate) and
 * the SAME source records the Plan ceremony reads -- nothing is recomputed.
 *
 * READ-ONLY by construction: no "Begin Act" button (the crossing already
 * happened), no writes, no gate. Self-gates to null when the project has no
 * mandate. Its own green register CSS; reuses only the pure ACT_MANDATE_COPY.
 */

import { useMemo, useState } from 'react';
import {
  findPlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { ArrowRight, CheckCircle2, Circle, FileText } from 'lucide-react';
import {
  EMPTY_REALITY_CHECK,
  useRealityCheckStore,
} from '../../../store/realityCheckStore.js';
import {
  EMPTY_COHERENCE_CHECK,
  useCoherenceCheckStore,
} from '../../../store/coherenceCheckStore.js';
import {
  EMPTY_ACT_MANDATE,
  useActMandateStore,
} from '../../../store/actMandateStore.js';
import {
  ACT_MANDATE_COPY,
  assembleActMandate,
  buildKeyDocumentBriefs,
  type HandoffPackage,
  type KeyDocumentKind,
} from '../../plan/threshold/actMandateModel.js';
import KeyDocumentCard from '../../plan/threshold/KeyDocumentCard.js';
import KeyDocumentBriefPopup from '../../plan/threshold/KeyDocumentBriefPopup.js';
import styles from './ActMandateBriefingCard.module.css';

/**
 * Act-only briefing copy (ASCII; covenant-clean -- carries no commercial or
 * capital-offering framing). The handoff + documents + readiness labels are
 * reused from the pure ACT_MANDATE_COPY block; only the card's own framing is
 * authored here.
 */
const BRIEFING_COPY = {
  pill: 'Act Mandate',
  title: 'Mandate briefing',
  intro:
    'This project has crossed into Act. The committed design is held steady; this briefing carries the mandate it was handed -- the direction approved at the Reality Check, the quality record sealed at the Coherence Check, the resolved design, and what each objective hands to Act. It is read-only here: to change a held objective, raise a concern against it in Plan.',
  readinessHeading: 'Readiness at the crossing',
} as const;

export interface ActMandateBriefingCardProps {
  projectId: string;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
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

export default function ActMandateBriefingCard({
  projectId,
  objectives,
  objectiveStatuses,
}: ActMandateBriefingCardProps) {
  const mandate = useActMandateStore(
    (s) => s.byProject[projectId] ?? EMPTY_ACT_MANDATE,
  );
  const realityRecord = useRealityCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_REALITY_CHECK,
  );
  const coherenceRecord = useCoherenceCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_COHERENCE_CHECK,
  );

  // The key-document card whose full brief is open in the popup (null = closed).
  const [selectedDoc, setSelectedDoc] = useState<KeyDocumentKind | null>(null);

  const model = useMemo(
    () =>
      assembleActMandate({
        objectives,
        statuses: objectiveStatuses,
        planningDirection: realityRecord,
        coherenceRecord,
        stratumTitleFor: (stratumId) =>
          findPlanStratum(stratumId)?.title ?? stratumId,
      }),
    [objectives, objectiveStatuses, realityRecord, coherenceRecord],
  );

  const briefs = useMemo(
    () =>
      buildKeyDocumentBriefs({
        objectives,
        planningDirection: realityRecord,
        coherenceRecord,
        stratumTitleFor: (stratumId) =>
          findPlanStratum(stratumId)?.title ?? stratumId,
        objectiveTitleFor: (id) =>
          objectives.find((o) => o.id === id)?.title ?? id,
      }),
    [objectives, realityRecord, coherenceRecord],
  );

  // Self-gate: only a project that has crossed into Act carries a mandate.
  if (mandate.mandatedAt == null) return null;

  const {
    keyDocuments,
    handoffGroups,
    planningDirectionPackage,
    coherenceRecordPackage,
    readiness,
  } = model;

  const syntheticPackages: HandoffPackage[] = [
    ...(planningDirectionPackage ? [planningDirectionPackage] : []),
    ...(coherenceRecordPackage ? [coherenceRecordPackage] : []),
  ];
  const hasHandoffs = syntheticPackages.length > 0 || handoffGroups.length > 0;

  const launchMet =
    readiness.launchPrep.total > 0 &&
    readiness.launchPrep.complete === readiness.launchPrep.total;
  const readinessRows: {
    key: string;
    label: string;
    met: boolean;
    tally?: string;
  }[] = [
    {
      key: 't1',
      label: ACT_MANDATE_COPY.begin.readinessItems.t1,
      met: readiness.t1Approved,
    },
    {
      key: 't2',
      label: ACT_MANDATE_COPY.begin.readinessItems.t2,
      met: readiness.t2Sealed,
    },
    {
      key: 'launch',
      label: ACT_MANDATE_COPY.begin.readinessItems.launch,
      met: launchMet,
      tally: `${readiness.launchPrep.complete}/${readiness.launchPrep.total}`,
    },
  ];

  return (
    <section
      className={styles.card}
      data-testid="act-mandate-briefing"
      data-ready={readiness.ready || undefined}
      aria-label="Act Mandate briefing"
    >
      <header className={styles.head}>
        <span className={styles.pill}>{BRIEFING_COPY.pill}</span>
        <h3 className={styles.title}>{BRIEFING_COPY.title}</h3>
      </header>
      <p className={styles.intro}>{BRIEFING_COPY.intro}</p>

      {/* The three key documents that travelled into Act. */}
      <section className={styles.section} aria-label="Key documents">
        <div className={styles.sectionHead}>
          <h4 className={styles.sectionHeading}>
            {ACT_MANDATE_COPY.documents.heading}
          </h4>
        </div>
        <p className={styles.sectionBlurb}>{ACT_MANDATE_COPY.documents.blurb}</p>
        <ul className={styles.docList}>
          {keyDocuments.map((doc) => (
            <KeyDocumentCard
              key={doc.kind}
              doc={doc}
              styles={styles}
              onOpen={() => setSelectedDoc(doc.kind)}
            />
          ))}
        </ul>
      </section>

      {/* The grouped handoff inventory. */}
      <section className={styles.section} aria-label="What carries into Act">
        <div className={styles.sectionHead}>
          <h4 className={styles.sectionHeading}>
            {ACT_MANDATE_COPY.handoffs.heading}
          </h4>
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

      {/* Advisory readiness reading carried from the crossing (never a gate). */}
      <section className={styles.section} aria-label="Readiness at the crossing">
        <p className={styles.readinessHeading}>{BRIEFING_COPY.readinessHeading}</p>
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
      </section>

      <KeyDocumentBriefPopup
        open={selectedDoc != null}
        brief={selectedDoc ? briefs[selectedDoc] : null}
        onClose={() => setSelectedDoc(null)}
      />
    </section>
  );
}
