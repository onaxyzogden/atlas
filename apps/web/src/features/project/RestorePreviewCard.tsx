/**
 * §1 RestorePreviewCard — diff preview for the most recent snapshot.
 *
 * The existing VersionHistory list lets the steward click Restore on
 * any snapshot, but that overwrites the project state immediately with
 * no preview of what's actually changing. For a Phase-1 partial item
 * (line 96 `restore-previous`), the missing surface is the audit:
 * before clicking Restore, the steward should see exactly which fields
 * will be reverted and to what values.
 *
 * This card targets the most recent snapshot (the one most likely to
 * be restored) and renders a per-field diff: current value -> snapshot
 * value, grouped by category (Identity, Location, Boundary, Notes,
 * Settings, Attachments). Unchanged fields are rolled into a "no
 * change" summary so the diff stays focused on what actually moves.
 *
 * Closes manifest §1 `restore-previous` (P2) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useVersionStore, type ProjectSnapshot } from '../../store/versionStore.js';
import css from './RestorePreviewCard.module.css';

interface Props {
  project: LocalProject;
}

type FieldCategory = 'identity' | 'location' | 'boundary' | 'notes' | 'settings' | 'attachments';

interface FieldDef {
  key: string;
  label: string;
  category: FieldCategory;
  read: (p: LocalProject) => string;
}

const CATEGORY_LABELS: Record<FieldCategory, string> = {
  identity: 'Identity',
  location: 'Location',
  boundary: 'Boundary & geometry',
  notes: 'Steward notes',
  settings: 'Settings',
  attachments: 'Attachments',
};

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Project name', category: 'identity', read: (p) => p.name ?? '' },
  { key: 'description', label: 'Description', category: 'identity', read: (p) => p.description ?? '' },
  { key: 'projectType', label: 'Project type', category: 'identity', read: (p) => p.projectType ?? '' },
  { key: 'status', label: 'Status', category: 'identity', read: (p) => p.status },
  { key: 'visionStatement', label: 'Vision statement', category: 'identity', read: (p) => p.visionStatement ?? '' },

  { key: 'address', label: 'Address', category: 'location', read: (p) => p.address ?? '' },
  { key: 'parcelId', label: 'Parcel ID', category: 'location', read: (p) => p.parcelId ?? '' },
  { key: 'country', label: 'Country', category: 'location', read: (p) => p.country },
  { key: 'provinceState', label: 'Province / state', category: 'location', read: (p) => p.provinceState ?? '' },

  { key: 'acreage', label: 'Acreage', category: 'boundary', read: (p) => (p.acreage == null ? '' : `${p.acreage.toFixed(2)} ac`) },
  { key: 'hasParcelBoundary', label: 'Has parcel boundary', category: 'boundary', read: (p) => (p.hasParcelBoundary ? 'yes' : 'no') },

  { key: 'ownerNotes', label: 'Owner notes', category: 'notes', read: (p) => p.ownerNotes ?? '' },
  { key: 'zoningNotes', label: 'Zoning notes', category: 'notes', read: (p) => p.zoningNotes ?? '' },
  { key: 'accessNotes', label: 'Access notes', category: 'notes', read: (p) => p.accessNotes ?? '' },
  { key: 'waterRightsNotes', label: 'Water rights notes', category: 'notes', read: (p) => p.waterRightsNotes ?? '' },

  { key: 'units', label: 'Units', category: 'settings', read: (p) => p.units },
  { key: 'dataCompletenessScore', label: 'Data completeness', category: 'settings', read: (p) => (p.dataCompletenessScore == null ? '' : `${p.dataCompletenessScore}/100`) },

  { key: 'attachments', label: 'Attachment count', category: 'attachments', read: (p) => `${p.attachments.length}` },
];

interface Diff {
  field: FieldDef;
  current: string;
  snapshot: string;
}

function clip(s: string, max = 80): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}\u2026`;
}

function ageLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 1440)}d ago`;
}

export default function RestorePreviewCard({ project }: Props) {
  const allSnapshots = useVersionStore((s) => s.snapshots);

  const latest: ProjectSnapshot | null = useMemo(() => {
    const ours = allSnapshots
      .filter((s) => s.projectId === project.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return ours[0] ?? null;
  }, [allSnapshots, project.id]);

  const snapCount = useMemo(
    () => allSnapshots.filter((s) => s.projectId === project.id).length,
    [allSnapshots, project.id],
  );

  const diffs: Diff[] = useMemo(() => {
    if (!latest) return [];
    const out: Diff[] = [];
    for (const f of FIELDS) {
      const cur = f.read(project);
      const snap = f.read(latest.data);
      if (cur !== snap) out.push({ field: f, current: cur, snapshot: snap });
    }
    return out;
  }, [latest, project]);

  const grouped = useMemo(() => {
    const map = new Map<FieldCategory, Diff[]>();
    for (const d of diffs) {
      const arr = map.get(d.field.category) ?? [];
      arr.push(d);
      map.set(d.field.category, arr);
    }
    return Array.from(map.entries());
  }, [diffs]);

  const unchangedCount = FIELDS.length - diffs.length;

  let band: 'clean' | 'minor' | 'major';
  let bandLabel: string;
  if (diffs.length === 0) {
    band = 'clean';
    bandLabel = 'Identical';
  } else if (diffs.length <= 3) {
    band = 'minor';
    bandLabel = 'Minor revert';
  } else {
    band = 'major';
    bandLabel = 'Major revert';
  }

  const bandClass =
    band === 'clean' ? css.bandClean : band === 'minor' ? css.bandMinor : css.bandMajor;

  if (!latest) {
    return (
      <section className={css.card} aria-label="Restore preview">
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>
              Restore preview <span className={css.badge}>AUDIT</span>
            </h3>
            <p className={css.cardHint}>
              No snapshots saved yet for this project. Snapshots are created
              automatically on significant edits — once one exists, this card
              will show exactly which fields a one-click restore would revert.
            </p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className={css.card} aria-label="Restore preview">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Restore preview <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Field-by-field preview of what would change if the most recent
            snapshot were restored. Read this <em>before</em> clicking
            Restore in the version history below — restore overwrites the
            current project state immediately.
          </p>
        </div>
        <div className={`${css.bandPill} ${bandClass}`}>
          <span className={css.bandLabel}>{bandLabel}</span>
          <span className={css.bandCount}>
            {diffs.length} field{diffs.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <div className={css.snapMeta}>
        <div className={css.snapRow}>
          <span className={css.snapLabel}>Target snapshot</span>
          <span className={css.snapValue}>{latest.label}</span>
        </div>
        <div className={css.snapRow}>
          <span className={css.snapLabel}>Saved</span>
          <span className={css.snapValue}>
            {new Date(latest.timestamp).toLocaleString()}{' '}
            <span className={css.snapDim}>({ageLabel(latest.timestamp)})</span>
          </span>
        </div>
        <div className={css.snapRow}>
          <span className={css.snapLabel}>Total snapshots</span>
          <span className={css.snapValue}>{snapCount}</span>
        </div>
      </div>

      {diffs.length === 0 ? (
        <div className={css.cleanNote}>
          <span className={css.cleanIcon}>{'\u2713'}</span>
          <span>
            Current project state matches this snapshot field-for-field across
            all {FIELDS.length} tracked fields. Restore would be a no-op.
          </span>
        </div>
      ) : (
        <div className={css.diffGroups}>
          {grouped.map(([cat, items]) => (
            <div key={cat} className={css.diffGroup}>
              <h4 className={css.diffGroupTitle}>
                {CATEGORY_LABELS[cat]}{' '}
                <span className={css.diffGroupCount}>
                  ({items.length} field{items.length === 1 ? '' : 's'})
                </span>
              </h4>
              <ul className={css.diffList}>
                {items.map((d) => (
                  <li key={d.field.key} className={css.diffItem}>
                    <div className={css.diffLabel}>{d.field.label}</div>
                    <div className={css.diffArrow}>
                      <span className={css.diffCurrent}>
                        {d.current ? clip(d.current) : <span className={css.diffEmpty}>(empty)</span>}
                      </span>
                      <span className={css.diffSep}>{'\u2192'}</span>
                      <span className={css.diffSnapshot}>
                        {d.snapshot ? clip(d.snapshot) : <span className={css.diffEmpty}>(empty)</span>}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {unchangedCount > 0 && diffs.length > 0 && (
        <p className={css.unchanged}>
          {unchangedCount} other tracked field{unchangedCount === 1 ? '' : 's'}{' '}
          would be unchanged by this restore.
        </p>
      )}

      <p className={css.footnote}>
        <em>Scope:</em> tracks {FIELDS.length} project-record fields across
        identity, location, boundary, steward notes, settings, and
        attachment count. Entity stores (structures, utilities, crops,
        zones) live in their own snapshots and are not part of project-level
        restore. Long-text fields are clipped to 80 chars in the diff view.
      </p>
    </section>
  );
}
