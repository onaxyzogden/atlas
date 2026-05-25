/**
 * OpenObservationNeedsPanel — the Observe stage's "Open Observation Needs"
 * launch surface, rendered as the dashboard shell's bottom tray: a horizontal
 * carousel of guided observation packages. Each card carries the metadata a
 * steward needs to triage (domain, origin, title, why the need exists, location,
 * priority, live status) and an Open action that deep-links into the Observation
 * Capture Workspace. No assignee, no due date — who does the work and when is an
 * Act concern.
 *
 * The header hosts the live count, the active module chip, a "View all needs"
 * escape (clears the module lens), and the "Raise observation need" action for
 * adding a `manual`-origin need by hand.
 */

import { useState } from 'react';
import { MapPin, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useObservationNeedStore } from '../../store/observationNeedStore.js';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import { OBSERVE_MODULE_LABEL, type ObserveModule } from '../observe/types.js';
import {
  buildRaisedNeed,
  editRaisedNeed,
  type ObservationNeed,
  type ObservationNeedOrigin,
  type ObservationNeedPriority,
  type ObservationNeedStatus,
  type RaiseNeedInput,
} from '../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../observation-needs/useObservationNeeds.js';
import RaiseNeedForm from '../observe/capture/RaiseNeedForm.js';
import css from './ObserveCommandCentrePage.module.css';
import shell from './shell/CommandCentreShell.module.css';

interface Props {
  projectId: string;
  views: ObservationNeedView[];
  /** Currently highlighted need (e.g. via a map-marker click). */
  selectedId?: string | null;
  /** Active module lens — drives the header chip + "View all" escape. */
  activeModule: ObserveModule | null;
  onClearFilter: () => void;
  onLaunch: (needId: string) => void;
}

const STATUS_LABEL: Record<ObservationNeedStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  recorded: 'Recorded',
  resolved: 'Resolved',
};

const PRIORITY_LABEL: Record<ObservationNeedPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const ORIGIN_LABEL: Record<ObservationNeedOrigin, string> = {
  seed: 'Seed',
  'follow-up': 'Follow-up',
  manual: 'Manual',
  auto: 'Auto',
};

/** Fallback site centre when there are no needs to average (MTC). */
const FALLBACK_CENTER: [number, number] = [-78.2, 44.5];

/** Only steward-raised needs can be edited or removed; seed/auto cannot. */
const isEditable = (origin: ObservationNeedOrigin): boolean =>
  origin === 'manual' || origin === 'follow-up';

export default function OpenObservationNeedsPanel({
  projectId,
  views,
  selectedId,
  activeModule,
  onClearFilter,
  onLaunch,
}: Props) {
  const createNeed = useObservationNeedStore((s) => s.createNeed);
  const updateNeed = useObservationNeedStore((s) => s.updateNeed);
  const deleteNeed = useObservationNeedStore((s) => s.deleteNeed);
  const setStatus = useObservationNeedStore((s) => s.setStatus);
  const [raising, setRaising] = useState(false);
  const [raisedTitle, setRaisedTitle] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null);

  const editingNeed: ObservationNeed | null = editingId
    ? (views.find((v) => v.objective.id === editingId)?.objective ?? null)
    : null;

  const startEdit = (needId: string) => {
    setRaising(false);
    setRaisedTitle(null);
    setConfirmRemoveId(null);
    setConfirmDismissId(null);
    setEditingId(needId);
  };

  const dismissNeed = (needId: string) => {
    setStatus(projectId, needId, 'resolved');
    setConfirmDismissId(null);
  };

  const submitEdit = (input: RaiseNeedInput & { module: ObserveModule }) => {
    if (!editingNeed) return;
    updateNeed(projectId, editRaisedNeed(editingNeed, input));
    setEditingId(null);
  };

  const removeNeed = (needId: string) => {
    deleteNeed(projectId, needId);
    setConfirmRemoveId(null);
    if (editingId === needId) setEditingId(null);
  };

  // Default a manual need's location to the mean of the existing centres so it
  // lands inside the site rather than at an arbitrary point.
  const meanCenter = (): [number, number] => {
    const centers = views.map((v) => v.objective.target.center);
    if (centers.length === 0) return FALLBACK_CENTER;
    return [
      centers.reduce((a, c) => a + c[0], 0) / centers.length,
      centers.reduce((a, c) => a + c[1], 0) / centers.length,
    ];
  };

  const raiseManual = (input: RaiseNeedInput & { module: ObserveModule }) => {
    const need = buildRaisedNeed(input, {
      id: crypto.randomUUID(),
      projectId,
      module: input.module,
      target: { center: meanCenter() },
      origin: 'manual',
    });
    createNeed(projectId, need);
    setRaising(false);
    setRaisedTitle(need.title);
  };

  return (
    <>
      <div className={shell.trayHead}>
        <p className="eyebrow">Open Observation Needs</p>
        {activeModule && (
          <span className={shell.trayChip}>
            <span
              className={shell.filterChipDot}
              style={{ background: OBSERVE_MODULE_DOT[activeModule] }}
            />
            {OBSERVE_MODULE_LABEL[activeModule]}
          </span>
        )}
        <span className={shell.trayCount}>
          {views.length} {views.length === 1 ? 'need' : 'needs'}
        </span>
        <span className={shell.traySpacer} />
        {activeModule && (
          <button type="button" className={shell.clearFilterBtn} onClick={onClearFilter}>
            View all needs
          </button>
        )}
        <button
          type="button"
          className={shell.raiseBtn}
          onClick={() => {
            setRaisedTitle(null);
            setEditingId(null);
            setRaising((v) => !v);
          }}
        >
          <Plus size={14} strokeWidth={2} /> Raise observation need
        </button>
      </div>

      {raising && !editingNeed && (
        <div className={css.raiseFormWrap}>
          <RaiseNeedForm
            showModulePicker
            onSubmit={raiseManual}
            onCancel={() => setRaising(false)}
          />
        </div>
      )}
      {editingNeed && (
        <div className={css.raiseFormWrap}>
          <RaiseNeedForm
            showModulePicker
            submitLabel="Save changes"
            initial={{
              module: editingNeed.module,
              title: editingNeed.title,
              reason: editingNeed.reason,
              priority: editingNeed.priority,
              trigger: editingNeed.trigger,
              planImpact: editingNeed.planImpact,
            }}
            onSubmit={submitEdit}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}
      {raisedTitle && !raising && !editingNeed && (
        <p className={css.raiseHint}>Observation need raised: “{raisedTitle}”</p>
      )}

      {views.length === 0 ? (
        <p className={shell.emptyNote}>No open observation needs for this site yet.</p>
      ) : (
        <div className={shell.carousel} aria-label="Open observation needs">
          {views.map(({ objective, run, evaluation }) => {
            const isSelected = selectedId === objective.id;
            return (
              <div
                key={objective.id}
                role="button"
                tabIndex={0}
                aria-label={`Open observation need: ${objective.title}`}
                className={`${shell.objCard} ${isSelected ? shell.objCardActive : ''}`}
                onClick={() => onLaunch(objective.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLaunch(objective.id);
                  }
                }}
              >
                <span className={shell.objCardTop}>
                  <span
                    className={shell.objCardDot}
                    style={{ background: OBSERVE_MODULE_DOT[objective.module] }}
                  />
                  <span className={shell.objCardModule}>
                    {OBSERVE_MODULE_LABEL[objective.module]}
                  </span>
                  <span
                    className={`${shell.objStatus} ${css[`status_${run.status.replace(/-/g, '_')}`] ?? ''}`}
                  >
                    {STATUS_LABEL[run.status]}
                  </span>
                  {objective.origin === 'auto' && (
                    <button
                      type="button"
                      className={css.cardDismiss}
                      aria-label="Dismiss need"
                      title="Dismiss need"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRemoveId(null);
                        setConfirmDismissId(objective.id);
                      }}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  )}
                </span>

                <span className={shell.objCardTitle}>{objective.title}</span>

                {objective.reason && (
                  <span className={shell.objCardDesc}>{objective.reason}</span>
                )}

                <span className={shell.objCardMeta}>
                  <span
                    className={`${shell.objOrigin} ${css[`origin_${objective.origin.replace(/-/g, '_')}`] ?? ''}`}
                  >
                    {ORIGIN_LABEL[objective.origin]}
                  </span>
                  <span className={shell.objMetaItem}>
                    <MapPin size={13} strokeWidth={2} />
                    {objective.target.center[1].toFixed(4)},{' '}
                    {objective.target.center[0].toFixed(4)}
                  </span>
                  {objective.trigger && (
                    <span className={shell.objMetaItem}>
                      <RefreshCw size={13} strokeWidth={2} /> {objective.trigger}
                    </span>
                  )}
                  <span
                    className={`${css.objPriority} ${css[`prio_${objective.priority}`] ?? ''}`}
                  >
                    {PRIORITY_LABEL[objective.priority]}
                  </span>
                </span>

                <span className={css.objProgressTrack}>
                  <span
                    className={css.objProgressFill}
                    style={{ width: `${evaluation.pct}%` }}
                  />
                </span>

                {(isEditable(objective.origin) ||
                  (objective.origin === 'auto' &&
                    confirmDismissId === objective.id)) && (
                  <span className={css.objCardActions}>
                    {objective.origin === 'auto' &&
                      confirmDismissId === objective.id && (
                        <>
                          <span className={css.confirmPrompt}>Dismiss?</span>
                          <button
                            type="button"
                            className={css.removeConfirmBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNeed(objective.id);
                            }}
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            className={css.dismissBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDismissId(null);
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    {isEditable(objective.origin) &&
                      (confirmRemoveId === objective.id ? (
                        <>
                          <span className={css.confirmPrompt}>Remove?</span>
                          <button
                            type="button"
                            className={css.removeConfirmBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNeed(objective.id);
                            }}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className={css.dismissBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmRemoveId(null);
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={css.iconBtn}
                            aria-label="Edit need"
                            title="Edit need"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(objective.id);
                            }}
                          >
                            <Pencil size={13} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            className={css.iconBtn}
                            aria-label="Remove need"
                            title="Remove need"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmRemoveId(objective.id);
                            }}
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </>
                      ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
