/**
 * §24 PunchListCard — derived punch-list / site-verification checklist.
 *
 * Walks every placed entity (structure, utility, crop area, paddock,
 * land zone) for the current project and emits a verification row per
 * entity. The steward marks each row pending / verified / issue and can
 * jot a free-text note (e.g. "tank 2 ft below planned elevation, fine"
 * or "barn moved 8 ft west due to bedrock"). State persists in
 * localStorage keyed on project id and survives reloads + cross-tab
 * via the storage event.
 *
 * No AI — the *rows* derive deterministically from the placed-entity
 * set; the *verification state* is fully steward-authored. Designed for
 * a tablet on-site: large tap targets, three-state toggle, optional
 * note. Reset clears all verification state for the project.
 *
 * Closes manifest §24 `punch-list-site-verification` (P4) planned -> done.
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import css from './PunchListCard.module.css';

interface Props {
  project: LocalProject;
}

type PunchStatus = 'pending' | 'verified' | 'issue';
type GroupId = 'structures' | 'utilities' | 'crops' | 'paddocks' | 'zones';

interface PunchRow {
  rowKey: string;
  group: GroupId;
  groupLabel: string;
  entityId: string;
  label: string;
  meta: string;
}

interface PunchEntry {
  status: PunchStatus;
  note: string;
  updatedAt: string;
}

type PunchState = Record<string, PunchEntry>;

const GROUP_ORDER: GroupId[] = ['structures', 'utilities', 'crops', 'paddocks', 'zones'];

const GROUP_LABEL: Record<GroupId, string> = {
  structures: 'Structures',
  utilities: 'Utilities',
  crops: 'Crops & agroforestry',
  paddocks: 'Paddocks',
  zones: 'Land zones',
};

const STATUS_LABEL: Record<PunchStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  issue: 'Issue',
};

const storageKey = (projectId: string) => `ogden-punchlist-${projectId}`;

function readState(projectId: string): PunchState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PunchState;
    }
    return {};
  } catch {
    return {};
  }
}

function writeState(projectId: string, state: PunchState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors
  }
}

function humanizeType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PunchListCard({ project }: Props) {
  const structures = useStructureStore((s) =>
    s.structures.filter((st) => st.projectId === project.id),
  );
  const utilities = useUtilityStore((s) =>
    s.utilities.filter((u) => u.projectId === project.id),
  );
  const cropAreas = useCropStore((s) =>
    s.cropAreas.filter((c) => c.projectId === project.id),
  );
  const paddocks = useLivestockStore((s) =>
    s.paddocks.filter((p) => p.projectId === project.id),
  );
  const zones = useZoneStore((s) =>
    s.zones.filter((z) => z.projectId === project.id),
  );

  const [state, setState] = useState<PunchState>(() => readState(project.id));
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<GroupId>>(() => new Set());

  // Reload when project changes
  useEffect(() => {
    setState(readState(project.id));
    setOpenId(null);
  }, [project.id]);

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== storageKey(project.id)) return;
      setState(readState(project.id));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [project.id]);

  const rows = useMemo<PunchRow[]>(() => {
    const out: PunchRow[] = [];
    structures.forEach((s) => {
      out.push({
        rowKey: `structures:${s.id}`,
        group: 'structures',
        groupLabel: GROUP_LABEL.structures,
        entityId: s.id,
        label: s.name || humanizeType(String(s.type ?? 'structure')),
        meta: humanizeType(String(s.type ?? '')),
      });
    });
    utilities.forEach((u) => {
      out.push({
        rowKey: `utilities:${u.id}`,
        group: 'utilities',
        groupLabel: GROUP_LABEL.utilities,
        entityId: u.id,
        label: u.name || humanizeType(String(u.type ?? 'utility')),
        meta: humanizeType(String(u.type ?? '')),
      });
    });
    cropAreas.forEach((c) => {
      const acres = c.areaM2 ? (c.areaM2 / 4046.86).toFixed(2) : null;
      out.push({
        rowKey: `crops:${c.id}`,
        group: 'crops',
        groupLabel: GROUP_LABEL.crops,
        entityId: c.id,
        label: c.name || humanizeType(String(c.type ?? 'crop area')),
        meta: `${humanizeType(String(c.type ?? ''))}${acres ? ` \u00B7 ${acres} ac` : ''}`,
      });
    });
    paddocks.forEach((p) => {
      const acres = p.areaM2 ? (p.areaM2 / 4046.86).toFixed(2) : null;
      const species = (p.species ?? []).slice(0, 2).map(humanizeType).join(', ');
      out.push({
        rowKey: `paddocks:${p.id}`,
        group: 'paddocks',
        groupLabel: GROUP_LABEL.paddocks,
        entityId: p.id,
        label: p.name || 'Paddock',
        meta: `${species || 'Unassigned'}${acres ? ` \u00B7 ${acres} ac` : ''}`,
      });
    });
    zones.forEach((z) => {
      const acres = z.areaM2 ? (z.areaM2 / 4046.86).toFixed(2) : null;
      out.push({
        rowKey: `zones:${z.id}`,
        group: 'zones',
        groupLabel: GROUP_LABEL.zones,
        entityId: z.id,
        label: z.name || humanizeType(String(z.category ?? 'zone')),
        meta: `${humanizeType(String(z.category ?? ''))}${acres ? ` \u00B7 ${acres} ac` : ''}`,
      });
    });
    return out;
  }, [structures, utilities, cropAreas, paddocks, zones]);

  const summary = useMemo(() => {
    let verified = 0;
    let issue = 0;
    let pending = 0;
    rows.forEach((r) => {
      const entry = state[r.rowKey];
      if (entry?.status === 'verified') verified += 1;
      else if (entry?.status === 'issue') issue += 1;
      else pending += 1;
    });
    return { total: rows.length, verified, issue, pending };
  }, [rows, state]);

  const setStatus = (rowKey: string, next: PunchStatus | null) => {
    setState((prev) => {
      const draft = { ...prev };
      if (next === null) {
        delete draft[rowKey];
      } else {
        const existing = draft[rowKey] ?? { status: 'pending', note: '', updatedAt: '' };
        draft[rowKey] = {
          ...existing,
          status: next,
          updatedAt: new Date().toISOString(),
        };
      }
      writeState(project.id, draft);
      return draft;
    });
  };

  const setNote = (rowKey: string, note: string) => {
    setState((prev) => {
      const draft = { ...prev };
      const existing = draft[rowKey] ?? { status: 'pending' as PunchStatus, note: '', updatedAt: '' };
      draft[rowKey] = {
        ...existing,
        note,
        updatedAt: new Date().toISOString(),
      };
      writeState(project.id, draft);
      return draft;
    });
  };

  const handleReset = () => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm(
      `Reset punch-list verification state for "${project.name ?? 'this project'}"? This clears every check, issue, and note.`,
    );
    if (!ok) return;
    setState({});
    writeState(project.id, {});
  };

  const toggleGroup = (g: GroupId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <section className={css.card} aria-label="Site verification punch-list">
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Site verification punch-list</h3>
            <p className={css.cardHint}>
              Once you place structures, utilities, crops, paddocks, or zones on
              the map, they appear here as a per-item field-verification
              checklist. Designed for a tablet on-site &mdash; tap a row to mark{' '}
              <em>verified</em> against the design, flag an <em>issue</em>, and
              jot a note.
            </p>
          </div>
        </header>
        <div className={css.emptyState}>
          No placed entities yet. Punch-list rows appear once the design has
          something to verify.
        </div>
      </section>
    );
  }

  return (
    <section className={css.card} aria-label="Site verification punch-list">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Site verification punch-list</h3>
          <p className={css.cardHint}>
            One row per placed entity. Tap <em>verified</em> when you confirm
            the as-built matches the design, <em>issue</em> when it doesn&apos;t,
            and add a note. State is local to this browser and survives
            reloads. Designed for tablet field use.
          </p>
        </div>
      </header>

      <div className={css.summaryRow}>
        <div className={css.summaryBlock}>
          <span className={css.summaryValue}>
            {summary.verified}
            <span className={css.summaryDenom}>/{summary.total}</span>
          </span>
          <span className={css.summaryLabel}>Verified</span>
        </div>
        <div className={css.summaryBlock}>
          <span className={`${css.summaryValue} ${summary.issue > 0 ? css.toneIssue : ''}`}>
            {summary.issue}
          </span>
          <span className={css.summaryLabel}>Issues</span>
        </div>
        <div className={css.summaryBlock}>
          <span className={css.summaryValue}>{summary.pending}</span>
          <span className={css.summaryLabel}>Pending</span>
        </div>
        <button
          type="button"
          className={css.resetBtn}
          onClick={handleReset}
          disabled={summary.verified + summary.issue === 0}
        >
          Reset
        </button>
      </div>

      {GROUP_ORDER.map((g) => {
        const groupRows = rows.filter((r) => r.group === g);
        if (groupRows.length === 0) return null;
        const isCollapsed = collapsed.has(g);
        const groupVerified = groupRows.filter(
          (r) => state[r.rowKey]?.status === 'verified',
        ).length;
        const groupIssue = groupRows.filter(
          (r) => state[r.rowKey]?.status === 'issue',
        ).length;
        return (
          <div key={g} className={`${css.groupBlock} ${css[`group_${g}`] ?? ''}`}>
            <button
              type="button"
              className={css.groupHead}
              onClick={() => toggleGroup(g)}
              aria-expanded={!isCollapsed}
            >
              <span className={css.groupLabel}>{GROUP_LABEL[g]}</span>
              <span className={css.groupCount}>
                {groupVerified}/{groupRows.length} verified
                {groupIssue > 0 && (
                  <span className={css.groupIssue}> &middot; {groupIssue} issue{groupIssue === 1 ? '' : 's'}</span>
                )}
              </span>
              <span className={css.groupToggle}>{isCollapsed ? '+' : '\u2212'}</span>
            </button>
            {!isCollapsed && (
              <ul className={css.list}>
                {groupRows.map((r) => {
                  const entry = state[r.rowKey];
                  const status: PunchStatus = entry?.status ?? 'pending';
                  const isOpen = openId === r.rowKey;
                  return (
                    <li
                      key={r.rowKey}
                      className={`${css.row} ${css[`row_${status}`] ?? ''} ${
                        isOpen ? css.rowOpen : ''
                      }`}
                    >
                      <div className={css.rowHead}>
                        <button
                          type="button"
                          className={css.rowToggleArea}
                          onClick={() => setOpenId(isOpen ? null : r.rowKey)}
                          aria-expanded={isOpen}
                        >
                          <span className={css.rowLabel}>{r.label}</span>
                          <span className={css.rowMeta}>{r.meta}</span>
                          <span className={`${css.rowStatusTag} ${css[`statusTag_${status}`] ?? ''}`}>
                            {STATUS_LABEL[status]}
                          </span>
                          <span className={css.rowToggle}>{isOpen ? '\u2212' : '+'}</span>
                        </button>
                      </div>
                      {isOpen && (
                        <div className={css.rowBody}>
                          <div className={css.statusRow}>
                            {(['pending', 'verified', 'issue'] as PunchStatus[]).map((s) => (
                              <button
                                key={s}
                                type="button"
                                className={`${css.statusBtn} ${
                                  status === s ? css[`statusActive_${s}`] ?? '' : ''
                                }`}
                                onClick={() => setStatus(r.rowKey, s === status ? null : s)}
                              >
                                {STATUS_LABEL[s]}
                              </button>
                            ))}
                          </div>
                          <textarea
                            className={css.note}
                            placeholder="Field note (optional) — e.g. tank installed 2 ft below planned elevation, fine."
                            value={entry?.note ?? ''}
                            onChange={(e) => setNote(r.rowKey, e.target.value)}
                            rows={2}
                          />
                          {entry?.updatedAt && (
                            <span className={css.timestamp}>
                              Updated {new Date(entry.updatedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      <p className={css.footnote}>
        <em>How this works:</em> rows are derived from current placements in
        the structure / utility / crop / paddock / zone stores filtered by
        project id. Verification state, issue flags, and notes are stored in
        <code> localStorage[&quot;ogden-punchlist-{project.id}&quot;]</code>
        {' '}&mdash; local to this browser, survives reloads, syncs across
        tabs. No server round-trip; nothing leaves the device.
      </p>
    </section>
  );
}
