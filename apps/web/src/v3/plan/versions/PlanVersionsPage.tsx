/**
 * PlanVersionsPage — capture, browse, and restore point-in-time snapshots of
 * the whole project plan (Plan-Operation Phase 5b). A version wraps a complete
 * `PlanSnapshot` (every geometry + operational store for this project) with a
 * lifecycle (draft → approved → superseded).
 *
 * Restore is destructive — it OVERWRITES this project's current plan state from
 * the snapshot, so it is gated behind an explicit confirm. Other projects are
 * never touched. This is a shelled child route (renders inside the project
 * shell with the sidebar, like `/plan/decisions`). Strictly operational — no
 * riba/gharar/CSRA/salam/financing semantics; a snapshot is opaque JSON.
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  usePlanVersions,
  type PlanVersionCounts,
} from './usePlanVersions.js';
import { usePlanVersionStore } from '../../../store/planVersionStore.js';
import {
  PLAN_VERSION_STATUSES,
  PLAN_VERSION_STATUS_LABEL,
  emptyPlanVersion,
  type PlanVersion,
  type PlanVersionStatus,
} from './planVersion.js';
import {
  capturePlanSnapshot,
  restorePlanSnapshot,
  summarizeSnapshot,
} from './planSnapshot.js';
import css from './PlanVersionsPage.module.css';

function formatStamp(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface VersionCardProps {
  projectId: string;
  version: PlanVersion;
}

function VersionCard({ projectId, version }: VersionCardProps) {
  const update = usePlanVersionStore((s) => s.update);
  const setStatus = usePlanVersionStore((s) => s.setStatus);
  const remove = usePlanVersionStore((s) => s.remove);

  const isDraft = version.status === 'draft';
  const captured = formatStamp(version.snapshot?.capturedAt);
  const approved = formatStamp(version.approvedAt);
  const { stores, features } = summarizeSnapshot(version.snapshot);

  const onRestore = () => {
    const ok = window.confirm(
      `Restore "${version.label}"?\n\nThis OVERWRITES the current plan for this ` +
        `project with the captured snapshot (${features} feature` +
        `${features === 1 ? '' : 's'} across ${stores} stores). This cannot be ` +
        `undone. Other projects are not affected.`,
    );
    if (ok) restorePlanSnapshot(projectId, version.snapshot);
  };

  return (
    <li className={css.card} data-status={version.status}>
      <div className={css.cardHead}>
        {isDraft ? (
          <input
            className={css.labelInput}
            value={version.label}
            onChange={(e) =>
              update(projectId, version.id, { label: e.target.value })
            }
            placeholder="Version label"
          />
        ) : (
          <h3 className={css.cardTitle}>{version.label}</h3>
        )}
        <span className={css.statusBadge} data-status={version.status}>
          {PLAN_VERSION_STATUS_LABEL[version.status]}
        </span>
      </div>

      {isDraft ? (
        <textarea
          className={css.noteInput}
          value={version.note}
          onChange={(e) =>
            update(projectId, version.id, { note: e.target.value })
          }
          placeholder="Note (why this snapshot)…"
          rows={2}
        />
      ) : version.note.trim() ? (
        <p className={css.noteRecorded}>{version.note}</p>
      ) : null}

      <div className={css.cardMeta}>
        {captured ? <span>Captured {captured}</span> : null}
        <span className={css.summary}>
          {features} feature{features === 1 ? '' : 's'} · {stores} stores
        </span>
        {approved ? (
          <span className={css.approvedBy}>
            Approved{version.approvedBy ? ` by ${version.approvedBy}` : ''}{' '}
            {approved}
          </span>
        ) : null}
      </div>

      <div className={css.cardActions}>
        <button type="button" className={css.restoreBtn} onClick={onRestore}>
          Restore
        </button>
        {version.status !== 'superseded' ? (
          <button
            type="button"
            className={css.secondaryBtn}
            onClick={() => setStatus(projectId, version.id, 'superseded')}
          >
            Supersede
          </button>
        ) : null}
        {isDraft ? (
          <button
            type="button"
            className={css.deleteBtn}
            onClick={() => remove(projectId, version.id)}
          >
            Delete
          </button>
        ) : null}
      </div>
    </li>
  );
}

export default function PlanVersionsPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const versions = usePlanVersions(projectId);
  const create = usePlanVersionStore((s) => s.create);
  const [label, setLabel] = useState('');

  const onCapture = () => {
    const snapshot = capturePlanSnapshot(projectId);
    create(projectId, emptyPlanVersion(projectId, snapshot, label));
    setLabel('');
  };

  const counts = versions.reduce<PlanVersionCounts>(
    (acc, v) => {
      acc[v.status] += 1;
      acc.total += 1;
      return acc;
    },
    { draft: 0, approved: 0, superseded: 0, total: 0 },
  );

  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>Plan</span>
        <h1 className={css.title}>Plan Versions</h1>
        <p className={css.lede}>Point-in-time snapshots of the whole plan.</p>
      </header>

      <div className={css.captureBar}>
        <input
          className={css.captureLabel}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label this snapshot (optional)…"
        />
        <button type="button" className={css.captureBtn} onClick={onCapture}>
          Capture current plan
        </button>
      </div>

      {versions.length === 0 ? (
        <p className={css.empty}>
          No versions yet — capture the current plan to start a history.
        </p>
      ) : (
        PLAN_VERSION_STATUSES.map((status: PlanVersionStatus) => {
          const group = versions.filter((v) => v.status === status);
          if (group.length === 0) return null;
          return (
            <section key={status} className={css.section}>
              <h2 className={css.sectionTitle}>
                {PLAN_VERSION_STATUS_LABEL[status]}{' '}
                <span className={css.count}>{counts[status]}</span>
              </h2>
              <ul className={css.cardList}>
                {group.map((version) => (
                  <VersionCard
                    key={version.id}
                    projectId={projectId}
                    version={version}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
