/**
 * LivestockMoveCard — ACT-stage Livestock module: unified move-event log.
 *
 * Records actual livestock moves across two source kinds:
 *   - paddock: moves logged against a Plan-stage `Paddock` polygon
 *   - structure: moves logged from `ActStructurePopover.actions.startLivestockMoveLog`
 *     (placed barn / animal_shelter)
 *
 * Mirrors `MaintenanceLogCard`'s mixed-source-kind shape: one card, one
 * filter, one form with a kind-selector, two label resolvers. Pairs
 * with `RotationScheduleCard` (the *plan* for rotation) — this card is
 * the *record* of what was actually moved, when, by whom.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useLivestockMoveLogStore,
  DIRECTION_OPTIONS,
  SPECIES_OPTIONS,
  destPaddockId,
  destStructureId,
  buildRotatePair,
  linkedPartner,
  type LivestockMoveEvent,
  type LivestockMoveDirection,
} from '../../store/livestockMoveLogStore.js';
import {
  useLivestockStore,
  type LivestockSpecies,
} from '../../store/livestockStore.js';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import { getActionsForType } from '../../v3/act/data/structureActions.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

type SourceKind = 'paddock' | 'structure';

interface Draft {
  /** Destination kind — required. */
  toKind: SourceKind;
  /** Destination id — required. */
  toId: string;
  /** Origin kind — optional ('' = unset, meaning no recorded origin). */
  fromKind: SourceKind | '';
  /** Origin id — required when fromKind is set. */
  fromId: string;
  date: string;
  direction: LivestockMoveDirection;
  species: LivestockSpecies;
  headCount: string;
  who: string;
  notes: string;
  /** Optional override exit date for `rotate_through`. Empty → both legs share `date`. */
  exitDate: string;
}
function emptyDraft(): Draft {
  return {
    toKind: 'paddock',
    toId: '',
    fromKind: '',
    fromId: '',
    date: new Date().toISOString().slice(0, 10),
    direction: 'move_in',
    species: 'sheep',
    headCount: '',
    who: '',
    notes: '',
    exitDate: '',
  };
}

function newId() { return `lvm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function directionLabel(d: LivestockMoveDirection): string {
  return DIRECTION_OPTIONS.find((x) => x.value === d)?.label ?? d;
}

function speciesLabel(s: LivestockSpecies): string {
  return SPECIES_OPTIONS.find((x) => x.value === s)?.label ?? s;
}

export default function LivestockMoveCard({ project }: Props) {
  const allEvents = useLivestockMoveLogStore((s) => s.events);
  const addEvent = useLivestockMoveLogStore((s) => s.addEvent);
  const removeEvent = useLivestockMoveLogStore((s) => s.removeEvent);

  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allStructures = useAllStructures();

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );
  const structures = useMemo(
    () =>
      allStructures.filter(
        (s) => s.projectId === project.id && getActionsForType(s.type).includes('livestockMove'),
      ),
    [allStructures, project.id],
  );

  const sourceLabel = (kind: SourceKind, id: string): string => {
    if (kind === 'structure') {
      const s = structures.find((x) => x.id === id);
      if (!s) return '(deleted structure)';
      const tpl = STRUCTURE_TEMPLATES[s.type];
      return `${tpl.icon} ${s.name || tpl.label}`;
    }
    const p = paddocks.find((x) => x.id === id);
    return p ? p.name : '(deleted paddock)';
  };

  const events = useMemo(
    () =>
      allEvents
        .filter((e) => e.projectId === project.id)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allEvents, project.id],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, LivestockMoveEvent[]>();
    events.forEach((e) => {
      const sid = destStructureId(e);
      const pid = destPaddockId(e);
      const kind: SourceKind = sid ? 'structure' : 'paddock';
      const id = sid ?? pid ?? '';
      const key = `${kind}::${id}`;
      const list = m.get(key) ?? [];
      list.push(e);
      m.set(key, list);
    });
    return Array.from(m.entries());
  }, [events]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  // Linked-pair hover grouping: hovering one leg of a rotate pair lights up
  //  both legs in the moves table. Holds the partner id of the row hovered.
  const [hoveredLinkedId, setHoveredLinkedId] = useState<string | null>(null);

  function optionsForKind(kind: SourceKind) {
    return kind === 'paddock'
      ? paddocks.map((p) => ({ id: p.id, label: p.name }))
      : structures.map((s) => {
          const tpl = STRUCTURE_TEMPLATES[s.type];
          return { id: s.id, label: `${tpl.icon} ${s.name || tpl.label}` };
        });
  }
  const toOptions = optionsForKind(draft.toKind);
  const fromOptions = draft.fromKind === '' ? [] : optionsForKind(draft.fromKind);

  // Show From column on a group when any event in it has a recorded origin.
  function groupHasFrom(list: LivestockMoveEvent[]): boolean {
    return list.some((e) => e.fromPaddockId || e.fromStructureId);
  }
  function fromLabel(e: LivestockMoveEvent): string {
    if (e.fromStructureId) {
      const s = structures.find((x) => x.id === e.fromStructureId);
      if (!s) return '(deleted structure)';
      const tpl = STRUCTURE_TEMPLATES[s.type];
      return `${tpl.icon} ${s.name || tpl.label}`;
    }
    if (e.fromPaddockId) {
      const p = paddocks.find((x) => x.id === e.fromPaddockId);
      return p ? p.name : '(deleted paddock)';
    }
    return '';
  }

  function commit() {
    if (!draft.toId) return;
    if (draft.fromKind !== '' && !draft.fromId) return; // partial origin — block
    const rawHead = draft.headCount.trim();
    const headCount = rawHead !== '' && Number.isFinite(Number(rawHead)) ? Number(rawHead) : null;
    const who = draft.who.trim() || undefined;
    const notes = draft.notes.trim() || undefined;

    if (draft.direction === 'rotate_through') {
      // Split into a linked exit/entry pair. The legs share date/species/head
      //  unless the operator filled the optional `exitDate` override.
      const exitDateRaw = draft.exitDate.trim();
      const [exitLeg, entryLeg] = buildRotatePair({
        projectId: project.id,
        entryDate: draft.date,
        exitDate: exitDateRaw || undefined,
        species: draft.species,
        headCount,
        from: {
          paddockId: draft.fromKind === 'paddock' ? draft.fromId : undefined,
          structureId: draft.fromKind === 'structure' ? draft.fromId : undefined,
        },
        to: {
          paddockId: draft.toKind === 'paddock' ? draft.toId : undefined,
          structureId: draft.toKind === 'structure' ? draft.toId : undefined,
        },
        who,
        notes,
      });
      addEvent(exitLeg);
      addEvent(entryLeg);
      setDraft(emptyDraft());
      return;
    }

    const event: LivestockMoveEvent = {
      id: newId(),
      projectId: project.id,
      date: draft.date,
      direction: draft.direction,
      species: draft.species,
      headCount,
      who,
      notes,
      ...(draft.toKind === 'structure'
        ? { toStructureId: draft.toId }
        : { toPaddockId: draft.toId }),
      ...(draft.fromKind === 'structure'
        ? { fromStructureId: draft.fromId }
        : draft.fromKind === 'paddock'
          ? { fromPaddockId: draft.fromId }
          : {}),
    };
    addEvent(event);
    setDraft(emptyDraft());
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Livestock — Move log</span>
        <h1 className={styles.title}>Livestock Moves</h1>
        <p className={styles.lede}>
          What was actually moved, when, and where. Pairs with the
          Rotation schedule (the plan) to close the loop:
          schedule says &ldquo;sheep into north paddock week 3&rdquo;,
          this log records &ldquo;24 sheep moved in 2026-05-08.&rdquo;
          Structure-anchored moves (into a barn or animal shelter)
          surface here alongside paddock moves.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Log move</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>To · kind</label>
            <select
              value={draft.toKind}
              onChange={(e) => setDraft({ ...draft, toKind: e.target.value as SourceKind, toId: '' })}
            >
              <option value="paddock">Paddock</option>
              <option value="structure">Structure (barn / animal shelter)</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>To · feature</label>
            <select value={draft.toId} onChange={(e) => setDraft({ ...draft, toId: e.target.value })}>
              <option value="">— select —</option>
              {toOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {toOptions.length === 0 && draft.toKind === 'structure' ? (
              <p className={styles.hint}>No barn or animal shelter placed — add one in Plan stage to log a structure-anchored move.</p>
            ) : null}
            {toOptions.length === 0 && draft.toKind === 'paddock' ? (
              <p className={styles.hint}>No paddocks drawn — add one in Plan stage to log a paddock move.</p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label>From · kind <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <select
              value={draft.fromKind}
              onChange={(e) => setDraft({ ...draft, fromKind: e.target.value as SourceKind | '', fromId: '' })}
            >
              <option value="">— none (first entry / unrecorded) —</option>
              <option value="paddock">Paddock</option>
              <option value="structure">Structure (barn / animal shelter)</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>From · feature</label>
            <select
              value={draft.fromId}
              disabled={draft.fromKind === ''}
              onChange={(e) => setDraft({ ...draft, fromId: e.target.value })}
            >
              <option value="">{draft.fromKind === '' ? '— (none) —' : '— select —'}</option>
              {fromOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Date</label>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Direction</label>
            <select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as LivestockMoveDirection })}>
              {DIRECTION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          {draft.direction === 'rotate_through' ? (
            <div className={styles.field}>
              <label>Exit date <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input
                type="date"
                value={draft.exitDate}
                onChange={(e) => setDraft({ ...draft, exitDate: e.target.value })}
                placeholder="defaults to date"
              />
              <p className={styles.hint}>Leave empty for a same-day rotation. Set to record the herd exiting the origin earlier than they arrived at the destination.</p>
            </div>
          ) : null}
          <div className={styles.field}>
            <label>Species</label>
            <select value={draft.species} onChange={(e) => setDraft({ ...draft, species: e.target.value as LivestockSpecies })}>
              {SPECIES_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Head</label>
            <input type="number" value={draft.headCount} onChange={(e) => setDraft({ ...draft, headCount: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Who</label>
            <input type="text" value={draft.who} onChange={(e) => setDraft({ ...draft, who: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Notes</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button
            type="button"
            className={styles.btn}
            onClick={commit}
            disabled={!draft.toId || (draft.fromKind !== '' && !draft.fromId)}
          >
            Add move
          </button>
        </div>
      </section>

      {grouped.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No livestock moves logged yet — log your first above, or click a placed barn / animal shelter on the map and choose &ldquo;Log livestock move&rdquo;.</p>
        </section>
      ) : (
        grouped.map(([key, list]) => {
          const [kind, id] = key.split('::') as [SourceKind, string];
          const totalHead = list.reduce((acc, e) => acc + (e.headCount ?? 0), 0);
          const lastDate = list.reduce((acc, e) => (e.date > acc ? e.date : acc), list[0]?.date ?? '');
          const showFrom = groupHasFrom(list);
          return (
            <section key={key} className={styles.section}>
              <h2 className={styles.sectionTitle}>{sourceLabel(kind, id)} ({list.length})</h2>
              <div className={styles.statRow}>
                <span>Total head moved</span>
                <span>{totalHead > 0 ? totalHead : '—'}</span>
              </div>
              <div className={styles.statRow}>
                <span>Last move</span>
                <span>{lastDate || '—'}</span>
              </div>
              <table className={styles.table} style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Direction</th>
                    {showFrom ? <th>From</th> : null}
                    <th>Species</th>
                    <th className={styles.num}>Head</th>
                    <th>Who</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => {
                    const partner = e.linkedEventId ? linkedPartner(events, e) : undefined;
                    const partnerTitle = e.linkedEventId
                      ? partner
                        ? `Linked rotation — partner ${partner.direction === 'move_out' ? 'exited' : 'entered'} on ${partner.date}`
                        : 'Linked rotation — partner event no longer present'
                      : '';
                    const linkedHi =
                      e.linkedEventId != null &&
                      hoveredLinkedId != null &&
                      (hoveredLinkedId === e.id || hoveredLinkedId === e.linkedEventId);
                    return (
                    <tr
                      key={e.id}
                      className={linkedHi ? styles.linkedPairHighlight : undefined}
                      onMouseEnter={
                        e.linkedEventId
                          ? () => setHoveredLinkedId(e.linkedEventId ?? null)
                          : undefined
                      }
                      onMouseLeave={
                        e.linkedEventId ? () => setHoveredLinkedId(null) : undefined
                      }
                    >
                      <td>{e.date}</td>
                      <td>
                        {e.linkedEventId ? (
                          <span
                            aria-label="Linked rotation"
                            title={partnerTitle}
                            style={{ marginRight: 6 }}
                          >
                            {'\u{1F517}'}
                          </span>
                        ) : null}
                        {directionLabel(e.direction)}
                      </td>
                      {showFrom ? <td>{fromLabel(e) || '—'}</td> : null}
                      <td>{speciesLabel(e.species)}</td>
                      <td className={styles.num}>{e.headCount ?? '—'}</td>
                      <td>{e.who ?? ''}</td>
                      <td>{e.notes ?? ''}</td>
                      <td><button type="button" className={styles.removeBtn} onClick={() => removeEvent(e.id)}>Remove</button></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}
