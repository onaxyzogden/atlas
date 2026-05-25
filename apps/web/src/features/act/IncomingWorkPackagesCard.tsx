/**
 * IncomingWorkPackagesCard — the Act-side consumer of Plan Work Packages
 * (Phase 3). The "consumed by Act" half of the Plan→Act handoff: it reads the
 * authored work packages a steward dispatched from the Decision Log and lets
 * the field team advance them — Start (queued → in-progress) and Mark done
 * (in-progress → done).
 *
 * Scope: operational scheduling only — no riba/gharar/CSRA/salam/investor/
 * financing/cost-of-capital semantics. This card reads the shared
 * `planWorkPackageStore`; it does not write to the WorkItem spine.
 */

import { Link } from '@tanstack/react-router';
import { usePlanWorkPackages } from '../../v3/plan/work-packages/usePlanWorkPackages.js';
import { usePlanWorkPackageStore } from '../../store/planWorkPackageStore.js';
import {
  ACT_MODULE_LABEL,
  PLAN_WORK_PACKAGE_STATUS_LABEL,
  type PlanWorkPackage,
} from '../../v3/plan/work-packages/planWorkPackage.js';
import css from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  projectId: string;
}

function statusPillClass(status: PlanWorkPackage['status']): string {
  switch (status) {
    case 'queued':
      return `${css.pill} ${css.pillPlanned}`;
    case 'in-progress':
      return `${css.pill} ${css.pillRunning}`;
    case 'done':
      return `${css.pill} ${css.pillSuccess}`;
    default:
      return css.pill ?? '';
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className={css.statRow}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PackageRow({
  projectId,
  pkg,
}: {
  projectId: string;
  pkg: PlanWorkPackage;
}) {
  const setStatus = usePlanWorkPackageStore((s) => s.setStatus);

  return (
    <li className={css.section}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <h4 className={css.sectionTitle} style={{ margin: 0 }}>
          {pkg.objective.trim() || 'Untitled work package'}
        </h4>
        <span className={statusPillClass(pkg.status)}>
          {PLAN_WORK_PACKAGE_STATUS_LABEL[pkg.status]}
        </span>
      </div>

      <div>
        <Detail label="Team" value={ACT_MODULE_LABEL[pkg.teamType]} />
        <Detail label="Detail" value={pkg.detail} />
        <Detail label="Location" value={pkg.location} />
        <Detail label="Tools / materials" value={pkg.tools} />
        <Detail label="Evidence required" value={pkg.evidenceRequired} />
        <Detail label="Completion criteria" value={pkg.completionCriteria} />
      </div>

      <div className={css.btnRow}>
        {pkg.status === 'queued' ? (
          <button
            type="button"
            className={css.btn}
            onClick={() => setStatus(projectId, pkg.id, 'in-progress')}
          >
            Start
          </button>
        ) : null}
        {pkg.status === 'in-progress' ? (
          <button
            type="button"
            className={css.btn}
            onClick={() => setStatus(projectId, pkg.id, 'done')}
          >
            Mark done
          </button>
        ) : null}
        {pkg.decisionId ? (
          <Link
            to="/v3/project/$projectId/plan/decisions"
            params={{ projectId }}
            className={css.removeBtn}
          >
            Source decision →
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export default function IncomingWorkPackagesCard({ projectId }: Props) {
  const packages = usePlanWorkPackages(projectId);
  const active = packages.filter(
    (p) => p.status === 'queued' || p.status === 'in-progress',
  );
  const completed = packages.filter((p) => p.status === 'done');

  return (
    <div className={css.page}>
      <div className={css.hero} data-stage="act">
        <span className={css.heroTag}>Act · Plan→Act handoff</span>
        <h2 className={css.title}>Incoming work packages</h2>
        <p className={css.lede}>
          Field work dispatched from accepted Plan decisions. Start a package
          when the team picks it up, mark it done when the work is complete.
        </p>
      </div>

      {active.length === 0 ? (
        <p className={css.empty}>
          No incoming work packages — accepted Plan decisions appear here once
          dispatched.
        </p>
      ) : (
        <ul className={css.list}>
          {active.map((pkg) => (
            <PackageRow key={pkg.id} projectId={projectId} pkg={pkg} />
          ))}
        </ul>
      )}

      {completed.length > 0 ? (
        <details style={{ marginTop: 16 }}>
          <summary className={css.sectionTitle} style={{ cursor: 'pointer' }}>
            Recently completed ({completed.length})
          </summary>
          <ul className={css.list} style={{ marginTop: 12 }}>
            {completed.map((pkg) => (
              <PackageRow key={pkg.id} projectId={projectId} pkg={pkg} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
