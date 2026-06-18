/**
 * CoherenceCheckSurface -- the center-canvas takeover for Threshold 2 (The
 * Coherence Check), mounted by PlanTierShell on the `plan/threshold/$thresholdId`
 * route (when `thresholdId === 'threshold-2'`) in place of the editable map (so NO
 * WebGL mounts here). Mirrors RealityCheckSurface (the Threshold-1 template).
 *
 * It runs a single three-section audit over the completed Mode-4 design work:
 *   A System Integration -- do the s4/s5 designs connect? (config-pinned checks)
 *   B Closed Loops       -- does each enterprise close a waste-to-input loop?
 *   C Monitoring Coverage -- does every design objective carry a complete protocol?
 *
 * NOTHING IS DESIGNED HERE. An OPEN item surfaces its gap prompt + the evidence
 * objectives inline, with an amendment field; submitting records an append-only,
 * permanently-timestamped steward amendment in the coherenceCheckStore (the static
 * catalogue is never mutated) and re-evaluates the item to RESOLVED. When every
 * item is pass-or-resolved the Coherence Record may be SEALED.
 *
 * DISPLAY-ONLY: the seal never blocks navigation (the soft s6/s7 banner is the
 * only downstream effect). AMANAH: amendment text that resembles advance-sale /
 * subscription / CSA / yield-share framing raises a non-blocking advisory AND is
 * refused by the store (a covenant persistence-boundary), so it is never recorded.
 */

import { useState } from 'react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { AlertTriangle, Check, CheckCircle2, Lock, Minus } from 'lucide-react';
import {
  EMPTY_COHERENCE_CHECK,
  useCoherenceCheckStore,
} from '../../../store/coherenceCheckStore.js';
import {
  COHERENCE_COPY,
  CSA_ADVISORY_COPY,
  detectCsaLikeText,
  evaluateCoherenceAudit,
  selectDesignObjectives,
  type AuditItemResult,
  type CoherenceItemStatus,
  type CoherenceSection,
} from './coherenceCheckModel.js';
import styles from './Coherence.module.css';

export interface CoherenceCheckSurfaceProps {
  projectId: string;
  projectName: string;
  /** Project primary type id -- selects the Section A/B integration registry. */
  primaryTypeId: string | null | undefined;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
}

/** YYYY-MM-DD from an epoch-ms timestamp (ASCII + deterministic). */
function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<CoherenceItemStatus, string> = {
  pass: 'Pass',
  open: 'Gap',
  resolved: 'Resolved',
};

function StatusBadge({ status }: { status: CoherenceItemStatus }) {
  const Icon =
    status === 'pass' ? Check : status === 'resolved' ? CheckCircle2 : AlertTriangle;
  return (
    <span className={styles.statusBadge} data-status={status}>
      <Icon size={12} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

interface AuditItemCardProps {
  item: AuditItemResult;
  titleById: Map<string, string>;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}

function AuditItemCard({
  item,
  titleById,
  draft,
  onDraftChange,
  onSubmit,
}: AuditItemCardProps) {
  const trimmed = draft.trim();
  const csaFlagged = detectCsaLikeText(trimmed);
  const canSubmit = trimmed.length > 0 && !csaFlagged;

  return (
    <li className={styles.itemCard} data-status={item.status}>
      <div className={styles.itemHead}>
        <StatusBadge status={item.status} />
        <div className={styles.itemTitleWrap}>
          <span className={styles.itemId}>{item.id.replace(/^c-/, 'C / ')}</span>
          <span className={styles.itemLabel}>{item.label}</span>
        </div>
      </div>

      <p className={styles.itemSummary}>{item.summary}</p>

      {item.passCriteria && item.section !== 'C' && (
        <p className={styles.passCriteria}>
          <span className={styles.passCriteriaLabel}>Connected means: </span>
          {item.passCriteria}
        </p>
      )}

      {item.evidenceObjectiveIds.length > 0 && (
        <div className={styles.evidence}>
          <span className={styles.evidenceLabel}>Design evidence</span>
          <ul className={styles.evidenceList}>
            {item.evidenceObjectiveIds.map((oid) => {
              const title = titleById.get(oid);
              return (
                <li key={oid} className={styles.evidenceItem}>
                  <Check
                    size={13}
                    aria-hidden="true"
                    className={styles.evidenceDot}
                  />
                  {title ?? (
                    <span className={styles.evidenceMissing}>{oid}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {item.status === 'open' && (
        <div className={styles.gapBlock}>
          {item.gapPrompt && <p className={styles.gapPrompt}>{item.gapPrompt}</p>}
          <label className={styles.gapLabel} htmlFor={`amend-${item.id}`}>
            {COHERENCE_COPY.gap.amendmentLabel}
          </label>
          <textarea
            id={`amend-${item.id}`}
            className={styles.amendField}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={COHERENCE_COPY.gap.amendmentPlaceholder}
          />
          {csaFlagged && (
            <div className={styles.advisory} role="note" data-testid="csa-advisory">
              <p className={styles.advisoryTitle}>{CSA_ADVISORY_COPY.title}</p>
              <p className={styles.advisoryBody}>{CSA_ADVISORY_COPY.body}</p>
            </div>
          )}
          <div className={styles.amendActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              {COHERENCE_COPY.gap.submitLabel}
            </button>
          </div>
        </div>
      )}

      {item.status === 'resolved' && item.amendmentText && (
        <div className={styles.resolvedBlock}>
          <div className={styles.resolvedHead}>
            <CheckCircle2 size={13} aria-hidden="true" />
            {COHERENCE_COPY.gap.resolvedLabel}
          </div>
          <p className={styles.resolvedText}>{item.amendmentText}</p>
          {item.resolvedAt != null && (
            <p className={styles.resolvedMeta}>
              Recorded {formatDay(item.resolvedAt)} -- permanent; cannot be edited.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

interface SectionMeta {
  key: CoherenceSection;
  label: string;
  heading: string;
  blurb: string;
  emptyNote: string;
}

const SECTION_META: readonly SectionMeta[] = [
  {
    key: 'A',
    label: COHERENCE_COPY.sectionA.label,
    heading: COHERENCE_COPY.sectionA.heading,
    blurb: COHERENCE_COPY.sectionA.blurb,
    emptyNote:
      'System-integration checks are not defined for this configuration. Monitoring coverage (Section C) still applies.',
  },
  {
    key: 'B',
    label: COHERENCE_COPY.sectionB.label,
    heading: COHERENCE_COPY.sectionB.heading,
    blurb: COHERENCE_COPY.sectionB.blurb,
    emptyNote:
      'No enterprise closed-loop checks are defined for this configuration. Monitoring coverage (Section C) still applies.',
  },
  {
    key: 'C',
    label: COHERENCE_COPY.sectionC.label,
    heading: COHERENCE_COPY.sectionC.heading,
    blurb: COHERENCE_COPY.sectionC.blurb,
    emptyNote:
      'No design objectives are resolved yet, so there is nothing to check for monitoring coverage.',
  },
];

export default function CoherenceCheckSurface({
  projectId,
  projectName,
  primaryTypeId,
  objectives,
  objectiveStatuses,
}: CoherenceCheckSurfaceProps) {
  const record = useCoherenceCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_COHERENCE_CHECK,
  );
  const resolveItem = useCoherenceCheckStore((s) => s.resolveItem);
  const seal = useCoherenceCheckStore((s) => s.seal);
  const unseal = useCoherenceCheckStore((s) => s.unseal);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const audit = evaluateCoherenceAudit({
    primaryTypeId,
    designObjectives: selectDesignObjectives(objectives),
    statuses: objectiveStatuses,
    resolutions: record.itemResolutions,
  });

  // Evidence titles resolve against the FULL objective list (not just s4/s5).
  const titleById = new Map(objectives.map((o) => [o.id, o.title] as const));

  const sealed = record.sealedAt != null;
  const canSeal = audit.verdict === 'pass';

  const sectionsById: Record<CoherenceSection, AuditItemResult[]> = {
    A: audit.sectionA,
    B: audit.sectionB,
    C: audit.sectionC,
  };

  const setDraft = (id: string, value: string) =>
    setDrafts((d) => ({ ...d, [id]: value }));

  const submit = (id: string) => {
    const text = (drafts[id] ?? '').trim();
    // Empty or covenant-flagged text never reaches the store (the store also
    // refuses it); the inline advisory explains why nothing was recorded.
    if (text === '' || detectCsaLikeText(text)) return;
    resolveItem(projectId, id, text);
    setDrafts((d) => {
      const { [id]: _dropped, ...rest } = d;
      return rest;
    });
  };

  return (
    <div
      className={styles.surface}
      data-testid="coherence-check-surface"
      data-verdict={audit.verdict}
    >
      <header className={styles.modeHeader}>
        <div className={styles.modeBar}>
          <span className={styles.modePill}>{COHERENCE_COPY.modeLabel}</span>
          <h1 className={styles.modeTitle}>{COHERENCE_COPY.title}</h1>
        </div>
        <p className={styles.modeTagline}>{COHERENCE_COPY.tagline}</p>
        <ol className={styles.sectionTrack} aria-label="Coherence audit sections">
          {SECTION_META.map((meta) => {
            const t = audit.tallies[meta.key];
            const complete = t.total > 0 && t.passed === t.total;
            return (
              <li
                key={meta.key}
                className={styles.sectionTrackItem}
                data-complete={complete || undefined}
              >
                <span className={styles.sectionTrackKey}>{meta.key}</span>
                <span>{meta.label}</span>
                <span className={styles.sectionTrackTally}>
                  {t.passed}/{t.total}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className={styles.body}>
        <p className={styles.intro}>{COHERENCE_COPY.intro}</p>

        {SECTION_META.map((meta) => {
          const items = sectionsById[meta.key];
          const t = audit.tallies[meta.key];
          return (
            <section
              key={meta.key}
              className={styles.section}
              aria-label={`Section ${meta.key} -- ${meta.label}`}
            >
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>
                  <span className={styles.sectionLetter}>{meta.key}</span>
                  {meta.label}
                </span>
                <h2 className={styles.sectionHeading}>{meta.heading}</h2>
                <span className={styles.sectionTallyChip}>
                  {t.passed}/{t.total} clear
                </span>
              </div>
              <p className={styles.sectionBlurb}>{meta.blurb}</p>

              {items.length === 0 ? (
                <p className={styles.sectionEmpty}>{meta.emptyNote}</p>
              ) : (
                <ul className={styles.itemList}>
                  {items.map((item) => (
                    <AuditItemCard
                      key={item.id}
                      item={item}
                      titleById={titleById}
                      draft={drafts[item.id] ?? ''}
                      onDraftChange={(v) => setDraft(item.id, v)}
                      onSubmit={() => submit(item.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section
          className={styles.sealPanel}
          data-sealed={sealed || undefined}
          aria-label="Coherence Record"
        >
          <div className={styles.sealHead}>
            <h2 className={styles.sealTitle}>
              {sealed
                ? COHERENCE_COPY.seal.sealedTitle
                : COHERENCE_COPY.seal.formingTitle}
            </h2>
            <span className={styles.verdictPill} data-verdict={audit.verdict}>
              {COHERENCE_COPY.seal.verdictLabel}:{' '}
              {audit.verdict === 'pass'
                ? COHERENCE_COPY.seal.verdictPass
                : 'FORMING'}
            </span>
          </div>

          {sealed ? (
            <>
              <p className={styles.sealedStamp}>
                <Lock size={14} aria-hidden="true" />
                Sealed {record.sealedAt != null ? formatDay(record.sealedAt) : ''}
                {' for '}
                {projectName}
              </p>
              <p className={styles.sealedNote}>{COHERENCE_COPY.seal.sealedNote}</p>
              <div className={styles.sealActions}>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => unseal(projectId)}
                >
                  Re-open to revise
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.sealSub}>{COHERENCE_COPY.seal.sub}</p>
              {canSeal ? (
                <p className={styles.sealReady}>{COHERENCE_COPY.seal.readyLabel}</p>
              ) : (
                <p className={styles.sealSub}>
                  {audit.openCount} {audit.openCount === 1 ? 'gap' : 'gaps'}{' '}
                  {COHERENCE_COPY.seal.gapRemainingLabel}.
                </p>
              )}
              <div className={styles.sealActions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={!canSeal}
                  onClick={() => seal(projectId)}
                >
                  <Lock size={14} aria-hidden="true" />
                  {COHERENCE_COPY.seal.sealLabel}
                </button>
              </div>
            </>
          )}
        </section>

        <ul className={styles.notList} aria-label="What this threshold does not do">
          {COHERENCE_COPY.notList.map((line) => (
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
