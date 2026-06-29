/**
 * KeyDocumentBriefPopup -- the centered-modal that shows the FULL brief behind
 * an Act-Mandate key-document card. Shared by both the Plan Act Mandate surface
 * and the Act-side briefing card (parity). Wraps the project's animated
 * WorkspacePopup (portal to body, focus trap, scrim, animate in AND out).
 *
 * Body switches on the brief kind:
 *   - planning-direction -> the full approved direction text (paragraph-split),
 *     or a state note when unapproved / approved-with-no-text;
 *   - coherence-record   -> the sealed record plus its recorded amendments, or a
 *     clean / pending note;
 *   - integrated-design  -> every resolved objective grouped by stratum, with
 *     each objective's Act handoff where it names one, or an empty note.
 *
 * Dates are formatted HERE (not in the pure model) so the model stays pure. All
 * authored copy comes from ACT_MANDATE_COPY (banned-term-scanned in test).
 */

import {
  ACT_MANDATE_COPY,
  type KeyDocumentBrief,
} from './actMandateModel.js';
import { PresenceBadge } from './KeyDocumentCard.js';
import WorkspacePopup from '../../act/tier-shell/WorkspacePopup.js';
import css from './KeyDocumentBriefPopup.module.css';

const DOCS = ACT_MANDATE_COPY.documents;

/** Format an epoch-ms timestamp as a short, locale-aware date. */
function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Split a free-text block into paragraphs on blank lines. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function BriefBody({ brief }: { brief: KeyDocumentBrief }) {
  if (brief.kind === 'planning-direction') {
    if (brief.text) {
      return (
        <>
          {paragraphs(brief.text).map((p, i) => (
            <p key={i} className={css.prose}>
              {p}
            </p>
          ))}
        </>
      );
    }
    return (
      <p className={css.note}>
        {brief.present
          ? DOCS.planningDirection.brief.approvedNoText
          : DOCS.planningDirection.brief.pendingNote}
      </p>
    );
  }

  if (brief.kind === 'coherence-record') {
    if (!brief.present) {
      return <p className={css.note}>{DOCS.coherenceRecord.brief.pendingNote}</p>;
    }
    if (brief.amendments.length === 0) {
      return <p className={css.note}>{DOCS.coherenceRecord.brief.cleanNote}</p>;
    }
    return (
      <>
        <h3 className={css.sectionHeading}>
          {DOCS.coherenceRecord.brief.amendmentsHeading}
        </h3>
        <ul className={css.amendmentList}>
          {brief.amendments.map((a) => (
            <li
              key={`${a.itemId}-${a.resolvedAt}`}
              className={css.amendmentItem}
            >
              <div className={css.amendmentHead}>
                <span className={css.amendmentTitle}>{a.title}</span>
                <span className={css.amendmentDate}>
                  {formatDate(a.resolvedAt)}
                </span>
              </div>
              <p className={css.amendmentText}>{a.amendmentText}</p>
            </li>
          ))}
        </ul>
      </>
    );
  }

  // integrated-design
  if (brief.objectiveCount === 0) {
    return <p className={css.note}>{DOCS.integratedDesign.brief.emptyNote}</p>;
  }
  return (
    <>
      <h3 className={css.sectionHeading}>
        {DOCS.integratedDesign.brief.objectivesHeading}
      </h3>
      {brief.groups.map((group) => (
        <section key={group.stratumId} className={css.group}>
          <div className={css.groupHead}>
            <span className={css.groupLabel}>{group.label}</span>
            <span className={css.groupTally}>{group.objectives.length}</span>
          </div>
          <ul className={css.objList}>
            {group.objectives.map((o) => (
              <li key={o.id} className={css.objItem}>
                <div className={css.objHead}>
                  {o.ref && <span className={css.objRef}>{o.ref}</span>}
                  <span className={css.objTitle}>{o.title}</span>
                </div>
                {o.handoff && (
                  <p className={css.objHandoff}>
                    <span className={css.handoffLabel}>
                      {DOCS.integratedDesign.brief.handoffLabel}:
                    </span>{' '}
                    {o.handoff}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export default function KeyDocumentBriefPopup({
  open,
  brief,
  onClose,
}: {
  open: boolean;
  /** The selected document's brief; held by the parent. May be null while closed. */
  brief: KeyDocumentBrief | null;
  onClose: () => void;
}) {
  return (
    <WorkspacePopup
      open={open}
      onClose={onClose}
      ariaLabel={brief ? brief.name : 'Document brief'}
    >
      {brief && (
        <article className={css.root}>
          <header className={css.head}>
            <PresenceBadge present={brief.present} className={css.presence} />
            <h2 className={css.title}>{brief.name}</h2>
            <p className={css.stateLine}>{brief.stateLine}</p>
            <p className={css.intro}>{brief.intro}</p>
          </header>
          <div className={css.bodyContent}>
            <BriefBody brief={brief} />
          </div>
        </article>
      )}
    </WorkspacePopup>
  );
}
