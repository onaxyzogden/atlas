/**
 * RotationAdherenceActionsCard — B3.1 editable companion to the
 * read-only adherence audit. Per-row inline Save/Cancel editors
 * keyed off AdherenceKind. Writes only to rotationPlanStore.
 * Pushes a WorkItemDraft to workItemDraftStore on
 * "Schedule make-good task" — never reads or writes work-item
 * execution state.
 *
 * Covenant: strictly agronomic / operating analytics.
 * Forbidden scope: any monetary, commercial, or usurious framing.
 */
import { useMemo, useState } from 'react';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useWorkItemDraftStore } from '../../store/workItemDraftStore.js';
import {
  computeRotationAdherence,
  type AdherenceRecommendation,
  type RotationAdherence,
} from './rotationAdherence.js';
import {
  OvergrazedEditor,
  RestEditor,
  UnplannedPaddockEditor,
} from './editors/index.js';
import css from './RotationAdherenceActionsCard.module.css';

interface Props {
  projectId: string;
}

const SEVERITY_CLASS = {
  high: css.badgeAlert,
  med: css.badgeWarn,
  low: css.badgeGood,
} as const;

function EditorFor({
  rec,
  projectId,
  onClose,
}: {
  rec: AdherenceRecommendation;
  projectId: string;
  onClose: () => void;
}) {
  const paddockId = rec.paddockId ?? '';
  switch (rec.kind) {
    case 'overgrazed':
      return (
        <OvergrazedEditor
          projectId={projectId}
          paddockId={paddockId}
          onClose={onClose}
        />
      );
    case 'under-rested-reentry':
    case 'short-rest':
      return (
        <RestEditor
          projectId={projectId}
          paddockId={paddockId}
          onClose={onClose}
        />
      );
    case 'unplanned-paddock':
      return (
        <UnplannedPaddockEditor
          projectId={projectId}
          paddockId={paddockId}
          onClose={onClose}
        />
      );
    case 'early-move':
      return null;
  }
}

export default function RotationAdherenceActionsCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const plan = useRotationPlanStore((s) => s.byProject[projectId] ?? null);
  const moves = useLivestockMoveLogStore((s) => s.events);
  const setDraft = useWorkItemDraftStore((s) => s.setDraft);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const adherence: RotationAdherence = useMemo(
    () =>
      computeRotationAdherence({
        paddocks,
        plan,
        moves,
        now: new Date().toISOString(),
      }),
    [paddocks, plan, moves],
  );

  const [openEditor, setOpenEditor] = useState<string | null>(null);

  if (paddocks.length === 0) {
    return (
      <section className={css.card}>
        <h3 className={css.cardTitle}>Rotation adherence — actions</h3>
        <div className={css.empty}>No paddocks in this project yet.</div>
      </section>
    );
  }

  if (adherence.recommendations.length === 0) {
    return (
      <section className={css.card}>
        <h3 className={css.cardTitle}>Rotation adherence — actions</h3>
        <div className={css.empty}>
          On track — logged moves match the rotation plan.
        </div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <h3 className={css.cardTitle}>Rotation adherence — actions</h3>
      <div className={css.moveList}>
        {adherence.recommendations.map((r) => {
          const isOpen = openEditor === r.id;
          const supportsEdit = r.kind !== 'early-move';
          return (
            <div
              key={r.id}
              className={css.recRow}
              data-testid="action-row"
              data-severity={r.severity}
            >
              <div className={css.recHead}>
                <span className={`${css.recSev} ${SEVERITY_CLASS[r.severity]}`}>
                  [{r.severity.toUpperCase()}]
                </span>
                <span className={css.recMsg}>{r.message}</span>
                {supportsEdit ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenEditor((cur) => (cur === r.id ? null : r.id))
                    }
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      title: `Make-good move — ${r.message}`,
                      notes: undefined,
                      paddockId: r.paddockId,
                      source: 'rotation-adherence',
                    })
                  }
                >
                  Schedule make-good task
                </button>
              </div>
              {isOpen ? (
                <div className={css.editorSlot}>
                  <EditorFor
                    rec={r}
                    projectId={projectId}
                    onClose={() => setOpenEditor(null)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className={css.assumption}>
        Edits write only to the rotation plan. The Schedule make-good
        button drafts a corrective work item handed to the Plan
        execution tracker — this surface never marks work-item status.
      </div>
    </section>
  );
}
