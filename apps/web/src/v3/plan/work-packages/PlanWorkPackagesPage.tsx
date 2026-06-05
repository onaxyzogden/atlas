/**
 * PlanWorkPackagesPage — the Plan-side Work Packages queue (Phase 3). The
 * durable record of field work handed from accepted decisions to the Act teams:
 * each package carries an objective + detail + team-type + location + tools +
 * evidence-required + completion-criteria + a status. Packages arrive two ways:
 * generated from an accepted `create-act-task` decision ("Generate work
 * package →") or authored from scratch here.
 *
 * Scope (Phase 3): operational scheduling only. The Plan page authors a draft
 * and dispatches it (draft → queued); once dispatched it is monitor-only here —
 * the Act side advances status (queued → in-progress → done). Shelled child
 * route (renders inside the project shell with the sidebar, like
 * `/plan/decisions`).
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { usePlanWorkPackages } from './usePlanWorkPackages.js';
import { usePlanWorkPackageStore } from '../../../store/planWorkPackageStore.js';
import {
  ACT_MODULE_LABEL,
  ACT_MODULES,
  emptyPlanWorkPackage,
  PLAN_WORK_PACKAGE_STATUSES,
  PLAN_WORK_PACKAGE_STATUS_LABEL,
  type ActModule,
  type PlanWorkPackage,
} from './planWorkPackage.js';
import css from './PlanWorkPackagesPage.module.css';

function formatStamp(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface PackageCardProps {
  projectId: string;
  pkg: PlanWorkPackage;
}

function DecisionLink({ projectId, pkg }: PackageCardProps) {
  if (!pkg.decisionId) return null;
  return (
    <Link
      to="/v3/project/$projectId/plan/decisions"
      params={{ projectId }}
      className={css.sourceChip}
      title="View the source decision"
    >
      From decision →
    </Link>
  );
}

function DraftCard({ projectId, pkg }: PackageCardProps) {
  const update = usePlanWorkPackageStore((s) => s.update);
  const setStatus = usePlanWorkPackageStore((s) => s.setStatus);
  const remove = usePlanWorkPackageStore((s) => s.remove);

  return (
    <li className={css.card} data-status="draft">
      <input
        className={css.headline}
        placeholder="Objective (e.g. Dig a swale above the eroded bank)"
        value={pkg.objective}
        onChange={(e) =>
          update(projectId, pkg.id, { objective: e.target.value })
        }
      />

      <label className={css.field}>
        <span className={css.fieldLabel}>Team type</span>
        <select
          className={css.select}
          value={pkg.teamType}
          onChange={(e) =>
            update(projectId, pkg.id, { teamType: e.target.value as ActModule })
          }
        >
          {ACT_MODULES.map((m) => (
            <option key={m} value={m}>
              {ACT_MODULE_LABEL[m]}
            </option>
          ))}
        </select>
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Detail</span>
        <textarea
          className={css.textarea}
          placeholder="What the team is doing and why."
          value={pkg.detail}
          onChange={(e) =>
            update(projectId, pkg.id, { detail: e.target.value })
          }
          rows={2}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Location</span>
        <textarea
          className={css.textarea}
          placeholder="Where on the land this happens."
          value={pkg.location}
          onChange={(e) =>
            update(projectId, pkg.id, { location: e.target.value })
          }
          rows={1}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Tools / materials</span>
        <textarea
          className={css.textarea}
          placeholder="What the team needs on hand."
          value={pkg.tools}
          onChange={(e) =>
            update(projectId, pkg.id, { tools: e.target.value })
          }
          rows={1}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Evidence required</span>
        <textarea
          className={css.textarea}
          placeholder="What the team must capture to close this out."
          value={pkg.evidenceRequired}
          onChange={(e) =>
            update(projectId, pkg.id, { evidenceRequired: e.target.value })
          }
          rows={1}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Completion criteria</span>
        <textarea
          className={css.textarea}
          placeholder="What 'done' means for this package."
          value={pkg.completionCriteria}
          onChange={(e) =>
            update(projectId, pkg.id, { completionCriteria: e.target.value })
          }
          rows={1}
        />
      </label>

      <DecisionLink projectId={projectId} pkg={pkg} />

      <div className={css.actions}>
        <button
          type="button"
          className={css.acceptBtn}
          onClick={() => setStatus(projectId, pkg.id, 'queued')}
        >
          Dispatch to Act →
        </button>
        <button
          type="button"
          className={css.deleteBtn}
          onClick={() => remove(projectId, pkg.id)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function RecordedCard({ projectId, pkg }: PackageCardProps) {
  const dispatchedAt = formatStamp(pkg.dispatchedAt);
  const completedAt = formatStamp(pkg.completedAt);

  return (
    <li
      className={css.card}
      data-status={pkg.status}
      id={`work-package-${pkg.id}`}
    >
      <div className={css.cardHead}>
        <span className={css.verbTag}>{ACT_MODULE_LABEL[pkg.teamType]}</span>
        <span className={css.statusBadge} data-status={pkg.status}>
          {PLAN_WORK_PACKAGE_STATUS_LABEL[pkg.status]}
        </span>
      </div>

      <h3 className={css.cardTitle}>
        {pkg.objective.trim() || 'Untitled work package'}
      </h3>

      {pkg.detail.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Detail</span>
          {pkg.detail}
        </p>
      ) : null}
      {pkg.location.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Location</span>
          {pkg.location}
        </p>
      ) : null}
      {pkg.tools.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Tools / materials</span>
          {pkg.tools}
        </p>
      ) : null}
      {pkg.evidenceRequired.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Evidence required</span>
          {pkg.evidenceRequired}
        </p>
      ) : null}
      {pkg.completionCriteria.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Completion criteria</span>
          {pkg.completionCriteria}
        </p>
      ) : null}

      <DecisionLink projectId={projectId} pkg={pkg} />

      <div className={css.cardFoot}>
        <span className={css.stamp}>
          {completedAt
            ? `Completed ${completedAt}`
            : dispatchedAt
              ? `Dispatched ${dispatchedAt}`
              : ''}
        </span>
      </div>
    </li>
  );
}

export default function PlanWorkPackagesPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const packages = usePlanWorkPackages(projectId);
  const create = usePlanWorkPackageStore((s) => s.create);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(`work-package-${scrollTo}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setScrollTo(null);
  }, [scrollTo, packages]);

  const handleNew = () => {
    const draft = emptyPlanWorkPackage(projectId);
    create(projectId, draft);
    setScrollTo(draft.id);
  };

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div className={css.headerText}>
          <span className={css.eyebrow}>Plan</span>
          <h1 className={css.title}>Work Packages</h1>
          <p className={css.lede}>
            Field work handed from accepted decisions to the Act teams.
          </p>
        </div>
        <button type="button" className={css.newBtn} onClick={handleNew}>
          New work package
        </button>
      </header>

      {packages.length === 0 ? (
        <p className={css.empty}>
          No work packages yet — generate one from an accepted Decision Log
          decision.
        </p>
      ) : (
        PLAN_WORK_PACKAGE_STATUSES.map((status) => {
          const group = packages.filter((p) => p.status === status);
          if (group.length === 0) return null;
          return (
            <section key={status} className={css.section} data-status={status}>
              <h2 className={css.sectionTitle}>
                {PLAN_WORK_PACKAGE_STATUS_LABEL[status]}{' '}
                <span className={css.count}>{group.length}</span>
              </h2>
              <ul className={css.cardList}>
                {group.map((pkg) =>
                  pkg.status === 'draft' ? (
                    <DraftCard key={pkg.id} projectId={projectId} pkg={pkg} />
                  ) : (
                    <RecordedCard
                      key={pkg.id}
                      projectId={projectId}
                      pkg={pkg}
                    />
                  ),
                )}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
