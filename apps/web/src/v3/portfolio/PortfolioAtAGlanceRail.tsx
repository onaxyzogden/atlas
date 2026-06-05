// PortfolioAtAGlanceRail.tsx
//
// Portfolio Home right rail (OLOS Portfolio Home Spec §2.4). A strictly
// READ-ONLY briefing for the selected project: header (name + type badges +
// area), stage & stratum with an overall Plan progress bar, last activity, an
// Observe snapshot (tap a chip to open that domain), alerts (reusing the shared
// urgency chips so copy matches Portfolio cards), and a relationships stub
// (lit up in P5). No edits to project data happen here — the only affordances
// are navigation into the selected project's stages/domains.

import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  Layers,
  Link2,
  Minus,
  RefreshCw,
  X,
} from 'lucide-react';
import type { ObserveStatusOutput, CrossRelationship } from '@ogden/shared';
import { hasCapability } from '@ogden/shared';
import { buildUrgencyChips } from '../home/urgencyChips.js';
import { useCrossRelationshipStore } from '../../store/crossRelationshipStore.js';
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
import type { PortfolioBriefing, BriefingStage } from './usePortfolioBriefing.js';
import css from './PortfolioAtAGlanceRail.module.css';

const STAGE_LABEL: Record<BriefingStage, string> = {
  setup: 'Setup',
  plan: 'Plan',
  act: 'Act',
  observe: 'Observe',
  archived: 'Archived',
};

type RelType = CrossRelationship['relationshipType'];

const REL_TYPE_LABEL: Record<RelType, string> = {
  shared_watershed: 'Shared watershed',
  adjacent_boundary: 'Adjacent boundary',
  habitat_corridor: 'Habitat corridor',
  same_management_unit: 'Same management unit',
  shared_infrastructure: 'Shared infrastructure',
};

// DOM parity with the map line colours (REL_COLORS) and the --rel-* tokens.
const REL_TYPE_TOKEN: Record<RelType, string> = {
  shared_watershed: 'var(--rel-shared-watershed)',
  adjacent_boundary: 'var(--rel-adjacent-boundary)',
  habitat_corridor: 'var(--rel-habitat-corridor)',
  same_management_unit: 'var(--rel-same-management-unit)',
  shared_infrastructure: 'var(--rel-shared-infrastructure)',
};

const STATUS_LABEL: Record<ObserveStatusOutput, string> = {
  clear: 'Clear',
  unknown: 'Unknown',
  needs_investigation: 'Investigate',
  major_constraint: 'Constraint',
  potential_disqualifier: 'Disqualifier',
};

const STATUS_TONE: Record<ObserveStatusOutput, 'pos' | 'muted' | 'warn' | 'neg'> =
  {
    clear: 'pos',
    unknown: 'muted',
    needs_investigation: 'warn',
    major_constraint: 'neg',
    potential_disqualifier: 'neg',
  };

export interface PortfolioAtAGlanceRailProps {
  briefing: PortfolioBriefing | null;
}

export default function PortfolioAtAGlanceRail({
  briefing,
}: PortfolioAtAGlanceRailProps) {
  const navigate = useNavigate();
  // Hooks must run before the early return; derive per-project values below.
  const relationshipsByProject = useCrossRelationshipStore((s) => s.byProject);
  const deleteRelationship = useCrossRelationshipStore((s) => s.deleteRelationship);
  const roleMap = useMyProjectRoles();

  if (!briefing) {
    return (
      <div className={css.empty}>
        <p className={css.emptyHint}>Select a project to see its briefing.</p>
      </div>
    );
  }

  const { project, plan, observe, lastActivity, urgency } = briefing;
  const chips = buildUrgencyChips(urgency);
  // Relationships are server-synced and stored keyed by SERVER project id (the
  // id the map fetched with). Local-only projects (no serverId) can't hold
  // cross-project links, so they correctly show none.
  const projectServerId = project.serverId ?? null;
  const relationships = projectServerId
    ? (relationshipsByProject[projectServerId] ?? [])
    : [];
  // Roles are keyed by SERVER project id; local-only projects (no serverId)
  // are absent from the map and are owned by the steward. Owner-tier =
  // manage_members capability (owner / primary_steward).
  const scopedRole = project.serverId ? roleMap.get(project.serverId) : undefined;
  const isOwner = scopedRole == null || hasCapability(scopedRole, 'manage_members');
  const progressPct =
    plan.objectivesTotal > 0
      ? Math.round((plan.objectivesComplete / plan.objectivesTotal) * 100)
      : 0;

  const openDomain = (domainId: string) => {
    navigate({
      to: '/v3/project/$projectId/observe/dashboard/domain/$domainId',
      params: { projectId: project.id, domainId },
    } as never);
  };

  const openChipTarget = (key: string) => {
    // Foundation-domain staleness and review cadence are Observe concerns;
    // divergences, blocked work, verifications and inactivity are Act concerns.
    const toObserve =
      key === 'cyclicalReviewsDue' ||
      key === 'staleFoundationDomains' ||
      key === 'ageingFoundationDomains';
    if (toObserve) {
      navigate({
        to: '/v3/project/$projectId/observe/dashboard',
        params: { projectId: project.id },
      } as never);
      return;
    }
    navigate({
      to: '/v3/project/$projectId/act/field-action',
      params: { projectId: project.id },
    } as never);
  };

  return (
    <div className={css.rail} aria-label="Project briefing">
      {/* ---- Header -------------------------------------------------------- */}
      <header className={css.header}>
        <h2 className={css.name}>{project.name}</h2>
        <div className={css.badges}>
          {briefing.primaryType ? (
            <span className={`${css.typeBadge} ${css.typePrimary}`}>
              {briefing.primaryType.label}
            </span>
          ) : null}
          {briefing.secondaryTypes.map((t) => (
            <span
              key={t.id}
              className={`${css.typeBadge} ${css.typeSecondary}`}
            >
              {t.label}
            </span>
          ))}
        </div>
        <p className={css.area}>{briefing.areaLabel}</p>
      </header>

      <div className={css.scroll}>
        {/* ---- Stage & stratum -------------------------------------------- */}
        <section className={css.section}>
          <div className={css.sectionHead}>
            <Layers size={13} aria-hidden />
            <span className={css.sectionLabel}>Stage &amp; stratum</span>
          </div>
          <div className={css.stageRow}>
            <span className={`${css.stagePill} ${css[`stage-${briefing.stage}`]}`}>
              {STAGE_LABEL[briefing.stage]}
            </span>
            {plan.activeStratum ? (
              <span className={css.stratumLabel}>
                Stratum {plan.activeStratum.ordinal} — {plan.activeStratum.title}
                {plan.gated ? (
                  <span className={css.gatedTag}> · gated</span>
                ) : null}
              </span>
            ) : plan.allComplete ? (
              <span className={css.stratumLabel}>All strata complete</span>
            ) : (
              <span className={css.stratumMuted}>Plan not started</span>
            )}
          </div>
          <div
            className={css.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            aria-label="Plan objectives complete"
          >
            <div
              className={css.progressFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className={css.progressCaption}>
            {plan.objectivesComplete}/{plan.objectivesTotal} objectives complete
          </p>
        </section>

        {/* ---- Last activity ---------------------------------------------- */}
        {lastActivity ? (
          <section className={css.section}>
            <div className={css.sectionHead}>
              <Clock size={13} aria-hidden />
              <span className={css.sectionLabel}>Last activity</span>
            </div>
            <p className={css.activityLine}>
              <span className={css.activityStage}>{lastActivity.stage}</span>
              <span className={css.activityDot}>·</span>
              <span className={css.activityWhen}>{lastActivity.relative}</span>
            </p>
            <p className={css.activityDesc}>{lastActivity.description}</p>
          </section>
        ) : null}

        {/* ---- Observe snapshot ------------------------------------------- */}
        {observe.recentPoints.length > 0 ? (
          <section className={css.section}>
            <div className={css.sectionHead}>
              <RefreshCw size={13} aria-hidden />
              <span className={css.sectionLabel}>Observe snapshot</span>
              <span className={css.sectionMeta}>{observe.cycleLabel}</span>
            </div>
            <ul className={css.metricList}>
              {observe.recentPoints.map((pt) => (
                <li key={pt.domainId}>
                  <button
                    type="button"
                    className={css.metricChip}
                    onClick={() => openDomain(pt.domainId)}
                  >
                    <span className={css.metricDomain}>{pt.domainLabel}</span>
                    <span
                      className={`${css.metricStatus} ${css[`tone-${STATUS_TONE[pt.statusOutput]}`]}`}
                    >
                      {STATUS_LABEL[pt.statusOutput]}
                      {pt.trend === 'up' ? (
                        <ArrowUp size={12} aria-label="improving" />
                      ) : pt.trend === 'down' ? (
                        <ArrowDown size={12} aria-label="worsening" />
                      ) : (
                        <Minus size={12} aria-label="unchanged" />
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---- Alerts ----------------------------------------------------- */}
        <section className={css.section}>
          <div className={css.sectionHead}>
            <AlertTriangle size={13} aria-hidden />
            <span className={css.sectionLabel}>Alerts</span>
            {chips.length > 0 ? (
              <span className={css.sectionMeta}>{chips.length}</span>
            ) : null}
          </div>
          {chips.length === 0 ? (
            <p className={css.clearLine}>No urgent signals. Land is steady.</p>
          ) : (
            <ul className={css.alertList}>
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    className={`${css.alertChip} ${css[`alert-${chip.tone}`]}`}
                    onClick={() => openChipTarget(chip.key)}
                  >
                    {chip.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Relationships (§5) ----------------------------------------- */}
        <section className={css.section}>
          <div className={css.sectionHead}>
            <Link2 size={13} aria-hidden />
            <span className={css.sectionLabel}>Relationships</span>
            {relationships.length > 0 ? (
              <span className={css.sectionMeta}>{relationships.length}</span>
            ) : null}
          </div>
          {relationships.length === 0 ? (
            <p className={css.stubLine}>
              {isOwner
                ? 'No connections yet. Use the + Link tool on the map to connect this project to another.'
                : 'No cross-project connections recorded.'}
            </p>
          ) : (
            <ul className={css.relList}>
              {relationships.map((rel) => (
                <li key={rel.id} className={css.relItem}>
                  <span
                    className={css.relDot}
                    style={{ background: REL_TYPE_TOKEN[rel.relationshipType] }}
                    aria-hidden
                  />
                  <span className={css.relBody}>
                    <span className={css.relType}>
                      {REL_TYPE_LABEL[rel.relationshipType]}
                    </span>
                    <span className={css.relOther}>
                      {rel.otherProjectName ?? 'Other project'}
                    </span>
                    {rel.notes ? (
                      <span className={css.relNotes}>{rel.notes}</span>
                    ) : null}
                  </span>
                  {isOwner ? (
                    <button
                      type="button"
                      className={css.relRemove}
                      onClick={() =>
                        projectServerId &&
                        void deleteRelationship(projectServerId, rel.id)
                      }
                      aria-label={`Remove ${REL_TYPE_LABEL[rel.relationshipType]} relationship`}
                      title="Remove relationship"
                    >
                      <X size={13} aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
