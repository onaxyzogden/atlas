/**
 * FieldProofPanel — D4 field-execution-proof surface.
 *
 * A well-bounded CHILD of PlanExecutionTrackerCard (no manifest entry — it
 * rides the existing `act-plan-tracker` mount). Renders, per project:
 *   - a proof board: Proven / Claimed / Open badge per work item
 *     (render-only, from the pure engine);
 *   - a capture editor: explicit fulfil (who / actual dates / notes /
 *     optional photoRef) → generic proof + spine; an un-fulfil control;
 *   - render-only suggestions: each row has an explicit Confirm button that
 *     stamps the matched typed D0 event + fulfils the spine. A suggestion
 *     NEVER writes on its own.
 *
 * Covenant (D4, binding): operational field-execution proof only — no cost
 * / financing / capital / investor framing anywhere in this surface.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  analyzeFieldProof,
  type DomainEvent,
  type ProofState,
} from '@ogden/shared';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useProofEventStore } from '../../store/proofEventStore.js';
import { useMaintenanceLogStore } from '../../store/maintenanceLogStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useNurseryStore } from '../../store/nurseryStore.js';
import {
  fulfilWithGenericProof,
  confirmTypedProofMatch,
} from './fieldProofActions.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
}

const BADGE: Record<ProofState, string> = {
  proven: 'Proven',
  claimed: 'Claimed',
  open: 'Open',
};

export default function FieldProofPanel({ project }: Props) {
  const allItems = useWorkItemStore((s) => s.items);
  const proofEvents = useProofEventStore((s) => s.events);
  const maintEvents = useMaintenanceLogStore((s) => s.events);
  const moveEvents = useLivestockMoveLogStore((s) => s.events);
  const nurseryTransfers = useNurseryStore((s) => s.transfers);
  const unfulfil = useWorkItemStore((s) => s.unfulfilWorkItem);

  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    who: string;
    actualStart: string;
    actualEnd: string;
    notes: string;
    photoRef: string;
  }>({ who: '', actualStart: '', actualEnd: '', notes: '', photoRef: '' });

  const projectItems = useMemo(
    () => allItems.filter((i) => i.projectId === project.id),
    [allItems, project.id],
  );

  const linkedByItem = useMemo(() => {
    const m = new Map<string, string[]>();
    const push = (wid: string | undefined, eid: string) => {
      if (!wid) return;
      m.set(wid, [...(m.get(wid) ?? []), eid]);
    };
    for (const e of proofEvents) if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const e of maintEvents) if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const e of moveEvents) if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const t of nurseryTransfers)
      if (t.projectId === project.id) push(t.workItemId, t.id);
    return m;
  }, [proofEvents, maintEvents, moveEvents, nurseryTransfers, project.id]);

  const domainEvents = useMemo<DomainEvent[]>(() => {
    const out: DomainEvent[] = [];
    for (const e of maintEvents)
      if (e.projectId === project.id)
        out.push({ id: e.id, store: 'maintenance', projectId: e.projectId, date: e.date });
    for (const e of moveEvents)
      if (e.projectId === project.id)
        out.push({ id: e.id, store: 'livestock-move', projectId: e.projectId, date: e.date });
    for (const t of nurseryTransfers)
      if (t.projectId === project.id)
        out.push({ id: t.id, store: 'nursery', projectId: t.projectId, date: t.transferDate });
    return out;
  }, [maintEvents, moveEvents, nurseryTransfers, project.id]);

  const analysis = useMemo(
    () => analyzeFieldProof(projectItems, linkedByItem, domainEvents, 7),
    [projectItems, linkedByItem, domainEvents],
  );

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of projectItems) m.set(i.id, i.title);
    return m;
  }, [projectItems]);

  const submit = (itemId: string) => {
    fulfilWithGenericProof(itemId, project.id, {
      who: draft.who || undefined,
      actualStart: draft.actualStart || undefined,
      actualEnd: draft.actualEnd || undefined,
      notes: draft.notes || undefined,
      ...(draft.photoRef
        ? { evidence: { photoRef: draft.photoRef } }
        : {}),
    });
    setOpenEditor(null);
    setDraft({ who: '', actualStart: '', actualEnd: '', notes: '', photoRef: '' });
  };

  return (
    <section className={styles.section} data-testid="field-proof-panel">
      <h2 className={styles.sectionTitle}>Field execution &amp; proof</h2>
      <p className={styles.lede}>
        Proven = done with linked field evidence · Claimed = marked done,
        no evidence yet · Open = not yet done. Suggestions are read-only
        until you confirm.
      </p>

      <div className={styles.statRow}>
        <span>Proven {analysis.counts.proven}</span>
        <span>Claimed {analysis.counts.claimed}</span>
        <span>Open {analysis.counts.open}</span>
      </div>

      <ul className={styles.list}>
        {projectItems.map((it) => {
          const state = analysis.byItemId.get(it.id) ?? 'open';
          return (
            <li key={it.id} className={styles.listRow}>
              <span>{it.title}</span>
              <span data-proof-state={state}>{BADGE[state]}</span>
              {state === 'open' ? (
                <button type="button" onClick={() => setOpenEditor(it.id)}>
                  Record proof
                </button>
              ) : (
                <button type="button" onClick={() => unfulfil(it.id)}>
                  Un-fulfil
                </button>
              )}
              {openEditor === it.id && (
                <div className={styles.field}>
                  <input
                    aria-label="who"
                    value={draft.who}
                    onChange={(e) => setDraft({ ...draft, who: e.target.value })}
                  />
                  <input
                    aria-label="actual start"
                    type="date"
                    value={draft.actualStart}
                    onChange={(e) =>
                      setDraft({ ...draft, actualStart: e.target.value })
                    }
                  />
                  <input
                    aria-label="actual end"
                    type="date"
                    value={draft.actualEnd}
                    onChange={(e) =>
                      setDraft({ ...draft, actualEnd: e.target.value })
                    }
                  />
                  <input
                    aria-label="notes"
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                  <input
                    aria-label="photo ref"
                    value={draft.photoRef}
                    onChange={(e) =>
                      setDraft({ ...draft, photoRef: e.target.value })
                    }
                  />
                  <button type="button" onClick={() => submit(it.id)}>
                    Save proof
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {analysis.suggestions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Suggested matches</h3>
          <ul className={styles.list}>
            {analysis.suggestions.map((s) => (
              <li key={`${s.itemId}:${s.eventId}`} className={styles.listRow}>
                <span>
                  {titleById.get(s.itemId) ?? s.itemId} — {s.store} event{' '}
                  {s.daysApart}d away
                </span>
                <button
                  type="button"
                  onClick={() =>
                    confirmTypedProofMatch(s.itemId, {
                      store: s.store,
                      eventId: s.eventId,
                    })
                  }
                >
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
