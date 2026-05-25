/**
 * PlanSynthesisPage — the Plan-Operation roll-up + advisory approval surface
 * (Plan-Operation Phase 5c). A read-mostly synthesis of the whole living-plan
 * state for one project: open reviews, decision/work-package/conflict counts,
 * and the active plan version, each linking to its own surface.
 *
 * Approval here is an ADVISORY status stamp (steward-sovereign), exactly like
 * the Fit Gate verdict: approving captures a fresh snapshot (or approves an
 * existing draft), stamps a `PlanVersion` draft→approved with who/when/note,
 * and is reversible (Reopen → draft). It NEVER locks or gates any other
 * surface — no decision, work package, or module is frozen by an approval.
 *
 * Strictly operational — no riba/gharar/CSRA/salam/financing semantics.
 */

import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { usePlanImpactFlagCounts } from '../impact/usePlanImpactFlags.js';
import { usePlanDecisionCounts } from '../decisions/usePlanDecisions.js';
import { usePlanWorkPackageCounts } from '../work-packages/usePlanWorkPackages.js';
import { usePlanConflictCounts } from '../conflicts/usePlanConflicts.js';
import {
  usePlanVersions,
  usePlanVersionCounts,
  useActivePlanVersion,
} from '../versions/usePlanVersions.js';
import { usePlanVersionStore } from '../../../store/planVersionStore.js';
import { capturePlanSnapshot } from '../versions/planSnapshot.js';
import { emptyPlanVersion } from '../versions/planVersion.js';
import { PLAN_VERSION_STATUS_LABEL } from '../versions/planVersion.js';
import css from './PlanSynthesisPage.module.css';

/** Advisory approver label — no auth coupling; a steward-sovereign stamp. */
const STEWARD = 'Steward';

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

export default function PlanSynthesisPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';

  const impact = usePlanImpactFlagCounts(projectId);
  const decisions = usePlanDecisionCounts(projectId);
  const packages = usePlanWorkPackageCounts(projectId);
  const conflicts = usePlanConflictCounts(projectId);
  const versionCounts = usePlanVersionCounts(projectId);
  const versions = usePlanVersions(projectId);
  const activeVersion = useActivePlanVersion(projectId);

  const create = usePlanVersionStore((s) => s.create);
  const update = usePlanVersionStore((s) => s.update);
  const setStatus = usePlanVersionStore((s) => s.setStatus);

  const [note, setNote] = useState('');

  const isApproved = activeVersion?.status === 'approved';

  const onApprove = () => {
    // Prefer approving an existing draft; otherwise capture a fresh snapshot.
    const draft = versions.find((v) => v.status === 'draft');
    if (draft) {
      if (note.trim()) update(projectId, draft.id, { note: note.trim() });
      setStatus(projectId, draft.id, 'approved', STEWARD);
    } else {
      const v = emptyPlanVersion(
        projectId,
        capturePlanSnapshot(projectId),
        'Approved plan',
      );
      if (note.trim()) v.note = note.trim();
      create(projectId, v);
      setStatus(projectId, v.id, 'approved', STEWARD);
    }
    setNote('');
  };

  const onReopen = () => {
    if (activeVersion && activeVersion.status === 'approved') {
      setStatus(projectId, activeVersion.id, 'draft');
    }
  };

  // Readiness tiles — each links to the surface it summarises. `flag` marks a
  // tile that still needs steward attention (>0 open / pending items). `to`
  // carries the full literal route path so the typed router accepts it.
  type TileTo =
    | '/v3/project/$projectId/plan/review'
    | '/v3/project/$projectId/plan/conflicts'
    | '/v3/project/$projectId/plan/decisions'
    | '/v3/project/$projectId/plan/work-packages'
    | '/v3/project/$projectId/plan/versions';
  const tiles: {
    label: string;
    value: number;
    to: TileTo;
    flag?: boolean;
  }[] = [
    {
      label: 'Open reviews',
      value: impact.open,
      to: '/v3/project/$projectId/plan/review',
      flag: impact.open > 0,
    },
    {
      label: 'Open conflicts',
      value: conflicts.open,
      to: '/v3/project/$projectId/plan/conflicts',
      flag: conflicts.open > 0,
    },
    {
      label: 'Draft decisions',
      value: decisions.draft,
      to: '/v3/project/$projectId/plan/decisions',
      flag: decisions.draft > 0,
    },
    {
      label: 'Accepted decisions',
      value: decisions.accepted,
      to: '/v3/project/$projectId/plan/decisions',
    },
    {
      label: 'Draft packages',
      value: packages.draft,
      to: '/v3/project/$projectId/plan/work-packages',
      flag: packages.draft > 0,
    },
    {
      label: 'Queued packages',
      value: packages.queued,
      to: '/v3/project/$projectId/plan/work-packages',
    },
    {
      label: 'Plan versions',
      value: versionCounts.total,
      to: '/v3/project/$projectId/plan/versions',
    },
  ];

  const openItemTotal =
    impact.open + conflicts.open + decisions.draft + packages.draft;

  const approvedStamp = formatStamp(activeVersion?.approvedAt);
  const capturedStamp = formatStamp(activeVersion?.snapshot?.capturedAt);

  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>Plan</span>
        <h1 className={css.title}>Plan Synthesis</h1>
        <p className={css.lede}>
          The whole Plan-Operation state at a glance — reviews, decisions, work
          packages, conflicts, and the active plan version — with an advisory
          approval. Approval is a steward stamp; it never locks any surface.
        </p>
      </header>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>Readiness summary</h2>
        <ul className={css.tiles}>
          {tiles.map((t) => (
            <li key={t.label}>
              <Link
                to={t.to}
                params={{ projectId }}
                className={css.tile}
                data-flag={t.flag ? 'true' : 'false'}
              >
                <span className={css.tileNum}>{t.value}</span>
                <span className={css.tileLabel}>{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>Open items</h2>
        {openItemTotal === 0 ? (
          <p className={css.clear}>
            Nothing pending — no open reviews or conflicts, and no draft
            decisions or packages awaiting a steward.
          </p>
        ) : (
          <ul className={css.openList}>
            {impact.open > 0 ? (
              <li>
                <Link
                  to="/v3/project/$projectId/plan/review"
                  params={{ projectId }}
                  className={css.openLink}
                >
                  {impact.open} observation review{impact.open === 1 ? '' : 's'}{' '}
                  to triage
                </Link>
              </li>
            ) : null}
            {conflicts.open > 0 ? (
              <li>
                <Link
                  to="/v3/project/$projectId/plan/conflicts"
                  params={{ projectId }}
                  className={css.openLink}
                >
                  {conflicts.open} conflict{conflicts.open === 1 ? '' : 's'} to
                  resolve
                </Link>
              </li>
            ) : null}
            {decisions.draft > 0 ? (
              <li>
                <Link
                  to="/v3/project/$projectId/plan/decisions"
                  params={{ projectId }}
                  className={css.openLink}
                >
                  {decisions.draft} draft decision
                  {decisions.draft === 1 ? '' : 's'} to settle
                </Link>
              </li>
            ) : null}
            {packages.draft > 0 ? (
              <li>
                <Link
                  to="/v3/project/$projectId/plan/work-packages"
                  params={{ projectId }}
                  className={css.openLink}
                >
                  {packages.draft} draft work package
                  {packages.draft === 1 ? '' : 's'} to dispatch
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>Active version</h2>
        {activeVersion ? (
          <div className={css.versionCard} data-status={activeVersion.status}>
            <div className={css.versionHead}>
              <h3 className={css.versionTitle}>{activeVersion.label}</h3>
              <span
                className={css.statusBadge}
                data-status={activeVersion.status}
              >
                {PLAN_VERSION_STATUS_LABEL[activeVersion.status]}
              </span>
            </div>
            <div className={css.versionMeta}>
              {capturedStamp ? <span>Captured {capturedStamp}</span> : null}
              {isApproved && approvedStamp ? (
                <span className={css.approvedBy}>
                  Approved
                  {activeVersion.approvedBy
                    ? ` by ${activeVersion.approvedBy}`
                    : ''}{' '}
                  {approvedStamp}
                </span>
              ) : null}
            </div>
            <Link
              to="/v3/project/$projectId/plan/versions"
              params={{ projectId }}
              className={css.versionLink}
            >
              View all versions →
            </Link>
          </div>
        ) : (
          <p className={css.clear}>
            No plan version captured yet. Approving below captures the current
            plan as the first version.
          </p>
        )}
      </section>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>Approval</h2>
        <div className={css.approveBlock}>
          {isApproved ? (
            <p className={css.approvedLine}>
              Current plan approved
              {activeVersion?.approvedBy
                ? ` by ${activeVersion.approvedBy}`
                : ''}
              {approvedStamp ? ` on ${approvedStamp}` : ''}. This is advisory —
              no surface is locked.
            </p>
          ) : (
            <p className={css.pendingLine}>
              The current plan is not approved. Approval is an advisory stamp; it
              captures a snapshot and records who signed off, without freezing
              any decision, package, or module.
            </p>
          )}
          <textarea
            className={css.noteInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Approval note (optional)…"
            rows={2}
          />
          <div className={css.approveActions}>
            <button
              type="button"
              className={css.approveBtn}
              onClick={onApprove}
            >
              {isApproved ? 'Re-approve current plan' : 'Approve current plan'}
            </button>
            {isApproved ? (
              <button
                type="button"
                className={css.reopenBtn}
                onClick={onReopen}
              >
                Reopen
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
